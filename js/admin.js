// Suivi des réponses : accessible uniquement avec le lien privé (la clé est dans le #fragment, jamais envoyée au serveur).
(function(){
  'use strict';
  var FP = window.FP, p = FP.params(), rows = [], cfg = null;
  var $ = function(id){ return document.getElementById(id); };
  // Anti-clickjacking (GitHub Pages ne permet pas d'envoyer X-Frame-Options / frame-ancestors).
  if(window.top !== window.self){ document.body.textContent = ''; return; }

  function state(msg){ $('state').textContent = msg; $('state').hidden = !msg; }
  if(!p.slug || !p.key){ state('Lien privé incomplet. Utilisez le lien de suivi complet que vous avez reçu à la publication.'); return; }

  // Les réponses viennent d'inconnus : on ne fait jamais confiance à leur forme, même si le serveur les filtre aussi.
  function guests(d){ var n = Number(d && d.guests); return isFinite(n) && n >= 1 && n <= 20 ? Math.floor(n) : 1; }
  function txt(v){ return typeof v === 'string' ? v : (v == null ? '' : String(v)); }
  function yn(v){ return v === 'yes' ? 'Oui' : v === 'no' ? 'Non' : ''; }
  function pl(n, one, many){ return n > 1 ? many : one; } // en français : 0 et 1 au singulier
  function fmt(iso){
    var d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  function norm(s){ return txt(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }

  // Doublons : un invité qui répond deux fois (même navigateur, ou même nom) ; seule la dernière réponse compte.
  function markDuplicates(){
    var seen = {};
    rows.forEach(function(r){ r.superseded = false; });
    for(var i = rows.length - 1; i >= 0; i--){
      var d = rows[i].data, keys = [];
      if(/^[a-z0-9]{12,32}$/.test(txt(d.rid))) keys.push('r:' + d.rid);
      if(norm(d.name)) keys.push('n:' + norm(d.name));
      if(keys.some(function(k){ return seen[k]; })) rows[i].superseded = true;
      keys.forEach(function(k){ seen[k] = true; });
    }
  }

  // Colonnes affichées : les questions posées dans le faire-part, plus toute colonne qui contient des données.
  function asked(col){
    if(cfg && cfg.rsvp[col]) return true;
    return rows.some(function(r){ var v = r.data[col]; return col === 'guests' ? r.data.attendance === 'yes' && guests(r.data) > 1 : !!txt(v); });
  }

  function tile(n, label, sub){
    var d = document.createElement('div'); d.className = 'tile';
    var a = document.createElement('div'); a.className = 'n'; a.textContent = n;
    var b = document.createElement('div'); b.className = 'l'; b.textContent = label + (sub ? ' ' + sub : '');
    d.appendChild(a); d.appendChild(b); return d;
  }

  function render(){
    markDuplicates();
    var live = rows.filter(function(r){ return !r.superseded; });
    var yes = live.filter(function(r){ return r.data.attendance === 'yes'; });
    var no = live.filter(function(r){ return r.data.attendance === 'no'; });
    var people = yes.reduce(function(s, r){ return s + guests(r.data); }, 0);
    var cols = { guests: asked('guests'), brunch: asked('brunch'), diet: asked('diet'), message: asked('message') };

    var t = $('tiles'); t.innerHTML = '';
    t.appendChild(tile(live.length, pl(live.length, 'réponse', 'réponses')));
    t.appendChild(tile(cols.guests ? people : yes.length, pl(cols.guests ? people : yes.length, 'personne présente', 'personnes présentes'),
      cols.guests ? '(' + yes.length + ' ' + pl(yes.length, 'réponse', 'réponses') + ')' : ''));
    t.appendChild(tile(no.length, pl(no.length, 'ne viendra pas', 'ne viendront pas')));
    if(cols.brunch){
      var br = yes.filter(function(r){ return r.data.brunch === 'yes'; }).reduce(function(s, r){ return s + guests(r.data); }, 0);
      t.appendChild(tile(br, 'au brunch'));
    }
    var dups = rows.length - live.length;
    $('dup-note').hidden = !dups;
    $('dup-note').textContent = dups ? dups + ' ' + pl(dups, 'réponse a été remplacée', 'réponses ont été remplacées') +
      ' par une réponse plus récente de la même personne (grisée' + (dups > 1 ? 's' : '') + ' dans le tableau, non comptée' + (dups > 1 ? 's' : '') + ').' : '';

    document.querySelectorAll('th[data-col]').forEach(function(th){ th.hidden = !cols[th.getAttribute('data-col')]; });
    var tb = $('table').querySelector('tbody'); tb.innerHTML = '';
    rows.slice().reverse().forEach(function(r){
      var tr = document.createElement('tr'), d = r.data;
      if(r.superseded) tr.className = 'superseded';
      function cell(v, col){ var td = document.createElement('td'); td.textContent = v; if(col && !cols[col]) td.hidden = true; tr.appendChild(td); return td; }
      cell(fmt(r.created_at));
      var nameTd = cell(txt(d.name));
      if(r.superseded){ var s = document.createElement('span'); s.className = 'badge'; s.textContent = 'remplacée'; nameTd.appendChild(s); }
      cell(yn(d.attendance)); cell(d.attendance === 'yes' ? String(guests(d)) : '', 'guests');
      cell(d.attendance === 'yes' ? yn(d.brunch) : '', 'brunch'); cell(txt(d.diet), 'diet'); cell(txt(d.message), 'message');
      var act = cell('');
      var del = document.createElement('button'); del.type = 'button'; del.className = 'link-btn'; del.textContent = 'Supprimer';
      del.setAttribute('aria-label', 'Supprimer la réponse de ' + txt(d.name));
      del.addEventListener('click', function(){ askDelete(del, r); });
      act.appendChild(del);
      tb.appendChild(tr);
    });
    $('empty').hidden = rows.length > 0;
    $('table-wrap').hidden = rows.length === 0;
    $('csv').disabled = rows.length === 0;
  }

  // Suppression en deux temps (pas de boîte de dialogue bloquante) : 1er clic = « Confirmer ? », 2e clic = suppression.
  function askDelete(btn, r){
    if(!btn.classList.contains('confirm')){
      btn.classList.add('confirm'); btn.textContent = 'Confirmer ?';
      setTimeout(function(){ if(btn.isConnected){ btn.classList.remove('confirm'); btn.textContent = 'Supprimer'; } }, 4000);
      return;
    }
    btn.disabled = true;
    FP.api.deleteRsvp(p.slug, p.key, r.id).then(function(){
      rows = rows.filter(function(x){ return x.id !== r.id; });
      $('action-msg').textContent = ''; render();
    }).catch(function(e){ btn.disabled = false; $('action-msg').textContent = FP.userError(e); });
  }

  function csvCell(v){
    v = txt(v);
    if(/^[=+\-@\t\r]/.test(v)) v = "'" + v; // évite l'interprétation en formule dans Excel
    return '"' + v.replace(/"/g, '""') + '"';
  }
  function exportCsv(){
    var head = ['Reçu le', 'Nom', 'Présence', 'Personnes', 'Brunch', 'Régime', 'Message', 'Remplacée'];
    var lines = [head.map(csvCell).join(';')].concat(rows.map(function(r){
      var d = r.data;
      return [fmt(r.created_at), d.name, yn(d.attendance), d.attendance === 'yes' ? guests(d) : '', d.attendance === 'yes' ? yn(d.brunch) : '',
              d.diet, d.message, r.superseded ? 'Oui' : ''].map(csvCell).join(';');
    }));
    var url = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    var a = document.createElement('a'); a.href = url; a.download = 'reponses-' + p.slug + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  }

  function load(){
    state('Chargement…'); $('action-msg').textContent = '';
    Promise.all([FP.api.listRsvps(p.slug, p.key), FP.api.getInvitation(p.slug).catch(function(){ return null; })]).then(function(res){
      rows = (Array.isArray(res[0]) ? res[0] : []).filter(function(r){ return r && r.data && typeof r.data === 'object'; });
      if(res[1]){
        cfg = FP.sanitizeConfig(res[1]);
        $('admin-title').textContent = 'Réponses — ' + cfg.partner1 + ' & ' + cfg.partner2;
        document.title = 'Suivi des réponses — ' + cfg.partner1 + ' & ' + cfg.partner2;
      }
      state(''); $('content').hidden = false; render();
    }).catch(function(e){
      $('content').hidden = true;
      state(e && e.forbidden ? 'Accès refusé : le lien privé est incorrect.' : FP.userError(e));
    });
  }

  var pub = new URL('invitation.html', location.href); pub.search = '?f=' + encodeURIComponent(p.slug);
  $('open-public').href = pub.href;
  var ed = new URL('index.html', location.href); ed.search = '?f=' + encodeURIComponent(p.slug); ed.hash = 'k=' + encodeURIComponent(p.key);
  $('edit-link').href = ed.href;
  $('csv').addEventListener('click', exportCsv);
  $('refresh').addEventListener('click', load);
  load();
})();

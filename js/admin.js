// Suivi des réponses : accessible uniquement avec le lien privé (la clé est dans le #fragment, jamais envoyée au serveur).
(function(){
  'use strict';
  var FP = window.FP, p = FP.params(), rows = [], cfg = null;
  var view = { filter: 'all', q: '', sort: 'date', dir: -1 };
  var $ = function(id){ return document.getElementById(id); };
  // Anti-clickjacking (GitHub Pages ne permet pas d'envoyer X-Frame-Options / frame-ancestors).
  if(window.top !== window.self){ document.body.textContent = ''; return; }

  function state(msg){ $('state').textContent = msg; $('state').hidden = !msg; }
  if(!p.slug || !p.key){ state('Lien privé incomplet. Utilisez le lien de suivi complet que vous avez reçu à la publication.'); return; }

  // Les réponses viennent d'inconnus : on ne fait jamais confiance à leur forme, même si le serveur les filtre aussi.
  function txt(v){ return typeof v === 'string' ? v : (v == null ? '' : String(v)); }
  function int(v, min, max, def){ var n = Number(v); return isFinite(n) && n >= min && n <= max ? Math.floor(n) : def; }
  function adults(d){ return d.attendance === 'yes' ? int(d.guests, 1, 20, 1) : 0; }
  function kids(d){ return d.attendance === 'yes' ? int(d.children, 0, 20, 0) : 0; }
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

  // Colonnes : affichées si la question est posée dans le faire-part, ou si des réponses contiennent la donnée.
  function has(fn){ return rows.some(function(r){ return !!fn(r.data); }); }
  function columns(){
    var q = cfg ? cfg.rsvp : {};
    var C = [
      { id: 'name', label: 'Nom', sticky: true, sort: function(r){ return norm(r.data.name); }, get: function(r){ return txt(r.data.name); } },
      { id: 'att', label: 'Présence', sort: function(r){ return r.data.attendance === 'yes' ? 0 : 1; }, get: function(r){ return yn(r.data.attendance); } },
      { id: 'guests', label: q.children ? 'Adultes' : 'Pers.', show: q.guests || has(function(d){ return adults(d) > 1; }),
        sort: function(r){ return adults(r.data); }, get: function(r){ return r.data.attendance === 'yes' ? String(adults(r.data)) : ''; } },
      { id: 'children', label: 'Enfants', show: q.children || has(function(d){ return kids(d) > 0; }),
        sort: function(r){ return kids(r.data); }, get: function(r){ return r.data.attendance === 'yes' ? String(kids(r.data)) : ''; } },
      { id: 'companions', label: 'Accompagnants', wide: true, show: q.companions || has(function(d){ return txt(d.companions); }), get: function(r){ return txt(r.data.companions); } },
      { id: 'brunch', label: 'Brunch', show: q.brunch || has(function(d){ return d.brunch; }), get: function(r){ return r.data.attendance === 'yes' ? yn(r.data.brunch) : ''; } },
      { id: 'diet', label: 'Régime', wide: true, show: q.diet || has(function(d){ return txt(d.diet); }), get: function(r){ return txt(r.data.diet); } },
      { id: 'email', label: 'Email', show: q.email || has(function(d){ return txt(d.email); }), get: function(r){ return txt(r.data.email); } },
      { id: 'phone', label: 'Téléphone', show: q.phone || has(function(d){ return txt(d.phone); }), get: function(r){ return txt(r.data.phone); } },
      { id: 'address', label: 'Adresse', wide: true, show: q.address || has(function(d){ return txt(d.address); }), get: function(r){ return txt(r.data.address); } },
      { id: 'custom', label: (q.customLabel || 'Question perso.'), wide: true, show: !!q.customLabel || has(function(d){ return txt(d.custom); }), get: function(r){ return txt(r.data.custom); } },
      { id: 'message', label: 'Message', wide: true, show: q.message || has(function(d){ return txt(d.message); }), get: function(r){ return txt(r.data.message); } },
      { id: 'date', label: 'Reçu le', sort: function(r){ return r.created_at || ''; }, get: function(r){ return fmt(r.created_at); } }
    ];
    return C.filter(function(c){ return c.show === undefined || c.show; });
  }

  function tile(n, label, sub){
    var d = document.createElement('div'); d.className = 'tile';
    var a = document.createElement('div'); a.className = 'n'; a.textContent = n;
    var b = document.createElement('div'); b.className = 'l'; b.textContent = label + (sub ? ' ' + sub : '');
    d.appendChild(a); d.appendChild(b); return d;
  }

  function renderSummary(live, cols){
    var yes = live.filter(function(r){ return r.data.attendance === 'yes'; });
    var no = live.filter(function(r){ return r.data.attendance === 'no'; });
    var nA = yes.reduce(function(s, r){ return s + adults(r.data); }, 0);
    var nK = yes.reduce(function(s, r){ return s + kids(r.data); }, 0);
    var hasCol = function(id){ return cols.some(function(c){ return c.id === id; }); };
    var t = $('tiles'); t.innerHTML = '';
    t.appendChild(tile(live.length, pl(live.length, 'réponse', 'réponses')));
    var present = hasCol('guests') || hasCol('children') ? nA + nK : yes.length;
    t.appendChild(tile(present, pl(present, 'personne présente', 'personnes présentes'),
      hasCol('children') ? '(' + nA + ' ' + pl(nA, 'adulte', 'adultes') + ', ' + nK + ' ' + pl(nK, 'enfant', 'enfants') + ')'
      : hasCol('guests') ? '(' + yes.length + ' ' + pl(yes.length, 'réponse', 'réponses') + ')' : ''));
    t.appendChild(tile(no.length, pl(no.length, 'ne viendra pas', 'ne viendront pas')));
    if(hasCol('brunch')){
      var br = yes.filter(function(r){ return r.data.brunch === 'yes'; }).reduce(function(s, r){ return s + adults(r.data) + kids(r.data); }, 0);
      t.appendChild(tile(br, 'au brunch'));
    }
    // Régimes : la liste à transmettre telle quelle au traiteur.
    var diets = yes.filter(function(r){ return txt(r.data.diet).trim(); });
    var ul = $('diet-list'); ul.innerHTML = '';
    diets.forEach(function(r){
      var li = document.createElement('li'), b = document.createElement('strong');
      b.textContent = txt(r.data.name); li.appendChild(b);
      li.appendChild(document.createTextNode(' : ' + txt(r.data.diet)));
      ul.appendChild(li);
    });
    $('diet-box').hidden = !diets.length;
    var dups = rows.length - live.length;
    $('dup-note').hidden = !dups;
    $('dup-note').textContent = dups ? dups + ' ' + pl(dups, 'réponse a été remplacée', 'réponses ont été remplacées') +
      ' par une réponse plus récente de la même personne (barrée' + (dups > 1 ? 's' : '') + ' dans le tableau, non comptée' + (dups > 1 ? 's' : '') + ').' : '';
    var emails = validEmails(live);
    $('copy-emails').hidden = !emails.length;
    $('copy-emails').textContent = emails.length ? 'Copier les ' + emails.length + ' email' + (emails.length > 1 ? 's' : '') : 'Copier les emails';
  }

  function visibleRows(cols){
    var q = norm(view.q), col = cols.filter(function(c){ return c.id === view.sort; })[0] || cols[0];
    return rows.filter(function(r){
      if(view.filter !== 'all' && r.data.attendance !== view.filter) return false;
      if(!q) return true;
      return [r.data.name, r.data.companions, r.data.email, r.data.phone].some(function(v){ return norm(v).indexOf(q) > -1; });
    }).sort(function(a, b){
      var x = (col.sort || col.get)(a), y = (col.sort || col.get)(b);
      return (x < y ? -1 : x > y ? 1 : 0) * view.dir || (a.id - b.id) * -1;
    });
  }

  function render(){
    markDuplicates();
    var live = rows.filter(function(r){ return !r.superseded; }), cols = columns();
    renderSummary(live, cols);

    var hr = $('thead-row'); hr.innerHTML = '';
    cols.forEach(function(c){
      var th = document.createElement('th'); th.scope = 'col'; th.title = c.label;
      if(c.sticky) th.className = 'sticky';
      if(c.sort){
        var b = document.createElement('button'); b.type = 'button'; b.className = 'sort'; b.textContent = c.label;
        b.addEventListener('click', function(){
          if(view.sort === c.id) view.dir = -view.dir; else { view.sort = c.id; view.dir = c.id === 'date' ? -1 : 1; }
          render();
        });
        th.appendChild(b);
        th.setAttribute('aria-sort', view.sort === c.id ? (view.dir > 0 ? 'ascending' : 'descending') : 'none');
      } else th.textContent = c.label;
      hr.appendChild(th);
    });
    var tha = document.createElement('th'); tha.scope = 'col'; tha.innerHTML = '<span class="sr-only">Actions</span>'; hr.appendChild(tha);

    var list = visibleRows(cols), tb = $('table').querySelector('tbody'); tb.innerHTML = '';
    list.forEach(function(r){
      var tr = document.createElement('tr');
      if(r.superseded) tr.className = 'superseded';
      cols.forEach(function(c){
        var td = document.createElement('td'), v = c.get(r);
        td.setAttribute('data-label', c.label);
        if(c.wide) td.className = 'wide';
        if(c.sticky) td.className = 'sticky';
        if(c.id === 'att'){ var s = document.createElement('span'); s.className = r.data.attendance === 'yes' ? 'pres-yes' : 'pres-no'; s.textContent = v; td.appendChild(s); }
        else td.textContent = v;
        if(c.id === 'name' && r.superseded){ var bd = document.createElement('span'); bd.className = 'badge'; bd.textContent = 'remplacée'; td.appendChild(bd); }
        if(!v) td.setAttribute('data-empty', '');
        tr.appendChild(td);
      });
      var act = document.createElement('td'); act.className = 'act';
      var del = document.createElement('button'); del.type = 'button'; del.className = 'link-btn'; del.textContent = 'Supprimer';
      del.setAttribute('aria-label', 'Supprimer la réponse de ' + txt(r.data.name));
      del.addEventListener('click', function(){ askDelete(del, r); });
      act.appendChild(del); tr.appendChild(act);
      tb.appendChild(tr);
    });
    var filtered = view.filter !== 'all' || view.q;
    $('count').textContent = rows.length ? (filtered ? list.length + ' sur ' + rows.length + ' ' + pl(rows.length, 'réponse affichée', 'réponses affichées') : '') : '';
    $('count').hidden = !filtered || !rows.length;
    $('empty').hidden = rows.length > 0;
    $('no-match').hidden = !rows.length || list.length > 0;
    $('table-wrap').hidden = !list.length;
    $('toolbar').hidden = rows.length === 0;
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
    markDuplicates();
    var cols = columns();
    var head = cols.map(function(c){ return c.label; }).concat(['Remplacée']);
    var lines = [head.map(csvCell).join(';')].concat(rows.map(function(r){
      return cols.map(function(c){ return c.get(r); }).concat([r.superseded ? 'Oui' : '']).map(csvCell).join(';');
    }));
    var url = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    var a = document.createElement('a'); a.href = url; a.download = 'reponses-' + p.slug + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  }
  // Emails des réponses en vigueur, au format valide, sans doublon (prêts à coller dans le champ Cci).
  function validEmails(list){
    var out = [];
    list.forEach(function(r){ var e = txt(r.data.email).trim(); if(FP.EMAIL_RE.test(e) && out.indexOf(e.toLowerCase()) < 0) out.push(e.toLowerCase()); });
    return out;
  }
  function copyEmails(){
    var list = validEmails(rows.filter(function(r){ return !r.superseded; }));
    var text = list.join(', '), msg = $('action-msg');
    var ok = function(){ msg.textContent = list.length + ' ' + pl(list.length, 'adresse copiée', 'adresses copiées') + ' : collez-les dans le champ « Cci » de votre email.'; };
    var fallback = function(){
      msg.textContent = 'Copie automatique impossible, sélectionnez la liste ci-dessous :';
      var ta = document.createElement('textarea'); ta.className = 'copy-box'; ta.readOnly = true; ta.value = text; ta.rows = 3;
      msg.appendChild(ta); ta.focus(); ta.select();
    };
    if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fallback); else fallback();
  }

  function load(){
    state('Chargement…'); $('action-msg').textContent = '';
    Promise.all([FP.api.listRsvps(p.slug, p.key), FP.api.getInvitation(p.slug).catch(function(){ return null; })]).then(function(res){
      rows = (Array.isArray(res[0]) ? res[0] : []).filter(function(r){ return r && r.data && typeof r.data === 'object'; });
      if(res[1]){
        cfg = FP.sanitizeConfig(res[1]);
        $('admin-title').textContent = 'Réponses — ' + cfg.partner1 + ' & ' + cfg.partner2;
        document.title = 'Suivi des réponses — ' + cfg.partner1 + ' & ' + cfg.partner2;
        var dl = FP.parseDate(cfg.rsvp.deadline), wd = FP.formatDate(cfg, false);
        $('admin-sub').textContent = [wd ? 'Mariage le ' + wd : '', dl ? 'réponses attendues avant le ' + FP.longDate(dl) : ''].filter(Boolean).join(' · ');
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
  $('copy-emails').addEventListener('click', copyEmails);
  $('refresh').addEventListener('click', load);
  $('search').addEventListener('input', function(){ view.q = this.value; render(); });
  document.querySelectorAll('[data-filter]').forEach(function(b){
    b.addEventListener('click', function(){
      view.filter = b.getAttribute('data-filter');
      document.querySelectorAll('[data-filter]').forEach(function(x){ x.setAttribute('aria-pressed', String(x === b)); });
      render();
    });
  });
  load();
})();

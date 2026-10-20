// Suivi des réponses : accessible uniquement avec le lien privé (la clé est dans le #fragment, jamais envoyée au serveur).
(function(){
  'use strict';
  var FP = window.FP, p = FP.params(), rows = [];
  var $ = function(id){ return document.getElementById(id); };

  function state(msg){ $('state').textContent = msg; $('state').hidden = !msg; }
  if(!p.slug || !p.key){ state('Lien privé incomplet. Utilisez le lien de suivi complet que vous avez reçu à la publication.'); return; }

  function cell(tr, text){ var td = document.createElement('td'); td.textContent = text; tr.appendChild(td); }
  function fmt(iso){ var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
  function yn(v){ return v === 'yes' ? 'Oui' : v === 'no' ? 'Non' : ''; }

  function render(){
    var yes = rows.filter(function(r){ return r.data.attendance === 'yes'; });
    var no = rows.filter(function(r){ return r.data.attendance === 'no'; });
    var people = yes.reduce(function(s, r){ return s + (r.data.guests || 1); }, 0);
    var brunch = yes.filter(function(r){ return r.data.brunch === 'yes'; }).reduce(function(s, r){ return s + (r.data.guests || 1); }, 0);
    var tiles = [[rows.length, 'réponses'], [people, 'personnes présentes (' + yes.length + ' réponses)'], [no.length, 'absents'], [brunch, 'au brunch']];
    $('tiles').innerHTML = '';
    tiles.forEach(function(t){
      var d = document.createElement('div'); d.className = 'tile';
      var n = document.createElement('div'); n.className = 'n'; n.textContent = t[0];
      var l = document.createElement('div'); l.className = 'l'; l.textContent = t[1];
      d.appendChild(n); d.appendChild(l); $('tiles').appendChild(d);
    });
    var tb = $('table').querySelector('tbody'); tb.innerHTML = '';
    rows.slice().reverse().forEach(function(r){
      var tr = document.createElement('tr'), d = r.data;
      cell(tr, fmt(r.created_at)); cell(tr, d.name || ''); cell(tr, yn(d.attendance));
      cell(tr, d.attendance === 'yes' ? String(d.guests || 1) : ''); cell(tr, yn(d.brunch));
      cell(tr, d.diet || ''); cell(tr, d.message || '');
      tb.appendChild(tr);
    });
    $('empty').hidden = rows.length > 0;
    $('table').hidden = rows.length === 0;
  }

  function csvCell(v){
    v = String(v == null ? '' : v);
    if(/^[=+\-@\t\r]/.test(v)) v = "'" + v; // évite l'interprétation en formule dans Excel
    return '"' + v.replace(/"/g, '""') + '"';
  }
  function exportCsv(){
    var head = ['Reçu le', 'Nom', 'Présence', 'Personnes', 'Brunch', 'Régime', 'Message'];
    var lines = [head.map(csvCell).join(';')].concat(rows.map(function(r){
      var d = r.data;
      return [r.created_at, d.name, yn(d.attendance), d.attendance === 'yes' ? (d.guests || 1) : '', yn(d.brunch), d.diet, d.message].map(csvCell).join(';');
    }));
    var url = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    var a = document.createElement('a'); a.href = url; a.download = 'reponses.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  }

  function load(){
    state('Chargement…');
    FP.api.listRsvps(p.slug, p.key).then(function(list){
      rows = list || []; state(''); $('content').hidden = false; render();
    }).catch(function(e){
      $('content').hidden = true;
      state(e && e.forbidden ? 'Accès refusé : le lien privé est incorrect.' : 'Impossible de charger les réponses pour le moment.');
    });
  }

  var pub = new URL('invitation.html', location.href); pub.search = '?f=' + p.slug;
  $('open-public').href = pub.href;
  var ed = new URL('index.html', location.href); ed.search = '?f=' + p.slug; ed.hash = 'k=' + p.key;
  $('edit-link').href = ed.href;
  $('csv').addEventListener('click', exportCsv);
  $('refresh').addEventListener('click', load);
  load();
})();

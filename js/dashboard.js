// « Mes faire-part » : premier écran du back-office. Liste les faire-part gérés depuis ce navigateur (pas de compte),
// avec un résumé obtenu en UN appel serveur ; chaque carte mène à la vue des réponses.
(function(){
  'use strict';
  var FP = window.FP;
  var $ = function(id){ return document.getElementById(id); };
  if(window.top !== window.self){ document.body.textContent = ''; return; } // anti-clickjacking
  if(new URLSearchParams(location.search).get('f')) return;               // vue d'un faire-part : js/admin.js
  $('dashboard').hidden = false;

  function link(page, slug, key){
    var u = new URL(page, location.href); u.search = '?f=' + encodeURIComponent(slug);
    if(key) u.hash = 'k=' + encodeURIComponent(key);
    return u.href;
  }
  function el(tag, cls, text){ var e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; return e; }
  function today(){ var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function when(dateStr){
    var d = FP.parseDate(dateStr);
    if(!d) return { label: 'Date à venir', days: Infinity };
    var n = Math.round((d - today()) / 86400000);
    var rel = n > 1 ? 'dans ' + n + ' jours' : n === 1 ? 'demain' : n === 0 ? 'aujourd’hui' : 'passé';
    return { label: FP.longDate(d) + ' · ' + rel, days: n };
  }
  function ago(iso){
    var t = Date.parse(iso); if(isNaN(t)) return '';
    var m = Math.max(0, Math.round((Date.now() - t) / 60000));
    if(m < 1) return 'à l’instant';
    if(m < 60) return 'il y a ' + m + ' min';
    var h = Math.round(m / 60); if(h < 24) return 'il y a ' + h + ' h';
    var j = Math.round(h / 24); return 'il y a ' + j + ' jour' + (j > 1 ? 's' : '');
  }
  var THEMES = FP.PALETTES.map(function(x){ return x.id; });

  // Retrait de la liste en deux temps (pas de boîte de dialogue) : ça ne supprime PAS le faire-part.
  function removeBtn(item){
    var b = el('button', 'link-btn', 'Retirer de la liste'); b.type = 'button';
    b.addEventListener('click', function(){
      if(!b.classList.contains('confirm')){
        b.classList.add('confirm'); b.textContent = 'Confirmer le retrait ?';
        b.title = 'Le faire-part et ses réponses ne sont pas supprimés : seul ce raccourci disparaît de ce navigateur.';
        setTimeout(function(){ if(b.isConnected){ b.classList.remove('confirm'); b.textContent = 'Retirer de la liste'; } }, 4000);
        return;
      }
      FP.mine.remove(item.slug); load();
    });
    return b;
  }

  function card(item, s){
    var c = el('article', 'fp-card');
    if(!s || s.invalid){
      c.classList.add('invalid');
      c.appendChild(el('h2', null, item.slug));
      c.appendChild(el('p', 'muted', 'Lien privé invalide ou faire-part supprimé.'));
      var a0 = el('div', 'card-actions'); a0.appendChild(removeBtn(item)); c.appendChild(a0);
      return c;
    }
    var sw = el('span', 'card-sw acc-' + (THEMES.indexOf(s.theme) > -1 ? s.theme : 'sauge')); sw.setAttribute('aria-hidden', 'true');
    c.appendChild(sw);
    var names = [s.partner1, s.partner2].map(function(x){ return typeof x === 'string' ? x.slice(0, 40) : ''; }).filter(Boolean);
    c.appendChild(el('h2', null, names.length ? names.join(' & ') : 'Faire-part sans nom'));
    c.appendChild(el('p', 'muted card-date', when(s.date).label));
    var stat = el('p', 'card-stat');
    if(typeof s.responses === 'number'){
      if(s.responses){
        var strong = el('strong', null, String(s.responses)); stat.appendChild(strong);
        stat.appendChild(document.createTextNode(' réponse' + (s.responses > 1 ? 's' : '') + ' reçue' + (s.responses > 1 ? 's' : '') +
          (s.last_response ? ' · dernière ' + ago(s.last_response) : '')));
      } else stat.textContent = 'Aucune réponse pour l’instant';
    } else stat.textContent = 'Réponses : ouvrez le faire-part pour les voir';
    c.appendChild(stat);
    var acts = el('div', 'card-actions');
    var main = el('a', 'btn-main', 'Voir les réponses'); main.href = link('admin.html', item.slug, item.key);
    var pub = el('a', null, 'Voir le faire-part'); pub.href = link('invitation.html', item.slug); pub.target = '_blank'; pub.rel = 'noopener';
    var edit = el('a', null, 'Modifier'); edit.href = link('index.html', item.slug, item.key);
    acts.appendChild(main); acts.appendChild(pub); acts.appendChild(edit); acts.appendChild(removeBtn(item));
    c.appendChild(acts);
    return c;
  }

  function load(){
    var items = FP.mine.list(), box = $('fp-cards'), st = $('dash-state');
    box.innerHTML = '';
    $('dash-empty').hidden = items.length > 0;
    if(!items.length){ st.textContent = ''; return; }
    st.textContent = 'Chargement…';
    FP.api.summarize(items.map(function(x){ return { slug: x.slug, key: x.key }; })).then(function(list){
      var by = {};
      (Array.isArray(list) ? list : []).forEach(function(s){ if(s && typeof s.slug === 'string') by[s.slug] = s; });
      // À venir d'abord (du plus proche au plus lointain), puis les mariages passés, puis les liens invalides.
      var rank = function(it){ var s = by[it.slug]; if(!s || s.invalid) return [2, 0]; var d = when(s.date).days; return d >= 0 ? [0, d] : [1, -d]; };
      items.sort(function(a, b){ var x = rank(a), y = rank(b); return x[0] - y[0] || x[1] - y[1]; });
      items.forEach(function(it){ box.appendChild(card(it, by[it.slug])); });
      st.textContent = items.length > 1 ? items.length + ' faire-part' : '';
    }).catch(function(e){
      st.textContent = FP.userError(e);
      items.forEach(function(it){ box.appendChild(card(it, { slug: it.slug, responses: null })); });
    });
  }

  load();
})();

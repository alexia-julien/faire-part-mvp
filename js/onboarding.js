// Onboarding en 4 étapes avec aperçu en direct. Aucun compte : à la publication on génère
// un lien public (invités) et un lien privé (modification + suivi des réponses).
(function(){
  'use strict';
  var FP = window.FP;
  var $ = function(id){ return document.getElementById(id); };
  var state = FP.defaults(), startedAt = Date.now(), editing = null, step = 1, TOTAL = 4, MAX_PHOTOS = 3;
  var LAST_KEY = 'fp:last';

  if(!FP.isRemote) $('banner').hidden = false;

  // ---------- Aperçu ----------
  var raf = 0;
  function preview(){
    if(raf) return;
    raf = requestAnimationFrame(function(){ raf = 0; FP.renderInvitation($('preview'), state, { preview: true }); });
  }

  // ---------- Champs ----------
  function bindInputs(){
    document.querySelectorAll('[data-bind]').forEach(function(el){
      el.addEventListener('input', function(){ state[el.getAttribute('data-bind')] = el.value; preview(); });
    });
    document.querySelectorAll('[data-bind-rsvp]').forEach(function(el){
      el.addEventListener('change', function(){ state.rsvp[el.getAttribute('data-bind-rsvp')] = el.checked; preview(); });
    });
    document.querySelectorAll('input[name=theme]').forEach(function(el){
      el.addEventListener('change', function(){ if(el.checked){ state.theme = el.value; preview(); } });
    });
  }
  function syncInputs(){
    document.querySelectorAll('[data-bind]').forEach(function(el){ el.value = state[el.getAttribute('data-bind')] || ''; });
    document.querySelectorAll('[data-bind-rsvp]').forEach(function(el){ el.checked = !!state.rsvp[el.getAttribute('data-bind-rsvp')]; });
    document.querySelectorAll('input[name=theme]').forEach(function(el){ el.checked = el.value === state.theme; });
    renderThumbs();
  }

  // ---------- Photos ----------
  function renderThumbs(){
    var box = $('thumbs'); box.innerHTML = '';
    state.photos.forEach(function(src, i){
      var d = document.createElement('div'); d.className = 'thumb';
      var img = document.createElement('img'); img.src = src; img.alt = 'Photo ' + (i + 1);
      var rm = document.createElement('button'); rm.type = 'button'; rm.textContent = '×'; rm.setAttribute('aria-label', 'Supprimer la photo ' + (i + 1));
      rm.addEventListener('click', function(){ state.photos.splice(i, 1); renderThumbs(); preview(); });
      d.appendChild(img); d.appendChild(rm);
      if(i === 0){ var t = document.createElement('span'); t.className = 'tag'; t.textContent = 'Principale'; d.appendChild(t); }
      box.appendChild(d);
    });
    $('add-photo').hidden = state.photos.length >= MAX_PHOTOS;
  }
  $('photo-input').addEventListener('change', function(e){
    var files = Array.prototype.slice.call(e.target.files).slice(0, MAX_PHOTOS - state.photos.length);
    var msg = $('photo-msg'); msg.textContent = files.length ? 'Préparation des photos…' : '';
    Promise.all(files.map(function(f){ return FP.resizeImage(f); })).then(function(list){
      list.forEach(function(s){ state.photos.push(s); });
      msg.textContent = ''; renderThumbs(); preview();
    }).catch(function(err){ msg.textContent = err.message || 'Photo non utilisable.'; });
    e.target.value = '';
  });

  // ---------- Étapes ----------
  function validate(n){
    if(n === 1){
      if(!state.partner1.trim() || !state.partner2.trim()) return 'Indiquez les deux prénoms.';
      if(!FP.eventDate(state)) return 'Indiquez la date du mariage.';
    }
    if(n === 2 && !state.venueName.trim()) return 'Indiquez le nom du lieu.';
    return '';
  }
  function show(n){
    step = n;
    document.querySelectorAll('fieldset[data-step]').forEach(function(f){ f.hidden = +f.getAttribute('data-step') !== n; });
    document.querySelectorAll('#steps li').forEach(function(li, i){
      li.classList.toggle('on', i + 1 === n); li.classList.toggle('done', i + 1 < n);
    });
    $('back').hidden = n === 1; $('next').hidden = n === TOTAL; $('publish').hidden = n !== TOTAL;
    $('step-msg').textContent = '';
    window.scrollTo({ top: 0 });
  }
  $('next').addEventListener('click', function(){
    var err = validate(step);
    if(err){ $('step-msg').textContent = err; return; }
    show(step + 1);
  });
  $('back').addEventListener('click', function(){ show(step - 1); });
  document.getElementById('wizard').addEventListener('submit', function(e){ e.preventDefault(); });

  // ---------- Aperçu mobile ----------
  $('show-preview').addEventListener('click', function(){ $('app').classList.add('show-preview-on'); });
  $('close-preview').addEventListener('click', function(){ $('app').classList.remove('show-preview-on'); });

  // ---------- Publication ----------
  function links(slug, key){
    var pub = new URL('invitation.html', location.href); pub.search = '?f=' + slug; pub.hash = '';
    var adm = new URL('admin.html', location.href); adm.search = '?f=' + slug; adm.hash = 'k=' + key;
    return { pub: pub.href, adm: adm.href };
  }
  function showDone(slug, key, seconds){
    var l = links(slug, key);
    $('wizard').hidden = true; $('steps').hidden = true; $('done').hidden = false; $('app').classList.add('done');
    $('app').classList.remove('show-preview-on');
    $('public-link').value = l.pub; $('public-open').href = l.pub;
    $('admin-link').value = l.adm; $('admin-open').href = l.adm;
    $('done-time').textContent = seconds ? 'Créé en ' + (seconds < 90 ? seconds + (seconds > 1 ? ' secondes' : ' seconde') : Math.round(seconds / 60) + ' minutes') + '.' : '';
    try{ localStorage.setItem(LAST_KEY, JSON.stringify({ slug: slug, key: key })); }catch(e){}
    window.scrollTo({ top: 0 });
  }
  function publish(){
    var btn = $('publish'), msg = $('publish-msg');
    msg.textContent = ''; btn.disabled = true;
    var seconds = Math.round((Date.now() - startedAt) / 1000);
    var cfg = JSON.parse(JSON.stringify(state));
    cfg.meta = { durationSec: editing ? (cfg.meta && cfg.meta.durationSec) || null : seconds, updatedAt: new Date().toISOString() };

    function fail(e){
      btn.disabled = false;
      msg.textContent = e && e.forbidden ? 'Le lien privé est invalide : modification impossible.'
        : (e && e.message && !/HTTP|fetch|Failed/i.test(e.message) ? e.message : 'La publication a échoué. Vérifiez votre connexion et réessayez.');
    }
    if(editing){
      FP.api.updateInvitation(editing.slug, editing.key, cfg).then(function(){ showDone(editing.slug, editing.key, 0); }).catch(fail);
      return;
    }
    var key = FP.randomKey(24), tries = 0;
    (function attempt(){
      var slug = (FP.slugify(state.partner1 + '-' + state.partner2) || 'faire-part') + '-' + FP.randomKey(4);
      FP.api.createInvitation(slug, key, cfg).then(function(){ showDone(slug, key, seconds); })
        .catch(function(e){ if(e && e.conflict && ++tries < 4) attempt(); else fail(e); });
    })();
  }
  $('publish').addEventListener('click', function(){
    var err = validate(1) || validate(2);
    if(err){ $('publish-msg').textContent = err; return; }
    publish();
  });
  document.querySelectorAll('[data-copy]').forEach(function(b){
    b.addEventListener('click', function(){
      var input = $(b.getAttribute('data-copy'));
      var done = function(){ var t = b.textContent; b.textContent = 'Copié ✓'; setTimeout(function(){ b.textContent = t; }, 1500); };
      if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(input.value).then(done, function(){ input.select(); });
      else { input.select(); document.execCommand('copy'); done(); }
    });
  });

  // ---------- Démarrage : nouveau faire-part, ou modification via lien privé ----------
  bindInputs();
  var p = FP.params();
  if(p.slug && p.key){
    $('title').textContent = 'Modifier mon faire-part';
    $('subtitle').textContent = 'Vos changements sont publiés sur le même lien.';
    FP.api.getInvitation(p.slug).then(function(cfg){
      if(!cfg) throw new Error('Faire-part introuvable.');
      var d = FP.defaults();
      state = Object.assign(d, cfg); state.rsvp = Object.assign(d.rsvp, cfg.rsvp || {}); state.photos = cfg.photos || [];
      editing = { slug: p.slug, key: p.key };
      $('publish').textContent = 'Enregistrer les modifications';
      syncInputs(); preview();
    }).catch(function(e){ $('step-msg').textContent = e.message || 'Impossible de charger le faire-part.'; });
  } else {
    try{
      var last = JSON.parse(localStorage.getItem(LAST_KEY) || 'null');
      if(last && last.slug && last.key){
        var a = $('resume'); a.hidden = false;
        a.href = 'index.html?f=' + encodeURIComponent(last.slug) + '#k=' + encodeURIComponent(last.key);
      }
    }catch(e){}
  }
  syncInputs(); show(1); preview();
})();

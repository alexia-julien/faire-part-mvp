// Onboarding en 4 étapes avec aperçu en direct. Aucun compte : à la publication on génère
// un lien public (invités) et un lien privé (modification + suivi des réponses).
(function(){
  'use strict';
  var FP = window.FP;
  var $ = function(id){ return document.getElementById(id); };
  // Anti-clickjacking (GitHub Pages ne permet pas d'envoyer X-Frame-Options / frame-ancestors).
  if(window.top !== window.self){ document.body.textContent = ''; return; }

  var LAST_KEY = 'fp:last', DRAFT_KEY = 'fp:draft', TOTAL = 4, MAX_PHOTOS = 3;
  var state = FP.defaults(), startedAt = Date.now(), editing = null, step = 1, pendingPhotos = 0;

  function storeGet(k){ try{ return JSON.parse(localStorage.getItem(k) || 'null'); }catch(e){ return null; } }
  function storeSet(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); return true; }catch(e){ return false; } }
  function storeDel(k){ try{ localStorage.removeItem(k); }catch(e){} }

  if(!FP.isRemote) $('banner').hidden = false;

  // ---------- Aperçu ----------
  var raf = 0;
  function preview(){
    if(raf) return;
    raf = requestAnimationFrame(function(){ raf = 0; FP.renderInvitation($('preview'), state, { preview: true }); });
  }

  // ---------- Brouillon : sauvegardé automatiquement, restauré si la page est rechargée ----------
  var draftTimer = 0, draftDirty = false, published = false;
  function writeDraft(){
    clearTimeout(draftTimer); draftTimer = 0;
    if(editing || published || !draftDirty) return;
    draftDirty = false;
    var d = { state: state, startedAt: startedAt, step: step };
    if(!storeSet(DRAFT_KEY, d)){ // photos trop lourdes pour le stockage du navigateur : on garde le reste
      storeSet(DRAFT_KEY, { state: Object.assign({}, state, { photos: [] }), startedAt: startedAt, step: step });
    }
  }
  function saveDraft(){
    if(editing || published) return;
    draftDirty = true; clearTimeout(draftTimer); draftTimer = setTimeout(writeDraft, 300);
  }
  // Sauvegarde immédiate quand la page se ferme, se recharge ou passe en arrière-plan (changement d'appli sur mobile).
  window.addEventListener('pagehide', writeDraft);
  document.addEventListener('visibilitychange', function(){ if(document.visibilityState === 'hidden') writeDraft(); });
  function changed(){ preview(); saveDraft(); }

  // ---------- Champs ----------
  function bindInputs(){
    document.querySelectorAll('[data-bind]').forEach(function(el){
      el.addEventListener('input', function(){ state[el.getAttribute('data-bind')] = el.value; changed(); });
    });
    document.querySelectorAll('[data-bind-rsvp]').forEach(function(el){
      el.addEventListener('change', function(){ state.rsvp[el.getAttribute('data-bind-rsvp')] = el.checked; changed(); });
    });
    document.querySelectorAll('input[name=theme]').forEach(function(el){
      el.addEventListener('change', function(){ if(el.checked){ state.theme = el.value; changed(); } });
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
      rm.addEventListener('click', function(){ state.photos.splice(i, 1); renderThumbs(); changed(); });
      d.appendChild(img); d.appendChild(rm);
      if(i === 0){ var t = document.createElement('span'); t.className = 'tag'; t.textContent = 'Principale'; d.appendChild(t); }
      else {
        var up = document.createElement('button'); up.type = 'button'; up.className = 'main-btn'; up.textContent = '★';
        up.setAttribute('aria-label', 'Mettre la photo ' + (i + 1) + ' en photo principale'); up.title = 'Photo principale';
        up.addEventListener('click', function(){ state.photos.unshift(state.photos.splice(i, 1)[0]); renderThumbs(); changed(); });
        d.appendChild(up);
      }
      box.appendChild(d);
    });
    $('add-photo').hidden = state.photos.length + pendingPhotos >= MAX_PHOTOS;
  }
  $('photo-input').addEventListener('change', function(e){
    var files = Array.prototype.slice.call(e.target.files).slice(0, Math.max(0, MAX_PHOTOS - state.photos.length - pendingPhotos));
    e.target.value = '';
    if(!files.length) return;
    var msg = $('photo-msg'), errors = [];
    pendingPhotos += files.length; msg.textContent = 'Préparation des photos…'; renderThumbs();
    // Chaque photo est traitée séparément : une photo illisible n'empêche pas d'ajouter les autres.
    // Elles sont ajoutées dans l'ordre choisi par l'utilisateur, pas dans l'ordre où elles finissent d'être traitées.
    Promise.all(files.map(function(f){
      return FP.resizeImage(f).then(function(s){ return s; },
                                    function(err){ errors.push((err && err.message) || 'Photo non utilisable.'); return null; });
    })).then(function(list){
      list.forEach(function(s){ if(s && state.photos.length < MAX_PHOTOS) state.photos.push(s); });
      pendingPhotos -= files.length;
      msg.textContent = errors.length ? errors[0] : '';
      renderThumbs(); changed();
    });
  });

  // ---------- Étapes ----------
  function today(){ var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function validate(n){
    if(n === 1){
      if(!state.partner1.trim() || !state.partner2.trim()) return 'Indiquez les deux prénoms.';
      var d = FP.eventDate(state);
      if(!d) return 'Indiquez la date du mariage.';
      if(!editing && d < today()) return 'Cette date est déjà passée : vérifiez l’année.';
      if(d.getFullYear() > today().getFullYear() + 5) return 'Cette date semble bien lointaine : vérifiez l’année.';
    }
    if(n === 2){
      if(!state.venueName.trim()) return 'Indiquez le nom du lieu.';
      if(state.mapsUrl.trim() && !FP.isAllowedMapsUrl(state.mapsUrl.trim()))
        return 'Ce lien n’est pas reconnu. Collez un lien Google Maps, Apple Plans, OpenStreetMap ou Waze (commençant par https://), ou laissez le champ vide.';
    }
    if(n === 3 && pendingPhotos > 0) return 'Patientez quelques secondes, les photos sont en cours de préparation.';
    return '';
  }
  function show(n, focus){
    step = n;
    document.querySelectorAll('fieldset[data-step]').forEach(function(f){ f.hidden = +f.getAttribute('data-step') !== n; });
    document.querySelectorAll('#steps li').forEach(function(li, i){
      li.classList.toggle('on', i + 1 === n); li.classList.toggle('done', i + 1 < n);
      if(i + 1 === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    $('back').hidden = n === 1; $('next').hidden = n === TOTAL; $('publish').hidden = n !== TOTAL;
    $('step-msg').textContent = '';
    if(focus){
      window.scrollTo({ top: 0 });
      // Le focus va au titre de l'étape (lecteurs d'écran) sans ouvrir le clavier sur mobile.
      var lg = document.querySelector('fieldset[data-step="' + n + '"] legend'); if(lg) lg.focus({ preventScroll: true });
    }
    saveDraft();
  }
  function next(){
    var err = validate(step);
    if(err){ $('step-msg').textContent = err; return; }
    show(step + 1, true);
  }
  $('next').addEventListener('click', next);
  $('back').addEventListener('click', function(){ show(step - 1, true); });
  var wizard = $('wizard');
  wizard.addEventListener('submit', function(e){ e.preventDefault(); });
  // Entrée dans un champ d'une ligne = étape suivante (ou publication à la dernière étape).
  wizard.addEventListener('keydown', function(e){
    if(e.key !== 'Enter' || e.isComposing || e.target.tagName !== 'INPUT' || /^(checkbox|radio|file|button)$/.test(e.target.type)) return;
    e.preventDefault();
    if(step < TOTAL) next(); else $('publish').click();
  });

  // ---------- Aperçu mobile ----------
  $('show-preview').addEventListener('click', function(){ $('app').classList.add('show-preview-on'); $('close-preview').focus(); });
  $('close-preview').addEventListener('click', function(){ $('app').classList.remove('show-preview-on'); $('show-preview').focus(); });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && $('app').classList.contains('show-preview-on')) $('close-preview').click();
  });

  // ---------- Publication ----------
  function links(slug, key){
    var pub = new URL('invitation.html', location.href); pub.search = '?f=' + slug; pub.hash = '';
    var adm = new URL('admin.html', location.href); adm.search = '?f=' + slug; adm.hash = 'k=' + key;
    return { pub: pub.href, adm: adm.href };
  }
  function duration(s){
    if(!s) return '';
    if(s < 90) return 'Créé en ' + s + (s > 1 ? ' secondes.' : ' seconde.');
    var m = Math.round(s / 60); return 'Créé en ' + m + ' minutes.';
  }
  function showDone(slug, key, seconds){
    var l = links(slug, key);
    $('wizard').hidden = true; $('steps').hidden = true; $('draft-note').hidden = true; $('resume').hidden = true;
    $('done').hidden = false; $('app').classList.add('done'); $('app').classList.remove('show-preview-on');
    $('done-title').textContent = editing ? 'Modifications enregistrées !' : 'C’est publié !';
    $('public-link').value = l.pub; $('public-open').href = l.pub;
    $('admin-link').value = l.adm; $('admin-open').href = l.adm;
    $('mail-admin').href = 'mailto:?subject=' + encodeURIComponent('Mon faire-part : lien privé') + '&body=' +
      encodeURIComponent('Lien privé (suivi des réponses et modification), à ne pas partager :\n' + l.adm +
                         '\n\nLien à envoyer aux invités :\n' + l.pub + '\n');
    $('done-time').textContent = duration(seconds);
    if(navigator.share){
      var sb = $('share-btn'); sb.hidden = false;
      sb.onclick = function(){
        navigator.share({ title: state.partner1 + ' & ' + state.partner2, text: 'Vous êtes invités à notre mariage !', url: l.pub }).catch(function(){});
      };
    }
    storeSet(LAST_KEY, { slug: slug, key: key });
    published = true; clearTimeout(draftTimer); storeDel(DRAFT_KEY);
    window.scrollTo({ top: 0 }); $('done-title').focus({ preventScroll: true });
  }
  function publish(){
    var btn = $('publish'), msg = $('step-msg');
    msg.textContent = ''; btn.disabled = true;
    var seconds = Math.round((Date.now() - startedAt) / 1000);
    var cfg = FP.sanitizeConfig(state);
    if(!cfg.tz){ try{ cfg.tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; }catch(e){} }
    cfg = FP.sanitizeConfig(cfg); // revalide le fuseau
    cfg.meta = { durationSec: editing ? (state.meta && state.meta.durationSec) || null : seconds, updatedAt: new Date().toISOString() };

    function fail(e){ btn.disabled = false; msg.textContent = FP.userError(e); }
    if(editing){
      FP.api.updateInvitation(editing.slug, editing.key, cfg).then(function(){ btn.disabled = false; showDone(editing.slug, editing.key, 0); }).catch(fail);
      return;
    }
    var key = FP.randomKey(24), tries = 0;
    (function attempt(){
      // Suffixe aléatoire de 8 caractères (~10^12 possibilités) : les liens ne sont pas devinables par énumération.
      var slug = (FP.slugify(state.partner1 + '-' + state.partner2) || 'faire-part') + '-' + FP.randomKey(8);
      FP.api.createInvitation(slug, key, cfg).then(function(){ showDone(slug, key, seconds); })
        .catch(function(e){ if(e && e.conflict && ++tries < 4) attempt(); else fail(e); });
    })();
  }
  $('publish').addEventListener('click', function(){
    var err = '', bad = 0;
    for(var i = 1; i <= TOTAL && !err; i++){ err = validate(i); bad = i; }
    if(err){ if(bad !== step) show(bad, true); $('step-msg').textContent = err; return; }
    publish();
  });
  document.querySelectorAll('[data-copy]').forEach(function(b){
    b.addEventListener('click', function(){
      var input = $(b.getAttribute('data-copy')), label = b.textContent;
      var ok = function(){ b.textContent = 'Copié ✓'; setTimeout(function(){ b.textContent = label; }, 1500); };
      var fallback = function(){ input.focus(); input.select(); try{ if(document.execCommand('copy')) ok(); }catch(e){} };
      if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(input.value).then(ok, fallback);
      else fallback();
    });
  });
  ['public-link', 'admin-link'].forEach(function(id){ $(id).addEventListener('focus', function(){ this.select(); }); });

  // ---------- Démarrage : modification via lien privé, brouillon, ou nouveau faire-part ----------
  bindInputs();
  var p = FP.params();
  if(p.slug && p.key){
    $('title').textContent = 'Modifier mon faire-part';
    $('subtitle').textContent = 'Vos changements sont publiés sur le même lien. Les réponses déjà reçues sont conservées.';
    wizard.hidden = true; $('steps').hidden = true;
    // On vérifie la clé AVANT d'afficher le formulaire : inutile de laisser modifier pour refuser à l'enregistrement.
    Promise.all([FP.api.listRsvps(p.slug, p.key), FP.api.getInvitation(p.slug)]).then(function(res){
      if(!res[1]) throw new Error('introuvable');
      state = FP.sanitizeConfig(res[1]);
      editing = { slug: p.slug, key: p.key };
      $('publish').textContent = 'Enregistrer les modifications';
      wizard.hidden = false; $('steps').hidden = false;
      syncInputs(); show(1); preview();
    }).catch(function(e){
      $('subtitle').textContent = e && e.forbidden ? 'Ce lien privé est invalide : impossible de modifier ce faire-part.'
        : 'Impossible de charger ce faire-part. Vérifiez votre lien et votre connexion.';
    });
  } else {
    var draft = storeGet(DRAFT_KEY);
    if(draft && draft.state && typeof draft.state === 'object'){
      var meta = draft.state.meta;
      state = FP.sanitizeConfig(draft.state); if(meta) state.meta = state.meta || meta;
      if(typeof draft.startedAt === 'number' && draft.startedAt <= Date.now()) startedAt = draft.startedAt;
      var hasContent = state.partner1 || state.partner2 || state.date || state.venueName || state.photos.length;
      if(hasContent) $('draft-note').hidden = false;
      step = Math.min(Math.max(parseInt(draft.step, 10) || 1, 1), TOTAL);
    }
    $('reset-draft').addEventListener('click', function(){ storeDel(DRAFT_KEY); location.replace('index.html'); });
    var last = storeGet(LAST_KEY);
    if(last && /^[a-z0-9-]{3,63}$/.test(last.slug || '') && /^[a-z0-9]{16,64}$/.test(last.key || '')){
      var a = $('resume'); a.hidden = false;
      a.href = 'index.html?f=' + encodeURIComponent(last.slug) + '#k=' + encodeURIComponent(last.key);
    }
    syncInputs(); show(step); preview();
  }
})();

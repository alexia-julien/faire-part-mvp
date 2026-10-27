// Onboarding en 5 étapes avec aperçu en direct. Aucun compte : à la publication on génère
// un lien public (invités) et un lien privé (modification + suivi des réponses).
// Principe : seules les étapes 1 et 2 sont obligatoires ; tout le reste a de bons réglages par défaut.
(function(){
  'use strict';
  var FP = window.FP;
  var $ = function(id){ return document.getElementById(id); };
  var $$ = function(sel){ return Array.prototype.slice.call(document.querySelectorAll(sel)); };
  // Anti-clickjacking (GitHub Pages ne permet pas d'envoyer X-Frame-Options / frame-ancestors).
  if(window.top !== window.self){ document.body.textContent = ''; return; }

  var DRAFT_KEY = 'fp:draft', TOTAL = 5, MAX_PHOTOS = 3, MAX_PROGRAM = 8, MAX_YEAR = 2050;
  var state = FP.defaults(), startedAt = Date.now(), editing = null, step = 1, pendingPhotos = 0;

  function storeGet(k){ try{ return JSON.parse(localStorage.getItem(k) || 'null'); }catch(e){ return null; } }
  function storeSet(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); return true; }catch(e){ return false; } }
  function storeDel(k){ try{ localStorage.removeItem(k); }catch(e){} }

  if(!FP.isRemote) $('banner').hidden = false;

  // ---------- Aperçu ----------
  var raf = 0, wide = window.matchMedia('(min-width: 980px)');
  function previewVisible(){ return wide.matches || $('app').classList.contains('show-preview-on'); }
  function introContainer(){ return wide.matches ? $('phone') : $('preview-pane'); }
  function preview(playIntro){
    if(playIntro){
      cancelAnimationFrame(raf); raf = 0;
      FP.renderInvitation($('preview'), state, { preview: true, playIntro: true, introContainer: introContainer() });
      return;
    }
    if(raf) return;
    raf = requestAnimationFrame(function(){ raf = 0; FP.renderInvitation($('preview'), state, { preview: true }); });
  }
  function updateReplay(){ $('replay-intro').hidden = state.intro === 'aucune'; }
  $('replay-intro').addEventListener('click', function(){ preview(true); });

  // Format de l'aperçu : « Mobile » (téléphone) ou « Ordinateur » (rendu réel en 1280 px, réduit pour tenir à l'écran).
  var DESKTOP_W = 1280, device = 'mobile';
  try{ if(localStorage.getItem('fp:device') === 'desktop') device = 'desktop'; }catch(e){}
  function fitPreview(){
    var pv = $('preview');
    pv.style.zoom = device === 'desktop' ? String($('phone').clientWidth / DESKTOP_W) : '';
  }
  function applyDevice(){
    var desk = device === 'desktop';
    $('phone').classList.toggle('desktop', desk); $('app').classList.toggle('preview-desktop', desk);
    $$('[data-device]').forEach(function(b){ b.setAttribute('aria-pressed', String(b.getAttribute('data-device') === device)); });
    fitPreview();
  }
  $$('[data-device]').forEach(function(b){
    b.addEventListener('click', function(){
      device = b.getAttribute('data-device');
      try{ localStorage.setItem('fp:device', device); }catch(e){}
      applyDevice(); preview();
    });
  });
  if(window.ResizeObserver) new ResizeObserver(fitPreview).observe($('phone'));
  applyDevice();

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

  // ---------- Sélecteurs de style (générés depuis le catalogue de render.js) ----------
  function radio(name, value, html, cls){
    var l = document.createElement('label'); l.className = cls;
    var i = document.createElement('input'); i.type = 'radio'; i.name = name; i.value = value;
    l.appendChild(i); l.insertAdjacentHTML('beforeend', html);
    return l;
  }
  FP.PRESETS.forEach(function(p){
    var intro = FP.INTROS.filter(function(x){ return x.id === p.intro; })[0];
    $('presets').appendChild(radio('preset', p.id,
      '<span class="preset-sw pal-' + p.theme + '" aria-hidden="true"></span>' +
      '<span class="preset-name fs-' + p.font + '">' + FP.esc(p.label) + '</span>' +
      '<span class="preset-sub">' + FP.esc(intro ? intro.label : '') + '</span>', 'preset'));
  });
  FP.INTROS.forEach(function(x){ $('pick-intro').appendChild(radio('style-intro', x.id, FP.esc(x.label), 'pill')); });
  FP.PALETTES.forEach(function(x){
    $('pick-theme').appendChild(radio('style-theme', x.id, '<span class="sw pal-' + x.id + '" aria-hidden="true"></span>' + FP.esc(x.label), 'pill swatch'));
  });
  FP.FONTS.forEach(function(x){
    $('pick-font').appendChild(radio('style-font', x.id, '<span class="fs-' + x.id + '">Alexia &amp; Julien</span><span class="opt">' + FP.esc(x.label) + '</span>', 'pill font'));
  });
  FP.SHAPES.forEach(function(x){ $('pick-shape').appendChild(radio('style-shape', x.id, '<span class="shape shape-' + x.id + '" aria-hidden="true"></span>' + FP.esc(x.label), 'pill')); });
  var STYLE_KEYS = { 'style-intro': 'intro', 'style-theme': 'theme', 'style-font': 'font', 'style-shape': 'photoShape' };
  function matchingPreset(){
    return FP.PRESETS.filter(function(p){ return p.theme === state.theme && p.font === state.font && p.intro === state.intro && p.photoShape === state.photoShape; })[0];
  }
  function syncStyle(){
    var p = matchingPreset();
    $$('input[name=preset]').forEach(function(el){ el.checked = !!p && el.value === p.id; });
    Object.keys(STYLE_KEYS).forEach(function(n){ $$('input[name=' + n + ']').forEach(function(el){ el.checked = el.value === state[STYLE_KEYS[n]]; }); });
    updateReplay();
  }
  $('presets').addEventListener('change', function(e){
    var p = FP.PRESETS.filter(function(x){ return x.id === e.target.value; })[0];
    if(!p) return;
    var introChanged = p.intro !== state.intro;
    state.theme = p.theme; state.font = p.font; state.intro = p.intro; state.photoShape = p.photoShape;
    syncStyle(); saveDraft();
    preview(introChanged && p.intro !== 'aucune' && previewVisible());
  });
  Object.keys(STYLE_KEYS).forEach(function(n){
    document.querySelector('[name=' + n + ']').closest('[role=radiogroup]').addEventListener('change', function(e){
      if(e.target.name !== n) return;
      state[STYLE_KEYS[n]] = e.target.value;
      syncStyle(); saveDraft();
      preview(n === 'style-intro' && e.target.value !== 'aucune' && previewVisible());
    });
  });

  // ---------- Champs simples ----------
  function bindInputs(){
    $$('[data-bind]').forEach(function(el){
      el.addEventListener('input', function(){ state[el.getAttribute('data-bind')] = el.value; changed(); });
    });
    $$('[data-bind-bool]').forEach(function(el){
      el.addEventListener('change', function(){ state[el.getAttribute('data-bind-bool')] = el.checked; changed(); });
    });
    $$('[data-bind-rsvp]').forEach(function(el){
      el.addEventListener('change', function(){ state.rsvp[el.getAttribute('data-bind-rsvp')] = el.checked; rsvpDeps(); changed(); });
    });
    $$('[data-bind-rsvp-text]').forEach(function(el){
      el.addEventListener('input', function(){ state.rsvp[el.getAttribute('data-bind-rsvp-text')] = el.value; changed(); });
    });
    $$('[data-sec]').forEach(function(el){
      el.addEventListener('input', function(){ var k = el.getAttribute('data-sec').split('.'); state.sections[k[0]][k[1]] = el.value; changed(); });
    });
    $$('[data-section-toggle]').forEach(function(el){
      el.addEventListener('change', function(){
        var id = el.getAttribute('data-section-toggle'), s = state.sections[id];
        s.on = el.checked;
        // Première activation : contenu pré-rempli (sans écraser ce que l'utilisateur a déjà tapé).
        if(s.on){
          var def = FP.sectionDefaults(id, state);
          if(id === 'program'){ if(!s.items.length) s.items = def.items; }
          else if(!s.text) s.text = def.text;
        }
        syncSections(); changed();
        if(s.on){ var first = document.querySelector('[data-section-body="' + id + '"] textarea, [data-section-body="' + id + '"] input'); if(first) first.focus({ preventScroll: false }); }
      });
    });
  }
  // « Noms des accompagnants » n'a de sens que si l'on demande le nombre de personnes ou d'enfants.
  function rsvpDeps(){
    var ok = state.rsvp.guests || state.rsvp.children, c = document.querySelector('[data-bind-rsvp=companions]');
    if(!ok) state.rsvp.companions = false;
    c.disabled = !ok; c.checked = !!state.rsvp.companions;
    c.closest('label').classList.toggle('disabled', !ok);
    c.closest('label').title = ok ? '' : 'Activez d’abord « Nombre de personnes » ou « Nombre d’enfants »';
  }
  function syncSections(){
    FP.SECTIONS.forEach(function(x){
      var s = state.sections[x.id];
      document.querySelector('[data-section-toggle="' + x.id + '"]').checked = s.on;
      document.querySelector('[data-section-body="' + x.id + '"]').hidden = !s.on;
    });
    $$('[data-sec]').forEach(function(el){ var k = el.getAttribute('data-sec').split('.'); el.value = state.sections[k[0]][k[1]] || ''; });
    renderProgram();
  }
  function syncInputs(){
    $$('[data-bind]').forEach(function(el){ el.value = state[el.getAttribute('data-bind')] || ''; });
    $$('[data-bind-bool]').forEach(function(el){ el.checked = !!state[el.getAttribute('data-bind-bool')]; });
    $$('[data-bind-rsvp]').forEach(function(el){ el.checked = !!state.rsvp[el.getAttribute('data-bind-rsvp')]; });
    $$('[data-bind-rsvp-text]').forEach(function(el){ el.value = state.rsvp[el.getAttribute('data-bind-rsvp-text')] || ''; });
    rsvpDeps(); syncStyle(); syncSections(); renderThumbs();
  }

  // ---------- Programme : liste d'étapes (heure + libellé) ----------
  function renderProgram(){
    var box = $('program-items'), items = state.sections.program.items;
    box.innerHTML = '';
    items.forEach(function(it, i){
      var row = document.createElement('div'); row.className = 'prog-row';
      var t = document.createElement('input'); t.type = 'time'; t.value = it.time; t.setAttribute('aria-label', 'Heure de l’étape ' + (i + 1));
      var l = document.createElement('input'); l.type = 'text'; l.maxLength = 60; l.value = it.label; l.placeholder = 'Ex. : Cérémonie'; l.setAttribute('aria-label', 'Libellé de l’étape ' + (i + 1));
      var rm = document.createElement('button'); rm.type = 'button'; rm.className = 'icon-btn'; rm.textContent = '×'; rm.setAttribute('aria-label', 'Supprimer l’étape ' + (i + 1));
      t.addEventListener('input', function(){ it.time = t.value; changed(); });
      l.addEventListener('input', function(){ it.label = l.value; changed(); });
      rm.addEventListener('click', function(){ items.splice(i, 1); renderProgram(); changed(); });
      row.appendChild(t); row.appendChild(l); row.appendChild(rm); box.appendChild(row);
    });
    $('program-add').hidden = items.length >= MAX_PROGRAM;
  }
  $('program-add').addEventListener('click', function(){
    state.sections.program.items.push({ time: '', label: '' });
    renderProgram(); changed();
    var rows = $('program-items').querySelectorAll('.prog-row input[type=text]'); rows[rows.length - 1].focus();
  });

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
      var y = /^(\d+)-/.exec(state.date || '');
      if(y && +y[1] > MAX_YEAR) return 'L’année ne peut pas dépasser ' + MAX_YEAR + ' : vérifiez la date.';
      if(!state.date && $('date-input').validity.badInput) return 'La date est incomplète : vérifiez le jour, le mois et l’année.';
      var d = FP.eventDate(state);
      if(!d) return 'Indiquez la date du mariage.';
      if(!editing && d < today()) return 'Cette date est déjà passée : vérifiez l’année.';
    }
    if(n === 2){
      if(!state.venueName.trim()) return 'Indiquez le nom du lieu.';
      if(state.mapsUrl.trim() && !FP.isAllowedMapsUrl(state.mapsUrl.trim()))
        return 'Ce lien n’est pas reconnu. Collez un lien Google Maps, Apple Plans, OpenStreetMap ou Waze (commençant par https://), ou laissez le champ vide.';
    }
    if(n === 3 && pendingPhotos > 0) return 'Patientez quelques secondes, les photos sont en cours de préparation.';
    if(n === 4){
      var links = [['lodging', 'hébergements'], ['gifts', 'cagnotte']];
      for(var i = 0; i < links.length; i++){
        var s = state.sections[links[i][0]];
        if(s.on && s.url.trim() && !FP.isValidLink(s.url.trim())) return 'Le lien « ' + links[i][1] + ' » n’est pas valide : il doit commencer par https://';
      }
    }
    if(n === 5 && !state.rsvp.deadline && $('deadline-input').validity.badInput) return 'La date limite de réponse est incomplète.';
    if(n === 5 && state.rsvp.deadline){
      var dl = FP.parseDate(state.rsvp.deadline), wd = FP.eventDate(state);
      if(!dl) return 'La date limite de réponse n’est pas valide.';
      if(!editing && dl < today()) return 'La date limite de réponse est déjà passée.';
      if(wd && dl > wd) return 'La date limite de réponse doit précéder le mariage.';
    }
    return '';
  }
  function show(n, focus){
    step = n;
    $$('fieldset[data-step]').forEach(function(f){ f.hidden = +f.getAttribute('data-step') !== n; });
    $$('#steps li').forEach(function(li, i){
      li.classList.toggle('on', i + 1 === n); li.classList.toggle('done', i + 1 < n);
      if(i + 1 === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    $('back').hidden = n === 1; $('next').hidden = n === TOTAL; $('publish').hidden = n !== TOTAL;
    $('step-msg').textContent = '';
    if(n === 3) FP.FONTS.forEach(function(f){ FP.loadFont(f.id); }); // aperçu des polices dans les choix
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
    if(e.target.closest('#program-items')) return; // dans le programme, Entrée ne quitte pas l'étape
    e.preventDefault();
    if(step < TOTAL) next(); else $('publish').click();
  });

  // ---------- Aperçu mobile ----------
  $('show-preview').addEventListener('click', function(){ $('app').classList.add('show-preview-on'); $('close-preview').focus(); });
  $('close-preview').addEventListener('click', function(){ $('app').classList.remove('show-preview-on'); preview(); $('show-preview').focus(); });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && $('app').classList.contains('show-preview-on') && !document.querySelector('#preview .fp-intro')) $('close-preview').click();
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
    return 'Créé en ' + Math.round(s / 60) + ' minutes.';
  }
  function showDone(slug, key, seconds){
    var l = links(slug, key), tester = !!FP.tester.token();
    $('wizard').hidden = true; $('steps').hidden = true; $('draft-note').hidden = true; $('mine-link').hidden = true;
    $('done').hidden = false; $('app').classList.add('done'); $('app').classList.remove('show-preview-on');
    $('done-title').textContent = editing ? 'Modifications enregistrées !' : 'C’est prêt !';
    $('public-link').value = l.pub; $('public-open').href = l.pub;
    var ed = new URL('index.html', location.href); ed.search = '?f=' + slug; ed.hash = 'k=' + key;
    $('edit-again').href = ed.href;
    $('admin-link').value = l.adm;
    $('done-time').textContent = editing ? '' : duration(seconds);
    // Testeur : le faire-part rejoint son espace, qui suffit pour le retrouver. Sinon, le lien privé reste affiché.
    $('admin-card').hidden = tester;
    $('go-mine').textContent = tester ? 'Retour à mon espace' : 'Voir mes faire-part';
    if(!tester){
      $('mail-admin').href = 'mailto:?subject=' + encodeURIComponent('Mon faire-part : lien privé') + '&body=' +
        encodeURIComponent('Lien privé (suivi des réponses et modification), à ne pas partager :\n' + l.adm +
                           '\n\nLien à envoyer aux invités :\n' + l.pub + '\n');
    } else {
      FP.tester.attach(slug, key).then(function(ok){ if(!ok) $('admin-card').hidden = false; }); // échec : on garde le lien privé
    }
    FP.mine.add(slug, key); // retrouvable ensuite dans « Mes faire-part »
    published = true; clearTimeout(draftTimer); storeDel(DRAFT_KEY);
    window.scrollTo({ top: 0 }); $('done-title').focus({ preventScroll: true });
  }
  function cleanForPublish(){
    var cfg = FP.sanitizeConfig(state);
    // On ne publie pas les étapes vides du programme ni les espaces superflus des liens.
    cfg.sections.program.items = cfg.sections.program.items.filter(function(it){ return it.label.trim(); });
    ['lodging', 'gifts'].forEach(function(k){ cfg.sections[k].url = cfg.sections[k].url.trim(); });
    if(!cfg.tz){ try{ cfg.tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; }catch(e){} }
    cfg = FP.sanitizeConfig(cfg); // revalide le fuseau
    cfg.meta = { durationSec: editing ? (state.meta && state.meta.durationSec) || null : Math.round((Date.now() - startedAt) / 1000), updatedAt: new Date().toISOString() };
    return cfg;
  }
  function publish(){
    var btn = $('publish'), msg = $('step-msg');
    msg.textContent = ''; btn.disabled = true;
    var cfg = cleanForPublish(), seconds = cfg.meta.durationSec;
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
  $$('[data-copy]').forEach(function(b){
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
      FP.mine.add(p.slug, p.key); FP.tester.attach(p.slug, p.key);
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
    var mine = FP.mine.list().length;
    if(mine || FP.tester.token()){ var a = $('mine-link'); a.hidden = false; a.textContent = FP.tester.token() ? 'Mon espace' + (mine ? ' (' + mine + ')' : '') : 'Mes faire-part (' + mine + ')'; }
    // Pas de date passée ni au-delà de 2050 dans le calendrier du navigateur
    var t0 = today(), iso = t0.getFullYear() + '-' + ('0' + (t0.getMonth() + 1)).slice(-2) + '-' + ('0' + t0.getDate()).slice(-2);
    $('date-input').min = iso; $('deadline-input').min = iso;
    syncInputs(); show(step); preview();
  }
})();

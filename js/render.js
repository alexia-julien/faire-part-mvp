// Rendu du faire-part à partir d'une config (page publique ET aperçu de l'onboarding).
// Tout texte saisi par l'utilisateur est échappé ; les URL sont filtrées (https seulement).
(function(){
  'use strict';
  var FP = window.FP = window.FP || {};
  var timer = null;

  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function paras(s){
    s = String(s || '').trim();
    if(!s) return '';
    return s.split(/\n{2,}/).map(function(p){ return '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>'; }).join('');
  }
  function safeHttps(u){ u = String(u || '').trim(); return /^https:\/\/[^\s"'<>]+$/i.test(u) ? u : ''; }
  function safeImg(u){ return /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/.test(u || '') ? u : ''; }
  function pad(n){ return (n < 10 ? '0' : '') + n; }

  // Le lien « Ouvrir dans Maps » n'accepte que des services de cartographie connus : sans ça, un faire-part
  // créé par un tiers pourrait pointer vers un site de phishing derrière un bouton à l'apparence inoffensive.
  var TLD = '(com|fr|de|es|it|pt|be|ch|ca|co\\.uk|com\\.br)';
  var MAPS_HOST = new RegExp('^(maps\\.app\\.goo\\.gl|goo\\.gl|maps\\.google\\.' + TLD + '|(www\\.)?google\\.' + TLD +
    '|maps\\.apple\\.com|(www\\.)?openstreetmap\\.org|(www\\.)?waze\\.com|ul\\.waze\\.com)$', 'i');
  function safeMapsUrl(u){
    u = safeHttps(u);
    if(!u) return '';
    try{
      var x = new URL(u);
      if(x.username || x.password || !MAPS_HOST.test(x.hostname)) return '';
      if(/^(www\.)?google\./i.test(x.hostname) && !/^\/maps/.test(x.pathname)) return '';
      if(/^goo\.gl$/i.test(x.hostname) && !/^\/maps/.test(x.pathname)) return '';
      return x.href;
    }catch(e){ return ''; }
  }

  // Liste blanche : la config vient de la base (donc potentiellement forgée par n'importe qui). On ne garde que
  // les champs connus, avec leur type et leur longueur maximale. Ça évite aussi la pollution de prototype
  // (une clé "__proto__" dans le JSON) qu'un simple Object.assign aurait laissée passer.
  var THEMES = ['sauge', 'rose', 'nuit'];
  function str(v, max, def){ return typeof v === 'string' ? v.slice(0, max) : (def || ''); }
  FP.sanitizeConfig = function(c){
    var d = FP.defaults();
    c = (c && typeof c === 'object' && !Array.isArray(c)) ? c : {};
    var r = (c.rsvp && typeof c.rsvp === 'object') ? c.rsvp : {};
    var out = {
      v: 1,
      partner1: str(c.partner1, 40), partner2: str(c.partner2, 40),
      date: /^\d{4}-\d{2}-\d{2}$/.test(str(c.date, 10)) ? c.date : '',
      time: /^\d{2}:\d{2}$/.test(str(c.time, 5)) ? c.time : '',
      venueName: str(c.venueName, 80), venueAddress: str(c.venueAddress, 200), mapsUrl: str(c.mapsUrl, 300),
      subtitle: str(c.subtitle, 100, d.subtitle), message: str(c.message, 600, d.message), practical: str(c.practical, 1200),
      photos: Array.isArray(c.photos) ? c.photos.filter(function(p){ return typeof p === 'string' && safeImg(p); }).slice(0, 3) : [],
      theme: THEMES.indexOf(c.theme) > -1 ? c.theme : 'sauge',
      tz: /^[A-Za-z]+(\/[A-Za-z0-9_+\-]+){0,2}$/.test(str(c.tz, 64)) ? c.tz : '',
      rsvp: {}
    };
    ['guests', 'diet', 'brunch', 'message'].forEach(function(k){ out.rsvp[k] = (k in r) ? r[k] === true : d.rsvp[k]; });
    if(c.meta && typeof c.meta === 'object'){
      out.meta = { durationSec: typeof c.meta.durationSec === 'number' ? c.meta.durationSec : null, updatedAt: str(c.meta.updatedAt, 40) };
    }
    return out;
  };

  FP.esc = esc;

  FP.defaults = function(){
    return {
      v: 1,
      partner1: '', partner2: '',
      date: '', time: '16:00',
      venueName: '', venueAddress: '', mapsUrl: '',
      subtitle: 'vous invitent à célébrer leur mariage',
      message: 'Nous serions très heureux de partager ce jour unique avec vous.',
      practical: '',
      photos: [],
      theme: 'sauge',
      tz: '', // fuseau horaire du lieu (celui du créateur au moment de la création)
      rsvp: { guests: true, diet: true, brunch: false, message: true }
    };
  };

  FP.isAllowedMapsUrl = function(u){ return !!safeMapsUrl(u); };

  // Date « murale » du mariage (pour l'affichage : 7 août 2027, 16h00, quel que soit le pays de l'invité).
  FP.eventDate = function(cfg){
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cfg.date || '');
    if(!m) return null;
    var t = /^(\d{2}):(\d{2})$/.exec(cfg.time || '') || [0, '16', '00'];
    var d = new Date(+m[1], +m[2] - 1, +m[3], +t[1], +t[2], 0);
    return d.getMonth() === +m[2] - 1 ? d : null; // rejette les dates impossibles (31 février…)
  };

  // Instant absolu du mariage (pour le compte à rebours et l'agenda) : 16h00 à Paris reste 16h00 à Paris,
  // même pour un invité au Brésil. Sans fuseau connu (anciens faire-part), on suppose Europe/Paris.
  function tzOffset(tz, ms){
    var p = {};
    new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(ms)).forEach(function(x){ p[x.type] = x.value; });
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - ms;
  }
  FP.eventInstant = function(cfg){
    var d = FP.eventDate(cfg);
    if(!d) return null;
    var guess = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes());
    try{
      var tz = cfg.tz || 'Europe/Paris', off = tzOffset(tz, guess), t = guess - off, off2 = tzOffset(tz, t);
      return off2 === off ? t : guess - off2;
    }catch(e){ return d.getTime(); }
  };

  FP.formatDate = function(cfg, withWeekday){
    var d = FP.eventDate(cfg);
    if(!d) return '';
    var s = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    if(d.getDate() === 1) s = s.replace(/^1 /, '1er ');
    if(!withWeekday) return s;
    var w = d.toLocaleDateString('fr-FR', { weekday: 'long' });
    return w.charAt(0).toUpperCase() + w.slice(1) + ' ' + s;
  };

  FP.mapsHref = function(cfg){
    var u = safeMapsUrl(cfg.mapsUrl);
    if(u) return u;
    var q = [cfg.venueName, cfg.venueAddress].join(' ').trim();
    return q ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q) : '';
  };

  // Horodatage UTC (suffixe Z) : chaque agenda le convertit dans le fuseau de l'invité.
  function icsStamp(ms){ return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
  function icsEsc(s){ return String(s).replace(/[\\;,]/g, '\\$&').replace(/\r?\n/g, '\\n'); }
  // Les lignes ICS ne doivent pas dépasser 75 octets : on les replie (norme RFC 5545).
  // Repli compté en octets UTF-8 (un « é » ou un « ’ » pèse 2 à 3 octets), sans couper un caractère en deux.
  function icsFold(line){
    var out = [], cur = '', bytes = 0;
    for(var ch of line){
      var cp = ch.codePointAt(0), n = cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
      if(bytes + n > 75){ out.push(cur); cur = ' '; bytes = 1; }
      cur += ch; bytes += n;
    }
    out.push(cur);
    return out.join('\r\n');
  }
  FP.buildIcs = function(cfg){
    cfg = FP.sanitizeConfig(cfg);
    var start = FP.eventInstant(cfg); if(start == null) return '';
    var title = 'Mariage de ' + cfg.partner1 + ' & ' + cfg.partner2;
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Faire-part//FR', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      'UID:' + start + '-' + FP.slugifyLite(title) + '@faire-part', 'DTSTAMP:' + icsStamp(Date.now()),
      'DTSTART:' + icsStamp(start), 'DTEND:' + icsStamp(start + 6 * 3600 * 1000),
      'SUMMARY:' + icsEsc(title), 'LOCATION:' + icsEsc([cfg.venueName, cfg.venueAddress].filter(Boolean).join(', ')),
      'END:VEVENT', 'END:VCALENDAR'].map(icsFold).join('\r\n');
  };
  FP.slugifyLite = function(s){ return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40); };
  function downloadIcs(cfg){
    var ics = FP.buildIcs(cfg); if(!ics) return;
    var url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    var a = document.createElement('a'); a.href = url; a.download = 'mariage.ics';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  }

  var HEART = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.05-4.35-9.5-8.5C.7 9 2.2 5 6.3 5c2 0 3.6 1.1 5.7 3.6C14.1 6.1 15.7 5 17.7 5c4.1 0 5.6 4 3.8 7.5C19.05 16.65 12 21 12 21z"/></svg>';
  function divider(){ return '<div class="divider-heart" aria-hidden="true"><span class="dh-line"></span>' + HEART + '<span class="dh-line"></span></div>'; }

  function rsvpHtml(cfg, preview){
    var r = cfg.rsvp || {};
    var h = '';
    h += '<form class="rsvp-form" novalidate><fieldset class="rsvp-fields"' + (preview ? ' disabled' : '') + '>';
    h += '<div class="hp" aria-hidden="true"><label>Ne pas remplir<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>';
    h += '<div class="field"><label for="f-name">Nom et prénom</label><input type="text" id="f-name" name="name" maxlength="120" autocomplete="name" required></div>';
    h += '<div class="field"><span class="lab" id="lab-att">Serez-vous présent(e) ?</span><div class="choices" role="radiogroup" aria-labelledby="lab-att">' +
         '<label><input type="radio" name="attendance" value="yes"> Oui, avec plaisir</label>' +
         '<label><input type="radio" name="attendance" value="no"> Je ne pourrai pas</label></div></div>';
    if(r.guests) h += '<div class="field when-yes"><label for="f-guests">Nombre de personnes (vous inclus)</label><input type="number" id="f-guests" name="guests" min="1" max="20" value="1" inputmode="numeric"></div>';
    if(r.brunch) h += '<div class="field when-yes"><span class="lab" id="lab-brunch">Brunch du lendemain ?</span><div class="choices" role="radiogroup" aria-labelledby="lab-brunch">' +
         '<label><input type="radio" name="brunch" value="yes"> Oui</label>' +
         '<label><input type="radio" name="brunch" value="no"> Non</label></div></div>';
    if(r.diet) h += '<div class="field when-yes"><label for="f-diet">Régime alimentaire ou allergies</label><input type="text" id="f-diet" name="diet" maxlength="300" placeholder="Végétarien, sans gluten…"></div>';
    if(r.message) h += '<div class="field"><label for="f-msg">Un message pour nous ?</label><textarea id="f-msg" name="message" maxlength="1000"></textarea></div>';
    h += '<div class="center"><button type="submit" class="btn">Envoyer ma réponse</button></div>';
    h += '<p class="form-msg" role="status"></p></fieldset></form>';
    return h;
  }

  function bindRsvp(root, opts){
    var form = root.querySelector('.rsvp-form');
    if(!form) return;
    var whenYes = form.querySelectorAll('.when-yes');
    function toggle(){
      var c = form.querySelector('input[name=attendance]:checked');
      var no = c && c.value === 'no';
      for(var i = 0; i < whenYes.length; i++) whenYes[i].hidden = no;
    }
    form.addEventListener('change', toggle); toggle();
    form.addEventListener('submit', function(e){
      e.preventDefault();
      if(opts.preview || !opts.onSubmit) return;
      var fd = new FormData(form), msg = form.querySelector('.form-msg'), btn = form.querySelector('button[type=submit]');
      if(fd.get('website')) return; // anti-spam : champ piège rempli par les robots
      var name = String(fd.get('name') || '').trim(), att = fd.get('attendance');
      if(!name || !att){ msg.textContent = 'Merci d’indiquer votre nom et si vous serez présent(e).'; return; }
      var yes = att === 'yes';
      var data = {
        name: name.slice(0, 120), attendance: att,
        guests: yes ? Math.max(1, Math.min(20, parseInt(fd.get('guests'), 10) || 1)) : 0,
        diet: yes ? String(fd.get('diet') || '').slice(0, 300) : '',
        brunch: yes ? String(fd.get('brunch') || '') : '',
        message: String(fd.get('message') || '').slice(0, 1000)
      };
      btn.disabled = true; msg.textContent = '';
      opts.onSubmit(data).then(function(){
        root.querySelector('.form-wrap').innerHTML = '<div class="thanks"><h3>Merci ' + esc(name.split(' ')[0]) + ' !</h3><p>' +
          (yes ? 'Votre réponse est bien enregistrée. À très vite !' : 'Merci de nous avoir prévenus, vous nous manquerez.') + '</p></div>';
      }).catch(function(){
        btn.disabled = false; msg.textContent = 'Oups, l’envoi a échoué. Merci de réessayer dans un instant.';
      });
    });
  }

  FP.renderInvitation = function(root, cfg, opts){
    opts = opts || {};
    cfg = FP.sanitizeConfig(cfg);
    if(timer){ clearInterval(timer); timer = null; }

    var photos = cfg.photos.map(safeImg).filter(Boolean);
    var theme = cfg.theme;
    root.className = 'fp' + (photos.length ? '' : ' no-photo');
    root.setAttribute('data-theme', theme);

    var p1 = esc(cfg.partner1 || 'Prénom'), p2 = esc(cfg.partner2 || 'Prénom');
    // Espace normale avant « & » (la ligne peut se couper là si les prénoms sont longs), insécable après.
    var names = p1 + ' <span class="amp">&amp;</span>&nbsp;' + p2;
    var dateLong = FP.formatDate(cfg, false), dateFull = FP.formatDate(cfg, true);
    var time = /^\d{2}:\d{2}$/.test(cfg.time || '') ? cfg.time.replace(':', 'h') : '';
    var hasDate = !!FP.eventDate(cfg);
    var maps = FP.mapsHref(cfg);
    var h = '';

    // Hero
    if(photos[0]) h += '<div class="hero-photo-wrap"><img class="hero-photo" src="' + photos[0] + '" alt="' + p1 + ' et ' + p2 + '"></div>';
    h += '<div class="hero-text"><h1 class="names">' + names + '</h1>';
    if(cfg.subtitle) h += '<div class="subtitle">' + esc(cfg.subtitle) + '</div>';
    h += '<div class="rule"></div>';
    h += '<div class="date">' + (dateLong ? esc(dateLong) : 'Date à venir') + '</div>';
    if(hasDate && time) h += '<div class="date-sub">' + esc(dateFull.split(' ')[0]) + ' · ' + esc(time) + '</div>';
    if(hasDate){
      h += '<div class="countdown" aria-hidden="true">' +
        ['days:jours', 'hours:heures', 'mins:minutes', 'secs:secondes'].map(function(x){
          var a = x.split(':'); return '<div><div class="cd-num" data-cd="' + a[0] + '">—</div><div class="cd-lab">' + a[1] + '</div></div>';
        }).join('') + '</div>';
      h += '<button type="button" class="btn" data-ics>Ajouter à mon agenda</button>';
    }
    h += '</div>';

    // Lieu
    if(cfg.venueName){
      h += '<section class="alt"><div class="section-head"><h2>Lieu</h2>' + divider() + '</div>';
      h += '<div class="lieu-name">' + esc(cfg.venueName) + '</div>';
      if(cfg.venueAddress) h += '<div class="lieu-address">' + esc(cfg.venueAddress) + '</div>';
      if(maps) h += '<div class="center"><a class="maps-btn" href="' + esc(maps) + '" target="_blank" rel="noopener">Ouvrir dans Maps</a></div>';
      if(photos.length > 1) h += '<div class="gallery">' + photos.slice(1).map(function(p){ return '<img loading="lazy" src="' + p + '" alt="">'; }).join('') + '</div>';
      h += '</section>';
    }

    // Message + infos pratiques
    if(cfg.message) h += '<section><div class="narrow">' + paras(cfg.message) + '</div></section>';
    if(cfg.practical){
      h += '<section class="alt"><div class="section-head"><h2>Infos pratiques</h2>' + divider() + '</div><div class="narrow">' + paras(cfg.practical) + '</div></section>';
    }

    // RSVP
    h += '<section><div class="section-head"><h2>Merci de confirmer votre présence</h2>' + divider() + '</div>';
    if(opts.preview) h += '<p class="preview-note">Aperçu : le formulaire sera actif une fois le faire-part publié.</p>';
    if(opts.previousName) h += '<p class="preview-note">Vous avez déjà répondu (' + esc(opts.previousName) + '). Une nouvelle réponse remplacera la précédente.</p>';
    h += '<div class="form-wrap">' + rsvpHtml(cfg, !!opts.preview) +
         '<p class="privacy">Vos réponses sont transmises uniquement aux mariés.</p></div></section>';

    h += '<footer>' + divider() + '<div class="fnames">' + names + '</div>' + (dateLong ? '<div class="fdate">' + esc(dateLong) + '</div>' : '') + '</footer>';

    root.innerHTML = h;
    bindRsvp(root, opts);

    var ics = root.querySelector('[data-ics]');
    if(ics) ics.addEventListener('click', function(){ downloadIcs(cfg); });

    if(hasDate){
      var target = FP.eventInstant(cfg);
      var tick = function(){
        var diff = Math.max(0, target - Date.now()), s = Math.floor(diff / 1000);
        var set = function(k, v){ var el = root.querySelector('[data-cd="' + k + '"]'); if(el) el.textContent = v; };
        set('days', Math.floor(s / 86400)); set('hours', pad(Math.floor(s % 86400 / 3600)));
        set('mins', pad(Math.floor(s % 3600 / 60))); set('secs', pad(s % 60));
      };
      tick(); timer = setInterval(tick, 1000);
    }
  };

  // Redimensionne une photo côté navigateur (JPEG, 1600 px max) pour garder un envoi léger sur mobile.
  // Si l'image reste trop lourde, on baisse la qualité puis la taille (plafond ~700 000 caractères par photo,
  // pour rester sous la limite de taille imposée côté serveur).
  FP.resizeImage = function(file, maxSide, quality){
    maxSide = maxSide || 1600; quality = quality || 0.82;
    return new Promise(function(resolve, reject){
      if(!/^image\/(jpeg|png|webp|heic|heif|gif)$/i.test(file.type)) return reject(new Error('Format de photo non pris en charge (JPEG, PNG ou WebP).'));
      if(file.size > 30 * 1024 * 1024) return reject(new Error('Photo trop volumineuse (30 Mo maximum).'));
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function(){
        URL.revokeObjectURL(url);
        var side = maxSide, q = quality, out = '';
        for(var i = 0; i < 6; i++){
          var r = Math.min(1, side / Math.max(img.width, img.height));
          var c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.width * r)); c.height = Math.max(1, Math.round(img.height * r));
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          out = c.toDataURL('image/jpeg', q);
          if(out.length <= 700000) return resolve(out);
          if(q > 0.6) q -= 0.1; else side = Math.round(side * 0.8);
        }
        reject(new Error('Photo trop lourde, essayez-en une autre.'));
      };
      img.onerror = function(){ URL.revokeObjectURL(url); reject(new Error('Photo illisible (format non pris en charge ?).')); };
      img.src = url;
    });
  };
})();

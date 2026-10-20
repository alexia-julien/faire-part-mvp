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
      rsvp: { guests: true, diet: true, brunch: false, message: true }
    };
  };

  FP.eventDate = function(cfg){
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cfg.date || '');
    if(!m) return null;
    var t = /^(\d{2}):(\d{2})$/.exec(cfg.time || '') || [0, '16', '00'];
    return new Date(+m[1], +m[2] - 1, +m[3], +t[1], +t[2], 0);
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
    var u = safeHttps(cfg.mapsUrl);
    if(u) return u;
    var q = [cfg.venueName, cfg.venueAddress].join(' ').trim();
    return q ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q) : '';
  };

  function icsStamp(d){
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00';
  }
  function icsEsc(s){ return String(s).replace(/[\\;,]/g, '\\$&').replace(/\r?\n/g, '\\n'); }
  function downloadIcs(cfg){
    var start = FP.eventDate(cfg); if(!start) return;
    var end = new Date(start.getTime() + 6 * 3600 * 1000);
    var title = 'Mariage de ' + (cfg.partner1 || '') + ' & ' + (cfg.partner2 || '');
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Faire-part//FR', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      'UID:' + start.getTime() + '@faire-part', 'DTSTAMP:' + icsStamp(new Date()),
      'DTSTART:' + icsStamp(start), 'DTEND:' + icsStamp(end),
      'SUMMARY:' + icsEsc(title), 'LOCATION:' + icsEsc([cfg.venueName, cfg.venueAddress].filter(Boolean).join(', ')),
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
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
    h += '<div class="field"><span class="lab">Serez-vous présent(e) ?</span><div class="choices">' +
         '<label><input type="radio" name="attendance" value="yes"> Oui, avec plaisir</label>' +
         '<label><input type="radio" name="attendance" value="no"> Je ne pourrai pas</label></div></div>';
    if(r.guests) h += '<div class="field when-yes"><label for="f-guests">Nombre de personnes (vous inclus)</label><input type="number" id="f-guests" name="guests" min="1" max="20" value="1"></div>';
    if(r.brunch) h += '<div class="field when-yes"><span class="lab">Brunch du lendemain ?</span><div class="choices">' +
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
    var d = FP.defaults();
    cfg = Object.assign(d, cfg || {});
    cfg.rsvp = Object.assign(d.rsvp, (cfg.rsvp || {}));
    if(timer){ clearInterval(timer); timer = null; }

    var photos = (cfg.photos || []).map(safeImg).filter(Boolean);
    var theme = ['sauge', 'rose', 'nuit'].indexOf(cfg.theme) > -1 ? cfg.theme : 'sauge';
    root.className = 'fp' + (photos.length ? '' : ' no-photo');
    root.setAttribute('data-theme', theme);

    var p1 = esc(cfg.partner1 || 'Prénom'), p2 = esc(cfg.partner2 || 'Prénom');
    var names = p1 + '&nbsp;<span class="amp">&amp;</span>&nbsp;' + p2;
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
    h += '<div class="form-wrap">' + rsvpHtml(cfg, !!opts.preview) + '</div></section>';

    h += '<footer>' + divider() + '<div class="fnames">' + names + '</div>' + (dateLong ? '<div class="fdate">' + esc(dateLong) + '</div>' : '') + '</footer>';

    root.innerHTML = h;
    bindRsvp(root, opts);

    var ics = root.querySelector('[data-ics]');
    if(ics) ics.addEventListener('click', function(){ downloadIcs(cfg); });

    if(hasDate){
      var target = FP.eventDate(cfg).getTime();
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
  FP.resizeImage = function(file, maxSide, quality){
    maxSide = maxSide || 1600; quality = quality || 0.82;
    return new Promise(function(resolve, reject){
      if(!/^image\//.test(file.type)) return reject(new Error('Fichier non image'));
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function(){
        var r = Math.min(1, maxSide / Math.max(img.width, img.height));
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = function(){ URL.revokeObjectURL(url); reject(new Error('Image illisible (format non pris en charge ?)')); };
      img.src = url;
    });
  };
})();

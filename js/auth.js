// Comptes : connexion par code reçu par email ou par Google (Supabase Auth, appelé directement, sans bibliothèque).
// Google passe par le bouton officiel de Google (Google Identity Services), ouvert depuis maison-meli.com : Google renvoie un
// jeton d'identité que Supabase vérifie. Pas de redirection par supabase.co, donc Google affiche « Maison Meli » à l'utilisateur.
// Sans configuration Supabase (mode local, pour développer et tester) : un faux service accepte le code 123456.
// La session vit dans le stockage du navigateur ; le serveur vérifie le jeton à chaque appel (js/api.js).
(function(){
  'use strict';
  var FP = window.FP = window.FP || {};
  var C = window.FP_CONFIG || {};
  var remote = !!(C.supabaseUrl && C.supabaseKey);
  var BASE = remote ? C.supabaseUrl.replace(/\/$/, '') + '/auth/v1' : '';
  var KEY = 'fp:session', EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@.]{2,24}$/;

  function read(){
    try{
      var s = JSON.parse(localStorage.getItem(KEY) || 'null');
      return s && typeof s.access_token === 'string' && typeof s.refresh_token === 'string' && s.user && typeof s.user.id === 'string' ? s : null;
    }catch(e){ return null; }
  }
  function write(s){ try{ if(s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY); }catch(e){} }
  // Contenu du jeton, lu pour l'affichage uniquement (identifiant, email, expiration) : la vérification est faite par le serveur.
  function claims(jwt){
    try{
      var p = String(jwt).split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(decodeURIComponent(Array.prototype.map.call(atob(p), function(c){ return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2); }).join('')));
    }catch(e){ return null; }
  }
  function store(t){
    if(!t || typeof t.access_token !== 'string' || typeof t.refresh_token !== 'string') return null;
    var c = claims(t.access_token) || {};
    var user = { id: String((t.user && t.user.id) || c.sub || ''), email: String((t.user && t.user.email) || c.email || '').slice(0, 320) };
    if(!user.id || c.is_anonymous) return null;
    var s = { access_token: t.access_token, refresh_token: t.refresh_token, user: user,
              expires_at: Number(t.expires_at) || Number(c.exp) || Math.floor(Date.now() / 1000) + (Number(t.expires_in) || 3600) };
    write(s); return s;
  }
  function call(path, body, token){
    return fetch(BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: C.supabaseKey, Authorization: 'Bearer ' + (token || C.supabaseKey) },
      body: JSON.stringify(body || {})
    }).then(function(r){
      return r.text().then(function(t){
        var b = null; try{ b = t ? JSON.parse(t) : null; }catch(e){}
        if(!r.ok){
          var err = new Error((b && (b.msg || b.message || b.error_description || b.error)) || ('HTTP ' + r.status));
          err.status = r.status; err.code = String((b && (b.error_code || b.code)) || '');
          throw err;
        }
        return b;
      });
    });
  }

  // Retour d'une connexion par redirection (Google, ou lien cliqué dans l'email) : les jetons arrivent dans le fragment
  // de l'adresse. On les range puis on nettoie l'adresse, avant que le reste de la page ne lise le fragment.
  var justSignedIn = false, redirectError = '';
  (function(){
    var h = new URLSearchParams(location.hash.slice(1));
    if(!h.get('access_token') && !h.get('error') && !h.get('error_description')) return;
    if(remote && h.get('access_token') && h.get('refresh_token')){
      justSignedIn = !!store({ access_token: h.get('access_token'), refresh_token: h.get('refresh_token'), expires_at: h.get('expires_at'), expires_in: h.get('expires_in') });
    } else if(h.get('error') || h.get('error_description')){
      redirectError = /expired|invalid/i.test(h.get('error_code') || h.get('error_description') || '')
        ? 'Ce lien de connexion a expiré ou a déjà servi. Demandez un nouveau code.' : 'La connexion n’a pas abouti. Réessayez.';
    }
    try{ history.replaceState(null, '', location.pathname + location.search); }catch(e){ location.hash = ''; }
  })();

  var refreshing = null;
  function fresh(){
    var s = read();
    if(!s) return Promise.resolve(null);
    if(!remote || s.expires_at - Date.now() / 1000 > 60) return Promise.resolve(s.access_token);
    if(!refreshing){
      refreshing = call('/token?grant_type=refresh_token', { refresh_token: s.refresh_token }).then(function(t){
        var n = store(t); return n ? n.access_token : null;
      }, function(e){
        if(e && e.status >= 400 && e.status < 500){ write(null); return null; }   // session révoquée ou expirée : on est déconnecté
        return s.expires_at > Date.now() / 1000 ? s.access_token : null;           // panne réseau : le jeton actuel sert encore s'il est valide
      }).then(function(v){ refreshing = null; return v; });
    }
    return refreshing;
  }

  function fail(msg){ return Promise.reject(new Error(msg)); }
  function friendly(e){
    var m = String((e && e.message) || ''), code = String((e && e.code) || '');
    if(e && e.status === 429 || /rate limit|security purposes/i.test(m)) return 'Trop de demandes en peu de temps. Patientez une minute puis réessayez.';
    if(/otp_expired|expired|invalid/i.test(code + ' ' + m) && /otp|token|code/i.test(code + ' ' + m)) return 'Ce code est incorrect ou a expiré. Vérifiez-le ou demandez-en un nouveau.';
    if(/not_authorized|not authorized/i.test(code + ' ' + m)) return 'L’envoi d’emails n’est pas encore activé pour cette adresse.';
    if(/signup|disabled/i.test(code + ' ' + m)) return 'La création de compte est momentanément indisponible.';
    return 'La connexion a échoué. Vérifiez votre connexion internet et réessayez.';
  }

  var localPending = '';
  function localUser(email){ return { id: 'local-' + email.toLowerCase().replace(/[^a-z0-9]+/g, '-'), email: email }; }
  FP.auth = {
    justSignedIn: justSignedIn,
    redirectError: redirectError,
    user: function(){ var s = read(); return s ? { id: s.user.id, email: s.user.email } : null; },
    token: fresh,
    drop: function(){ write(null); },
    validEmail: function(v){ return EMAIL_RE.test(String(v || '').trim()); },
    // Envoie un code à 6 chiffres (l'email contient aussi un lien, qui ramène sur returnTo). Crée le compte s'il n'existe pas.
    sendCode: function(email, returnTo){
      email = String(email || '').trim();
      if(!EMAIL_RE.test(email)) return fail('Cette adresse email ne semble pas valide.');
      if(!remote){ localPending = email; return Promise.resolve(); }
      return call('/otp?redirect_to=' + encodeURIComponent(returnTo || location.href.split('#')[0]), { email: email, create_user: true })
        .then(function(){}, function(e){ throw new Error(friendly(e)); });
    },
    verifyCode: function(email, code){
      email = String(email || '').trim(); code = String(code || '').replace(/\s+/g, '');
      if(!/^[0-9]{6,10}$/.test(code)) return fail('Le code est composé de chiffres uniquement (6 en général).');
      if(!remote){
        if(code !== '123456' || email !== localPending) return fail('Ce code est incorrect ou a expiré. Vérifiez-le ou demandez-en un nouveau.');
        var u = localUser(email); write({ access_token: 'local.' + u.id, refresh_token: 'local', expires_at: 4102444800, user: u });
        return Promise.resolve(u);
      }
      return call('/verify', { type: 'email', email: email, token: code }).then(function(t){
        var s = store(t); if(!s) throw new Error('La connexion a échoué. Réessayez.');
        return { id: s.user.id, email: s.user.email };
      }, function(e){ throw new Error(friendly(e)); });
    },
    // Échange le jeton d'identité Google contre une session Supabase. nonce : la valeur brute dont l'empreinte a été donnée à Google.
    googleIdToken: function(idToken, nonce){
      if(!remote){ var u = localUser('google.demo@example.com'); write({ access_token: 'local.' + u.id, refresh_token: 'local', expires_at: 4102444800, user: u }); return Promise.resolve(u); }
      return call('/token?grant_type=id_token', { provider: 'google', id_token: idToken, nonce: nonce }).then(function(t){
        var s = store(t); if(!s) throw new Error('La connexion avec Google a échoué. Réessayez ou utilisez le code par email.');
        return { id: s.user.id, email: s.user.email };
      }, function(e){ throw new Error(e && e.status === 429 ? friendly(e) : 'La connexion avec Google a échoué. Réessayez ou utilisez le code par email.'); });
    },
    signOut: function(){
      var s = read(); write(null);
      if(!remote || !s) return Promise.resolve();
      return call('/logout?scope=local', {}, s.access_token).then(function(){}, function(){});
    }
  };

  // Bouton officiel Google, chargé à la demande (script de Google, autorisé par la CSP des pages concernées).
  var gsi = null;
  function loadGsi(){
    if(gsi) return gsi;
    gsi = new Promise(function(ok, ko){
      if(window.google && google.accounts && google.accounts.id) return ok();
      var s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
      s.onload = function(){ ok(); }; s.onerror = function(){ gsi = null; ko(new Error('gsi')); };
      document.head.appendChild(s);
    });
    return gsi;
  }
  function sha256hex(str){
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function(b){
      return Array.prototype.map.call(new Uint8Array(b), function(x){ return ('0' + x.toString(16)).slice(-2); }).join('');
    });
  }
  function randomNonce(){ var a = new Uint8Array(24); crypto.getRandomValues(a); return Array.prototype.map.call(a, function(x){ return ('0' + x.toString(16)).slice(-2); }).join(''); }
  // Affiche le bouton Google dans holder ; onToken(idToken, nonceBrut) à la connexion, onFail() s'il ne peut pas s'afficher.
  function googleButton(holder, onToken, onFail){
    if(!remote || !C.googleClientId){ // mode local : faux bouton, connexion de démonstration
      var b = document.createElement('button'); b.type = 'button'; b.className = 'btn-ghost auth-google'; b.textContent = 'Continuer avec Google';
      b.addEventListener('click', function(){ onToken('local', 'local'); });
      holder.appendChild(b); return;
    }
    var raw = randomNonce();
    Promise.all([loadGsi(), sha256hex(raw)]).then(function(r){
      google.accounts.id.initialize({
        client_id: C.googleClientId, nonce: r[1], ux_mode: 'popup', auto_select: false,
        itp_support: true, use_fedcm_for_button: true,
        callback: function(resp){ if(resp && resp.credential) onToken(resp.credential, raw); }
      });
      google.accounts.id.renderButton(holder, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with',
        shape: 'pill', logo_alignment: 'center', locale: 'fr', width: Math.min(400, Math.max(200, holder.clientWidth || 320)) });
    }).catch(function(){ onFail(); });
  }

  // ---------- Panneau de connexion (éditeur au moment de publier, page « Mon faire-part ») ----------
  // opts : { title, text, returnTo, onSignedIn(user) }. Tout le contenu est créé avec textContent (jamais de HTML injecté).
  FP.authPanel = function(box, opts){
    opts = opts || {};
    function el(tag, cls, text){ var e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; return e; }
    box.textContent = ''; box.classList.add('auth');
    var h = el('h2', null, opts.title || 'Connexion'); h.tabIndex = -1; box.appendChild(h);
    if(opts.text) box.appendChild(el('p', 'muted', opts.text));
    var g = el('div', 'auth-google-holder'); box.appendChild(g);
    var or = el('p', 'auth-or', 'ou'); box.appendChild(or);

    var f1 = el('form', 'auth-form'); f1.noValidate = true;
    var l1 = el('label', null, 'Votre adresse email'); var email = el('input'); email.type = 'email'; email.id = 'auth-email';
    email.autocomplete = 'email'; email.inputMode = 'email'; email.maxLength = 320; email.placeholder = 'prenom@exemple.fr'; l1.htmlFor = 'auth-email';
    var b1 = el('button', 'btn-main', 'Recevoir mon code'); b1.type = 'submit';
    f1.appendChild(l1); f1.appendChild(email); f1.appendChild(b1);
    f1.appendChild(el('p', 'auth-hint', 'Pas de mot de passe : nous vous envoyons un code à 6 chiffres. Si vous n’avez pas encore de compte, il est créé à ce moment-là.'));
    box.appendChild(f1);

    var f2 = el('form', 'auth-form'); f2.noValidate = true; f2.hidden = true;
    var sent = el('p', 'auth-sent'); f2.appendChild(sent);
    var l2 = el('label', null, 'Code reçu par email'); var code = el('input'); code.type = 'text'; code.id = 'auth-code'; l2.htmlFor = 'auth-code';
    code.autocomplete = 'one-time-code'; code.inputMode = 'numeric'; code.maxLength = 12; code.placeholder = '123456';
    var b2 = el('button', 'btn-main', 'Valider'); b2.type = 'submit';
    var again = el('button', 'link-btn', 'Changer d’adresse ou renvoyer un code'); again.type = 'button';
    f2.appendChild(l2); f2.appendChild(code); f2.appendChild(b2);
    f2.appendChild(el('p', 'auth-hint', 'Rien reçu ? Regardez dans les courriers indésirables. Le lien contenu dans l’email fonctionne aussi.'));
    var pa = el('p'); pa.appendChild(again); f2.appendChild(pa);
    box.appendChild(f2);

    var msg = el('p', 'form-msg'); msg.setAttribute('role', 'alert'); box.appendChild(msg);
    if(FP.auth.redirectError){ msg.textContent = FP.auth.redirectError; FP.auth.redirectError = ''; }

    var busy = false;
    function lock(v){ busy = v; b1.disabled = b2.disabled = v; g.classList.toggle('busy', v); }
    googleButton(g, function(idToken, nonce){
      if(busy) return;
      msg.textContent = ''; lock(true);
      FP.auth.googleIdToken(idToken, nonce).then(function(u){
        lock(false); if(typeof opts.onSignedIn === 'function') opts.onSignedIn(u);
      }, function(err){ lock(false); msg.textContent = err.message; });
    }, function(){
      g.hidden = true; or.hidden = true;
    });
    f1.addEventListener('submit', function(e){
      e.preventDefault(); if(busy) return;
      msg.textContent = ''; lock(true);
      FP.auth.sendCode(email.value, opts.returnTo).then(function(){
        lock(false); f1.hidden = true; f2.hidden = false;
        sent.textContent = 'Code envoyé à ' + email.value.trim() + '.'; code.value = ''; code.focus();
      }, function(err){ lock(false); msg.textContent = err.message; email.focus(); });
    });
    f2.addEventListener('submit', function(e){
      e.preventDefault(); if(busy) return;
      msg.textContent = ''; lock(true);
      FP.auth.verifyCode(email.value, code.value).then(function(u){
        lock(false); if(typeof opts.onSignedIn === 'function') opts.onSignedIn(u);
      }, function(err){ lock(false); msg.textContent = err.message; code.focus(); code.select(); });
    });
    again.addEventListener('click', function(){ msg.textContent = ''; f2.hidden = true; f1.hidden = false; email.focus(); });
    return { focus: function(){ h.focus(); } };
  };
})();

// Accès aux données : Supabase (fonctions RPC) ou, sans config, stockage local du navigateur.
// Même interface dans les deux cas, donc le reste du code ne change pas.
//   * Invités (sans compte) : getInvitation, submitRsvp.
//   * Compte connecté (js/auth.js) : monFaire-part… Chaque compte a AU PLUS un faire-part ; le serveur sait lequel
//     d'après le jeton de session, il n'y a donc ni identifiant ni clé à fournir.
(function(){
  'use strict';
  var FP = window.FP = window.FP || {};
  var C = window.FP_CONFIG || {};
  var remote = !!(C.supabaseUrl && C.supabaseKey);
  FP.isRemote = remote;

  function signedOut(){ var e = new Error('signed out'); e.signedOut = true; return e; }
  function post(fn, args, token){
    return fetch(C.supabaseUrl.replace(/\/$/, '') + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: C.supabaseKey, Authorization: 'Bearer ' + (token || C.supabaseKey) },
      body: JSON.stringify(args || {})
    }).then(function(r){
      return r.text().then(function(t){
        var body = null; try{ body = t ? JSON.parse(t) : null; }catch(e){}
        if(!r.ok){
          var err = new Error((body && body.message) || ('HTTP ' + r.status));
          err.conflict = r.status === 409 || (body && body.code === '23505');
          err.forbidden = r.status === 401 || r.status === 403 || (body && body.code === '42501');
          err.onePerAccount = /one per account/i.test(err.message);
          throw err;
        }
        return body;
      });
    });
  }
  // Appel public (invités) : toujours avec la clé publique, jamais avec la session.
  function rpc(fn, args){ return post(fn, args, null); }
  // Appel réservé au compte connecté. Session absente, expirée ou refusée par le serveur : erreur « signedOut ».
  function arpc(fn, args){
    return FP.auth.token().then(function(tok){
      if(!tok) throw signedOut();
      return post(fn, args, tok).catch(function(e){
        if(e && e.forbidden && !e.onePerAccount){ FP.auth.drop(); throw signedOut(); }
        throw e;
      });
    });
  }

  // --- Mode local : db = { inv: { <slug>: { owner, config, created_at, updated_at } }, rsvps: { <slug>: [...] } } ---
  var DB_KEY = 'fp:db';
  function load(){ try{ return JSON.parse(localStorage.getItem(DB_KEY)) || { inv: {}, rsvps: {} }; }catch(e){ return { inv: {}, rsvps: {} }; } }
  function save(db){
    try{ localStorage.setItem(DB_KEY, JSON.stringify(db)); }
    catch(e){ throw new Error('Stockage local plein (essayez avec moins de photos).'); }
  }
  function me(){ var u = FP.auth.user(); return u ? u.id : ''; }
  function mySlug(db){ var id = me(); return Object.keys(db.inv).filter(function(s){ return id && db.inv[s].owner === id; })[0] || ''; }
  function asAccount(fn){ // exécute fn(db, slugDuCompte) si quelqu'un est connecté ; enregistre si fn renvoie { save: true, value }
    if(!me()) return Promise.reject(signedOut());
    try{
      var db = load(), out = fn(db, mySlug(db));
      if(out && out.save) save(db);
      return Promise.resolve(out ? out.value : undefined);
    }catch(e){ return Promise.reject(e); }
  }
  var local = {
    getInvitation: function(slug){ var i = load().inv[slug]; return Promise.resolve(i ? i.config : null); },
    submitRsvp: function(slug, data){
      var db = load();
      if(!db.inv[slug]) return Promise.reject(new Error('introuvable'));
      db.rsvps[slug] = db.rsvps[slug] || [];
      var maxId = db.rsvps[slug].reduce(function(m, r){ return Math.max(m, +r.id || 0); }, 0);
      db.rsvps[slug].push({ id: maxId + 1, created_at: new Date().toISOString(), data: data });
      try{ save(db); }catch(e){ return Promise.reject(e); }
      return Promise.resolve();
    },
    myInvitation: function(){
      return asAccount(function(db, slug){
        if(!slug) return { value: null };
        var i = db.inv[slug], rs = db.rsvps[slug] || [];
        return { value: { slug: slug, config: i.config, created_at: i.created_at, updated_at: i.updated_at, responses: rs.length,
                          last_response: rs.length ? rs[rs.length - 1].created_at : null } };
      });
    },
    createInvitation: function(slug, config){
      return asAccount(function(db, mine){
        var e;
        if(mine){ e = new Error('one per account'); e.onePerAccount = true; throw e; }
        if(db.inv[slug]){ e = new Error('slug pris'); e.conflict = true; throw e; }
        var now = new Date().toISOString();
        db.inv[slug] = { owner: me(), config: config, created_at: now, updated_at: now }; db.rsvps[slug] = [];
        return { save: true };
      });
    },
    updateInvitation: function(config){
      return asAccount(function(db, slug){
        if(!slug) throw new Error('aucun faire-part');
        db.inv[slug].config = config; db.inv[slug].updated_at = new Date().toISOString();
        return { save: true };
      });
    },
    deleteInvitation: function(){
      return asAccount(function(db, slug){
        if(!slug) return { value: false };
        delete db.inv[slug]; delete db.rsvps[slug];
        return { save: true, value: true };
      });
    },
    listRsvps: function(){ return asAccount(function(db, slug){ return { value: slug ? (db.rsvps[slug] || []) : null }; }); },
    deleteRsvp: function(id){
      return asAccount(function(db, slug){
        if(!slug) throw new Error('aucun faire-part');
        db.rsvps[slug] = (db.rsvps[slug] || []).filter(function(r){ return r.id !== id; });
        return { save: true };
      });
    },
    deleteAccount: function(){
      return asAccount(function(db, slug){
        if(slug){ delete db.inv[slug]; delete db.rsvps[slug]; }
        return { save: true };
      }).then(function(){ FP.auth.drop(); });
    }
  };

  // --- Mode Supabase (voir supabase/comptes.sql) ---
  var supa = {
    getInvitation: function(slug){ return rpc('get_invitation', { p_slug: slug }); },
    submitRsvp: function(slug, data){ return rpc('submit_rsvp', { p_slug: slug, p_data: data }).then(function(){}); },
    myInvitation: function(){ return arpc('account_invitation', {}).then(function(v){ return v && typeof v === 'object' && typeof v.slug === 'string' ? v : null; }); },
    createInvitation: function(slug, config){ return arpc('account_create_invitation', { p_slug: slug, p_config: config }).then(function(){}); },
    updateInvitation: function(config){
      return arpc('account_update_invitation', { p_config: config }).then(function(ok){ if(!ok) throw new Error('aucun faire-part'); });
    },
    deleteInvitation: function(){ return arpc('account_delete_invitation', {}).then(function(ok){ return !!ok; }); },
    listRsvps: function(){ return arpc('account_rsvps', {}); },
    deleteRsvp: function(id){ return arpc('account_delete_rsvp', { p_id: id }).then(function(){}); },
    deleteAccount: function(){ return arpc('delete_account', {}).then(function(){ FP.auth.drop(); }); }
  };

  FP.api = remote ? supa : local;

  // Ménage : les anciens liens privés et espaces testeurs n'existent plus (tout passe par le compte).
  try{ ['fp:mine', 'fp:last', 'fp:tester'].forEach(function(k){ localStorage.removeItem(k); }); }catch(e){}

  // Utilitaires partagés
  // Alphabet de exactement 32 caractères (sans 0/o/1/l) : 256 est divisible par 32, donc aucun biais statistique.
  FP.randomKey = function(n){
    var chars = 'abcdefghijkmnpqrstuvwxyz23456789', a = new Uint8Array(n), s = '';
    crypto.getRandomValues(a);
    for(var i = 0; i < n; i++) s += chars[a[i] & 31];
    return s;
  };
  FP.slugify = function(s){
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  };
  // Identifiant du faire-part lu dans l'URL, validé (format strict) avant toute utilisation.
  FP.params = function(){
    var slug = new URLSearchParams(location.search).get('f') || (/\/f\/([a-z0-9-]+)/.exec(location.pathname) || [])[1] || '';
    return { slug: /^[a-z0-9][a-z0-9-]{2,62}$/.test(slug) ? slug : '' };
  };
  FP.publicLink = function(slug){ var u = new URL('invitation.html', location.href); u.search = '?f=' + encodeURIComponent(slug); u.hash = ''; return u.href; };

  // Messages d'erreur affichables : jamais le texte brut renvoyé par le serveur (peut révéler des détails internes).
  FP.userError = function(e){
    var m = String((e && e.message) || '');
    if(e && e.signedOut) return 'Votre session a expiré : reconnectez-vous pour continuer.';
    if(e && e.onePerAccount) return 'Ce compte a déjà un faire-part.';
    if(/rate limit/i.test(m)) return 'Trop de tentatives en peu de temps. Réessayez dans une heure.';
    if(/too large|trop/i.test(m)) return 'Le faire-part est trop volumineux : essayez avec des photos plus légères.';
    if(/Stockage local plein/.test(m)) return m;
    return 'L’opération a échoué. Vérifiez votre connexion et réessayez.';
  };
})();

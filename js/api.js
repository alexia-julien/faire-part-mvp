// Accès aux données : Supabase (fonctions RPC) ou, sans config, stockage local du navigateur.
// Même interface dans les deux cas, donc le reste du code ne change pas.
(function(){
  'use strict';
  var FP = window.FP = window.FP || {};
  var C = window.FP_CONFIG || {};
  var remote = !!(C.supabaseUrl && C.supabaseKey);
  FP.isRemote = remote;

  function rpc(fn, args){
    return fetch(C.supabaseUrl.replace(/\/$/, '') + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: C.supabaseKey, Authorization: 'Bearer ' + C.supabaseKey },
      body: JSON.stringify(args)
    }).then(function(r){
      return r.text().then(function(t){
        var body = null; try{ body = t ? JSON.parse(t) : null; }catch(e){}
        if(!r.ok){
          var err = new Error((body && body.message) || ('HTTP ' + r.status));
          err.conflict = r.status === 409 || (body && body.code === '23505');
          err.forbidden = r.status === 403 || (body && body.code === '42501');
          err.missing = r.status === 404 || (body && body.code === 'PGRST202'); // fonction SQL pas encore déployée
          throw err;
        }
        return body;
      });
    });
  }

  // --- Mode local ---
  var DB_KEY = 'fp:db';
  function load(){ try{ return JSON.parse(localStorage.getItem(DB_KEY)) || { inv: {}, rsvps: {} }; }catch(e){ return { inv: {}, rsvps: {} }; } }
  function save(db){
    try{ localStorage.setItem(DB_KEY, JSON.stringify(db)); }
    catch(e){ throw new Error('Stockage local plein (essayez avec moins de photos).'); }
  }
  var local = {
    createInvitation: function(slug, key, config){
      var db = load();
      if(db.inv[slug]){ var e = new Error('slug pris'); e.conflict = true; return Promise.reject(e); }
      db.inv[slug] = { key: key, config: config }; db.rsvps[slug] = [];
      try{ save(db); }catch(e){ return Promise.reject(e); }
      return Promise.resolve();
    },
    updateInvitation: function(slug, key, config){
      var db = load(), i = db.inv[slug];
      if(!i || i.key !== key){ var e = new Error('forbidden'); e.forbidden = true; return Promise.reject(e); }
      i.config = config;
      try{ save(db); }catch(e){ return Promise.reject(e); }
      return Promise.resolve();
    },
    getInvitation: function(slug){ var i = load().inv[slug]; return Promise.resolve(i ? i.config : null); },
    submitRsvp: function(slug, data){
      var db = load();
      if(!db.inv[slug]) return Promise.reject(new Error('introuvable'));
      var maxId = db.rsvps[slug].reduce(function(m, r){ return Math.max(m, +r.id || 0); }, 0);
      db.rsvps[slug].push({ id: maxId + 1, created_at: new Date().toISOString(), data: data });
      try{ save(db); }catch(e){ return Promise.reject(e); }
      return Promise.resolve();
    },
    listRsvps: function(slug, key){
      var i = load().inv[slug];
      if(!i || i.key !== key){ var e = new Error('forbidden'); e.forbidden = true; return Promise.reject(e); }
      return Promise.resolve(load().rsvps[slug] || []);
    },
    deleteRsvp: function(slug, key, id){
      var db = load(), i = db.inv[slug];
      if(!i || i.key !== key){ var e = new Error('forbidden'); e.forbidden = true; return Promise.reject(e); }
      db.rsvps[slug] = (db.rsvps[slug] || []).filter(function(r){ return r.id !== id; });
      try{ save(db); }catch(e){ return Promise.reject(e); }
      return Promise.resolve();
    },
    summarize: function(items){
      var db = load();
      return Promise.resolve(items.map(function(it){
        var i = db.inv[it.slug];
        if(!i || i.key !== it.key) return { slug: it.slug, invalid: true };
        var rs = db.rsvps[it.slug] || [], c = i.config || {};
        return { slug: it.slug, partner1: c.partner1, partner2: c.partner2, date: c.date, theme: c.theme, responses: rs.length,
                 last_response: rs.length ? rs[rs.length - 1].created_at : null };
      }));
    },
    // Espaces testeurs : en local, db.testers = { <jeton>: { name, disabled, items: { <slug>: <clé> } } } (créés à la main / par les tests).
    testerWorkspace: function(token){
      var t = (load().testers || {})[token];
      if(!t || t.disabled) return Promise.resolve(null);
      return Promise.resolve({ name: t.name, items: Object.keys(t.items || {}).map(function(s){ return { slug: s, key: t.items[s] }; }) });
    },
    testerAttach: function(token, slug, key){
      var db = load(), t = (db.testers || {})[token], i = db.inv[slug];
      if(!t || t.disabled || !i || i.key !== key){ var e = new Error('forbidden'); e.forbidden = true; return Promise.reject(e); }
      t.items = t.items || {}; t.items[slug] = key;
      try{ save(db); }catch(e){ return Promise.reject(e); }
      return Promise.resolve();
    },
    testerDetach: function(token, slug){
      var db = load(), t = (db.testers || {})[token];
      if(!t || t.disabled){ var e = new Error('forbidden'); e.forbidden = true; return Promise.reject(e); }
      if(t.items) delete t.items[slug];
      try{ save(db); }catch(e){ return Promise.reject(e); }
      return Promise.resolve();
    }
  };

  // --- Mode Supabase ---
  var supa = {
    createInvitation: function(slug, key, config){ return rpc('create_invitation', { p_slug: slug, p_key: key, p_config: config }).then(function(){}); },
    updateInvitation: function(slug, key, config){
      return rpc('update_invitation', { p_slug: slug, p_key: key, p_config: config }).then(function(ok){
        if(!ok){ var e = new Error('forbidden'); e.forbidden = true; throw e; }
      });
    },
    getInvitation: function(slug){ return rpc('get_invitation', { p_slug: slug }); },
    submitRsvp: function(slug, data){ return rpc('submit_rsvp', { p_slug: slug, p_data: data }).then(function(){}); },
    // Le serveur renvoie null (et non une erreur) quand la clé est mauvaise.
    listRsvps: function(slug, key){
      return rpc('list_rsvps', { p_slug: slug, p_key: key }).then(function(r){
        if(r === null){ var e = new Error('forbidden'); e.forbidden = true; throw e; }
        return r;
      });
    },
    deleteRsvp: function(slug, key, id){
      return rpc('delete_rsvp', { p_slug: slug, p_key: key, p_id: id }).then(function(ok){
        if(!ok){ var e = new Error('forbidden'); e.forbidden = true; throw e; }
      });
    },
    // Résumé de la liste « Mes faire-part » en UN appel (summarize_invitations, chaque clé vérifiée côté serveur) :
    // un espace testeur peut contenir des dizaines de faire-part. Si la fonction n'est pas déployée, on se rabat sur
    // get_invitation + list_rsvps, faire-part par faire-part.
    summarize: function(items){
      return rpc('summarize_invitations', { p_items: items }).then(function(list){
        if(!Array.isArray(list)) throw new Error('invalid');
        return list;
      }).catch(function(e){
        if(e && /rate limit/i.test(e.message)) throw e;
        return supa.summarizeEach(items);
      });
    },
    summarizeEach: function(items){
      return Promise.all(items.map(function(it){
        return Promise.all([supa.getInvitation(it.slug), supa.listRsvps(it.slug, it.key)]).then(function(res){
          var c = res[0], rs = res[1];
          if(!c || !Array.isArray(rs)) return { slug: it.slug, invalid: true };
          var last = rs.reduce(function(m, r){ return r && r.created_at > m ? r.created_at : m; }, '');
          return { slug: it.slug, partner1: c.partner1, partner2: c.partner2, date: c.date, theme: c.theme,
                   responses: rs.length, last_response: last || null };
        }, function(e){
          return e && e.forbidden ? { slug: it.slug, invalid: true } : { slug: it.slug, responses: null };
        });
      }));
    },
    // Espaces testeurs. Le serveur renvoie null / false (et non une erreur) quand le jeton ou la clé est mauvais.
    testerWorkspace: function(token){ return rpc('tester_workspace', { p_token: token }); },
    testerAttach: function(token, slug, key){
      return rpc('tester_attach', { p_token: token, p_slug: slug, p_key: key }).then(function(ok){
        if(!ok){ var e = new Error('forbidden'); e.forbidden = true; throw e; }
      });
    },
    testerDetach: function(token, slug){
      return rpc('tester_detach', { p_token: token, p_slug: slug }).then(function(ok){
        if(!ok){ var e = new Error('forbidden'); e.forbidden = true; throw e; }
      });
    }
  };

  FP.api = remote ? supa : local;

  // ---------- « Mes faire-part » : la liste des faire-part gérés depuis CE navigateur (pas de compte) ----------
  var MINE_KEY = 'fp:mine', SLUG_RE = /^[a-z0-9][a-z0-9-]{2,62}$/, KEY_RE = /^[a-z0-9]{16,64}$/;
  function mineRead(){
    var list = [];
    try{ list = JSON.parse(localStorage.getItem(MINE_KEY) || '[]'); }catch(e){}
    list = Array.isArray(list) ? list.filter(function(x){ return x && SLUG_RE.test(x.slug) && KEY_RE.test(x.key); }) : [];
    // Reprise de l'ancien format (un seul « dernier faire-part publié »)
    try{
      var last = JSON.parse(localStorage.getItem('fp:last') || 'null');
      if(last && SLUG_RE.test(last.slug || '') && KEY_RE.test(last.key || '') && !list.some(function(x){ return x.slug === last.slug; })){
        list.push({ slug: last.slug, key: last.key, addedAt: new Date().toISOString() });
        localStorage.setItem(MINE_KEY, JSON.stringify(list));
      }
    }catch(e){}
    return list;
  }
  function mineWrite(list){ try{ localStorage.setItem(MINE_KEY, JSON.stringify(list)); return true; }catch(e){ return false; } }
  FP.mine = {
    list: mineRead,
    add: function(slug, key){
      if(!SLUG_RE.test(slug) || !KEY_RE.test(key)) return false;
      var list = mineRead().filter(function(x){ return x.slug !== slug; });
      list.unshift({ slug: slug, key: key, addedAt: new Date().toISOString() });
      return mineWrite(list.slice(0, 100));
    },
    remove: function(slug){
      mineWrite(mineRead().filter(function(x){ return x.slug !== slug; }));
      try{ var last = JSON.parse(localStorage.getItem('fp:last') || 'null'); if(last && last.slug === slug) localStorage.removeItem('fp:last'); }catch(e){}
    }
  };

  // ---------- Espace testeur : lien personnel (admin.html#t=<jeton>) qui retrouve tous les faire-part d'un testeur ----------
  // Le jeton est lu dans le fragment d'URL (jamais envoyé au serveur dans l'adresse), puis mémorisé dans ce navigateur :
  // tout faire-part créé ou ouvert ensuite est rattaché automatiquement à l'espace.
  var TESTER_KEY = 'fp:tester', TOKEN_RE = /^[a-z0-9]{32}$/;
  (function(){
    var t = new URLSearchParams(location.hash.slice(1)).get('t') || '';
    if(TOKEN_RE.test(t)){ try{ localStorage.setItem(TESTER_KEY, t); }catch(e){} }
  })();
  FP.tester = {
    token: function(){ var t = ''; try{ t = localStorage.getItem(TESTER_KEY) || ''; }catch(e){} return TOKEN_RE.test(t) ? t : ''; },
    link: function(){
      var t = FP.tester.token(); if(!t) return '';
      var u = new URL('admin.html', location.href); u.search = ''; u.hash = 't=' + t; return u.href;
    },
    // Rattache un faire-part à l'espace (silencieux : renvoie une promesse qui ne rejette jamais ; true si rattaché).
    attach: function(slug, key){
      var t = FP.tester.token();
      if(!t || !SLUG_RE.test(slug) || !KEY_RE.test(key)) return Promise.resolve(false);
      return FP.api.testerAttach(t, slug, key).then(function(){ return true; }, function(){ return false; });
    },
    forget: function(){ try{ localStorage.removeItem(TESTER_KEY); }catch(e){} }
  };

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
  // Identifiant et clé lus dans l'URL, validés (format strict) avant toute utilisation.
  FP.params = function(){
    var slug = new URLSearchParams(location.search).get('f') || (/\/f\/([a-z0-9-]+)/.exec(location.pathname) || [])[1] || '';
    var key = new URLSearchParams(location.hash.slice(1)).get('k') || '';
    return { slug: /^[a-z0-9][a-z0-9-]{2,62}$/.test(slug) ? slug : '', key: /^[a-z0-9]{16,64}$/.test(key) ? key : '' };
  };

  // Messages d'erreur affichables : jamais le texte brut renvoyé par le serveur (peut révéler des détails internes).
  FP.userError = function(e){
    var m = String((e && e.message) || '');
    if(e && e.forbidden) return 'Le lien privé est invalide.';
    if(/rate limit/i.test(m)) return 'Trop de tentatives en peu de temps. Réessayez dans une heure.';
    if(/too large|trop/i.test(m)) return 'Le faire-part est trop volumineux : essayez avec des photos plus légères.';
    if(/Stockage local plein/.test(m)) return m;
    return 'L’opération a échoué. Vérifiez votre connexion et réessayez.';
  };
})();

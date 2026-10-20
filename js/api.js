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
      db.rsvps[slug].push({ id: Date.now(), created_at: new Date().toISOString(), data: data });
      try{ save(db); }catch(e){ return Promise.reject(e); }
      return Promise.resolve();
    },
    listRsvps: function(slug, key){
      var i = load().inv[slug];
      if(!i || i.key !== key){ var e = new Error('forbidden'); e.forbidden = true; return Promise.reject(e); }
      return Promise.resolve(load().rsvps[slug] || []);
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
    listRsvps: function(slug, key){ return rpc('list_rsvps', { p_slug: slug, p_key: key }); }
  };

  FP.api = remote ? supa : local;

  // Utilitaires partagés
  FP.randomKey = function(n){
    var a = new Uint8Array(n), s = '', chars = 'abcdefghijkmnopqrstuvwxyz23456789';
    crypto.getRandomValues(a);
    for(var i = 0; i < n; i++) s += chars[a[i] % chars.length];
    return s;
  };
  FP.slugify = function(s){
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  };
  FP.params = function(){
    return { slug: new URLSearchParams(location.search).get('f') || (/\/f\/([a-z0-9-]+)/.exec(location.pathname) || [])[1] || '',
             key: new URLSearchParams(location.hash.slice(1)).get('k') || '' };
  };
})();

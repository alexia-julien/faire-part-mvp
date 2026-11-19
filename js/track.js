// Mesure du funnel (PRD : « de la visite au premier RSVP, sans cookie publicitaire »).
// * Aucun cookie, aucun identifiant posé sur l'appareil. Côté serveur, un visiteur = empreinte SHA-256 de son adresse IP
//   (déjà utilisée pour limiter les abus) ; aucune adresse IP n'est stockée en clair.
// * On ne garde que la catégorie de provenance (seo, ia, faire-part…), jamais l'adresse de la page d'origine.
// * Signal « Do Not Track » ou « Global Privacy Control » : aucun événement n'est envoyé depuis le navigateur.
// Les événements serveur (faire-part créé, ouvert, réponse envoyée) sont journalisés par les fonctions SQL (supabase/mesure.sql).
(function(){
  'use strict';
  var FP = window.FP = window.FP || {};
  var C = window.FP_CONFIG || {};
  var remote = !!(C.supabaseUrl && C.supabaseKey);

  var EVENTS = ['landing_view', 'editor_start', 'auth_gate', 'share', 'qr_download', 'cta_create'];
  var SOURCES = ['direct', 'seo', 'ia', 'faire-part', 'reseaux', 'email', 'autre'];
  var CHANNELS = ['natif', 'whatsapp', 'sms', 'email', 'copie'];
  var SRC_KEY = 'fp:src', SRC_DAYS = 30;

  function optedOut(){
    try{ return navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1'; }catch(e){ return false; }
  }
  // Provenance d'après l'adresse de la page précédente (seul le nom de domaine est examiné, rien n'est conservé).
  function fromReferrer(ref){
    var host = '';
    try{ host = new URL(ref).hostname.toLowerCase(); }catch(e){ return 'direct'; }
    if(!host) return 'direct';
    if(host === location.hostname) return '';
    if(/(^|\.)(chatgpt\.com|openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|copilot\.microsoft\.com|mistral\.ai|you\.com|phind\.com)$/.test(host)) return 'ia';
    if(/(^|\.)(mail\.google\.com|outlook\.(live|office)\.com|mail\.yahoo\.com|webmail)/.test(host)) return 'email';
    if(/(^|\.)(google|bing|duckduckgo|qwant|ecosia|yahoo|yandex|brave|startpage|lilo)\.[a-z.]+$/.test(host)) return 'seo';
    if(/(^|\.)(facebook\.com|fb\.com|instagram\.com|pinterest\.[a-z.]+|tiktok\.com|t\.co|twitter\.com|x\.com|linkedin\.com|youtube\.com|reddit\.com|snapchat\.com|threads\.net|whatsapp\.com)$/.test(host)) return 'reseaux';
    return 'autre';
  }
  function fromParam(v){
    v = String(v || '').toLowerCase();
    if(!v) return '';
    if(v === 'faire-part' || v === 'fairepart') return 'faire-part';
    if(SOURCES.indexOf(v) > -1) return v;
    if(/mail|newsletter/.test(v)) return 'email';
    if(/facebook|instagram|pinterest|tiktok|insta|fb|social/.test(v)) return 'reseaux';
    return 'autre';
  }
  // Dernière provenance connue (hors accès direct), gardée 30 jours pour attribuer la publication d'un faire-part.
  function readSrc(){
    try{
      var s = JSON.parse(localStorage.getItem(SRC_KEY) || 'null');
      if(s && SOURCES.indexOf(s.s) > -1 && Date.now() - s.t < SRC_DAYS * 864e5) return s.s;
    }catch(e){}
    return '';
  }
  var current = (function(){
    var q = new URLSearchParams(location.search);
    var s = fromParam(q.get('src') || q.get('utm_source')) || fromReferrer(document.referrer);
    if(s && s !== 'direct'){ try{ localStorage.setItem(SRC_KEY, JSON.stringify({ s: s, t: Date.now() })); }catch(e){} }
    return s;
  })();
  FP.source = function(){ return (current && current !== 'direct' ? current : readSrc()) || 'direct'; };

  var once = {};
  FP.track = function(event, meta, slug){
    if(EVENTS.indexOf(event) < 0 || optedOut()) return;
    var m = {};
    meta = meta || {};
    if(SOURCES.indexOf(meta.src) > -1) m.src = meta.src;
    if(CHANNELS.indexOf(meta.channel) > -1) m.channel = meta.channel;
    if(meta.once){ // une seule fois par onglet pour cet événement
      var k = 'fp:t:' + event;
      try{ if(sessionStorage.getItem(k) || once[k]) return; sessionStorage.setItem(k, '1'); }catch(e){ if(once[k]) return; }
      once[k] = true;
    }
    var s = /^[a-z0-9][a-z0-9-]{2,62}$/.test(slug || '') ? slug : null;
    if(!remote){ // mode local : journal dans le navigateur (utilisé par les tests)
      try{
        var log = JSON.parse(localStorage.getItem('fp:events') || '[]');
        log.push({ event: event, slug: s, meta: m, at: new Date().toISOString() });
        localStorage.setItem('fp:events', JSON.stringify(log.slice(-300)));
      }catch(e){}
      return;
    }
    try{
      fetch(C.supabaseUrl.replace(/\/$/, '') + '/rest/v1/rpc/track', {
        method: 'POST', keepalive: true,
        headers: { 'Content-Type': 'application/json', apikey: C.supabaseKey, Authorization: 'Bearer ' + C.supabaseKey },
        body: JSON.stringify({ p_event: event, p_slug: s, p_meta: m })
      }).catch(function(){});
    }catch(e){}
  };
})();

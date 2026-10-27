// Rendu du faire-part à partir d'une config (page publique ET aperçu de l'onboarding).
// Tout texte saisi par l'utilisateur est échappé ; les URL sont filtrées (https seulement).
(function(){
  'use strict';
  var FP = window.FP = window.FP || {};
  var timer = null, introTimers = [];

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

  // ------------------------------------------------------------------ Catalogue de styles
  FP.PALETTES = [
    { id: 'sauge',      label: 'Sauge',        sw: ['#F6F2EA', '#8C9B7C'] },
    { id: 'rose',       label: 'Rose poudré',  sw: ['#FAF3F0', '#CE968C'] },
    { id: 'terracotta', label: 'Terracotta',   sw: ['#FAF4EE', '#D08B6C'] },
    { id: 'lavande',    label: 'Lavande',      sw: ['#F6F4FA', '#A99BC9'] },
    { id: 'bordeaux',   label: 'Bordeaux',     sw: ['#FAF6F3', '#7A2E3E'] },
    { id: 'riviera',    label: 'Riviera',      sw: ['#F3F7F8', '#7FA8B6'] },
    { id: 'nuit',       label: 'Bleu nuit',    sw: ['#1F2433', '#C9A86A'] },
    { id: 'noir',       label: 'Noir & or',    sw: ['#141414', '#C9A86A'] },
    { id: 'ivoire',     label: 'Ivoire',       sw: ['#FBF8F1', '#C2A468'] },
    { id: 'olive',      label: 'Olivier',      sw: ['#F5F3EA', '#8E8B57'] },
    { id: 'porcelaine', label: 'Porcelaine',   sw: ['#F6F8FB', '#2F4C8C'] },
    { id: 'emeraude',   label: 'Émeraude',     sw: ['#133A31', '#C9A86A'] }
  ];
  // Troisième teinte de chaque palette (nuancier du sélecteur) : la couleur d'encre des titres et boutons.
  var DEEP = { sauge: '#5F6E4E', rose: '#9A5A50', terracotta: '#9A4E33', lavande: '#65558F', bordeaux: '#7A2E3E', riviera: '#3B6876',
    nuit: '#E2C58A', noir: '#E2C58A', ivoire: '#7E6328', olive: '#5B5930', porcelaine: '#2F4C8C', emeraude: '#E2C58A' };
  FP.PALETTES.forEach(function(x){ x.deep = DEEP[x.id]; });
  var GF = 'https://fonts.googleapis.com/css2?display=swap&family=';
  FP.FONTS = [
    { id: 'classique',  label: 'Classique',  url: GF + 'Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Mulish:wght@400;600;700' },
    { id: 'romantique', label: 'Romantique', url: GF + 'Great+Vibes&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Mulish:wght@400;600;700' },
    { id: 'moderne',    label: 'Moderne',    url: GF + 'DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;700' },
    { id: 'minimal',    label: 'Minimaliste', url: GF + 'Josefin+Sans:wght@300;400;600&family=Lato:wght@400;700' },
    { id: 'calligraphie', label: 'Calligraphie', url: GF + 'Pinyon+Script&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Mulish:wght@400;600;700' },
    { id: 'editorial',  label: 'Éditorial',  url: GF + 'Playfair+Display:ital,wght@0,400;0,500;1,400&family=Mulish:wght@400;600;700' },
    { id: 'bodoni',     label: 'Haute couture', url: GF + 'Bodoni+Moda:ital,wght@0,400;0,500;1,400&family=Mulish:wght@400;600;700' },
    { id: 'artdeco',    label: 'Art déco',   url: GF + 'Italiana&family=Jost:wght@300;400;500' }
  ];
  FP.INTROS = [
    { id: 'enveloppe',  label: 'Enveloppe',  hint: 'Vos invités ouvrent une enveloppe' },
    { id: 'monogramme', label: 'Monogramme', hint: 'Vos initiales, puis le faire-part' },
    { id: 'aucune',     label: 'Aucune',     hint: 'Le faire-part s’affiche directement' }
  ];
  FP.SHAPES = [
    { id: 'arrondi', label: 'Arrondie' }, { id: 'arche', label: 'Arche' }, { id: 'cercle', label: 'Cercle' }
  ];
  // Ambiances : un clic règle tout le style de façon cohérente.
  // Ornements dessinés autour des prénoms, et finitions « imprimeur » (dorure à chaud, texture du papier).
  FP.DECORS = [
    { id: 'aucun',     label: 'Épuré' },
    { id: 'feuillage', label: 'Couronne' },
    { id: 'botanique', label: 'Botanique' },
    { id: 'cadre',     label: 'Cadre' },
    { id: 'artdeco',   label: 'Art déco' }
  ];
  FP.FOILS = [
    { id: 'aucune', label: 'Encre',   sw: ['#6B6559', '#3A362E'] },
    { id: 'or',     label: 'Dorure',  sw: ['#A57E2E', '#F3DF9E', '#8F6B22'] },
    { id: 'orrose', label: 'Or rose', sw: ['#A9626B', '#F4CDC3', '#94545D'] },
    { id: 'argent', label: 'Argent',  sw: ['#7E858C', '#F1F3F5', '#6D747B'] }
  ];
  // Ambiances : un clic règle tout le style de façon cohérente (comme une collection chez un papetier).
  FP.PRESETS = [
    { id: 'champetre',   label: 'Champêtre',   theme: 'sauge',      font: 'classique',    intro: 'enveloppe',  photoShape: 'arrondi', decor: 'feuillage', foil: 'aucune', texture: true },
    { id: 'romantique',  label: 'Romantique',  theme: 'rose',       font: 'romantique',   intro: 'enveloppe',  photoShape: 'arche',   decor: 'botanique', foil: 'orrose', texture: true },
    { id: 'chateau',     label: 'Château',     theme: 'ivoire',     font: 'calligraphie', intro: 'enveloppe',  photoShape: 'arche',   decor: 'cadre',     foil: 'or',     texture: true },
    { id: 'elegance',    label: 'Élégance',    theme: 'nuit',       font: 'bodoni',       intro: 'monogramme', photoShape: 'arrondi', decor: 'cadre',     foil: 'or',     texture: false },
    { id: 'gatsby',      label: 'Gatsby',      theme: 'noir',       font: 'artdeco',      intro: 'monogramme', photoShape: 'arrondi', decor: 'artdeco',   foil: 'or',     texture: false },
    { id: 'emeraude',    label: 'Jardin d’hiver', theme: 'emeraude', font: 'editorial',   intro: 'enveloppe',  photoShape: 'arche',   decor: 'feuillage', foil: 'or',     texture: false },
    { id: 'boheme',      label: 'Bohème',      theme: 'terracotta', font: 'romantique',   intro: 'enveloppe',  photoShape: 'arche',   decor: 'botanique', foil: 'aucune', texture: true },
    { id: 'porcelaine',  label: 'Porcelaine',  theme: 'porcelaine', font: 'editorial',    intro: 'monogramme', photoShape: 'cercle',  decor: 'cadre',     foil: 'argent', texture: true },
    { id: 'minimaliste', label: 'Minimaliste', theme: 'riviera',    font: 'minimal',      intro: 'monogramme', photoShape: 'cercle',  decor: 'aucun',     foil: 'aucune', texture: false }
  ];
  FP.SECTIONS = [
    { id: 'story',     label: 'Notre histoire' },
    { id: 'program',   label: 'Programme' },
    { id: 'dress',     label: 'Dress code' },
    { id: 'lodging',   label: 'Hébergement' },
    { id: 'practical', label: 'Infos pratiques' },
    { id: 'gifts',     label: 'Liste de mariage' }
  ];
  function ids(list){ return list.map(function(x){ return x.id; }); }

  var loadedFonts = {};
  FP.loadFont = function(id){
    var f = FP.FONTS.filter(function(x){ return x.id === id; })[0];
    if(!f || loadedFonts[id] || typeof document === 'undefined') return;
    loadedFonts[id] = true;
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = f.url; document.head.appendChild(l);
  };

  // ------------------------------------------------------------------ Liens
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
  FP.isAllowedMapsUrl = function(u){ return !!safeMapsUrl(u); };
  // Liens libres (cagnotte, hébergements) : https uniquement, sans identifiants ; le domaine est affiché à côté
  // du bouton pour que l'invité sache où il va.
  function safeLink(u){
    u = safeHttps(u);
    if(!u) return null;
    try{
      var x = new URL(u);
      if(x.username || x.password || !/\./.test(x.hostname)) return null;
      return { href: x.href, host: x.hostname.replace(/^www\./i, '') };
    }catch(e){ return null; }
  }
  FP.isValidLink = function(u){ return !!safeLink(u); };

  // ------------------------------------------------------------------ Configuration
  FP.defaults = function(){
    return {
      v: 2,
      partner1: '', partner2: '',
      date: '', time: '', // heure facultative
      venueName: '', venueAddress: '', mapsUrl: '',
      subtitle: 'vous invitent à célébrer leur mariage',
      message: 'Nous serions très heureux de partager ce jour unique avec vous.',
      photos: [],
      theme: 'sauge', font: 'classique', intro: 'enveloppe', photoShape: 'arrondi', countdown: true,
      decor: 'feuillage', foil: 'aucune', texture: true,
      tz: '', // fuseau horaire du lieu (celui du créateur au moment de la création)
      sections: {
        story: { on: false, text: '' },
        program: { on: false, items: [] },
        dress: { on: false, text: '' },
        lodging: { on: false, text: '', url: '' },
        practical: { on: false, text: '' },
        gifts: { on: false, text: '', url: '' }
      },
      rsvp: { guests: true, companions: false, children: false, diet: true, brunch: false,
              email: false, phone: false, address: false, message: true, customLabel: '', deadline: '' }
    };
  };

  // Contenu proposé quand on active une section (modifiable ; « Notre histoire » reste vide : c'est personnel).
  FP.sectionDefaults = function(id, cfg){
    if(id === 'program'){
      var t = /^(\d{2}):(\d{2})$/.exec((cfg && cfg.time) || '') || [0, '15', '00']; // sans heure de cérémonie : 15h
      var base = (+t[1]) * 60 + (+t[2]);
      var at = function(m){ m = (base + m) % 1440; return pad(Math.floor(m / 60)) + ':' + pad(m % 60); };
      return { on: true, items: [
        { time: at(0), label: 'Cérémonie' }, { time: at(90), label: 'Vin d’honneur' },
        { time: at(240), label: 'Dîner' }, { time: at(420), label: 'Soirée dansante' }] };
    }
    var texts = {
      story: '',
      dress: 'Tenue chic et décontractée. Prévoyez des chaussures confortables : une partie de la fête se déroule en extérieur.',
      lodging: 'Voici une sélection d’hébergements à proximité du lieu. Pensez à réserver tôt, l’été est très demandé !',
      practical: 'Parking gratuit sur place.',
      gifts: 'Votre présence est notre plus beau cadeau. Pour ceux qui le souhaitent, une cagnotte est à votre disposition.'
    };
    var s = { on: true, text: texts[id] || '' };
    if(id === 'lodging' || id === 'gifts') s.url = '';
    return s;
  };

  // Liste blanche : la config vient de la base (donc potentiellement forgée par n'importe qui). On ne garde que
  // les champs connus, avec leur type et leur longueur maximale. Ça évite aussi la pollution de prototype
  // (une clé "__proto__" dans le JSON) qu'un simple Object.assign aurait laissée passer.
  function str(v, max, def){ return typeof v === 'string' ? v.slice(0, max) : (def || ''); }
  function obj(v){ return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {}; }
  function pick(v, list, def){ return list.indexOf(v) > -1 ? v : def; }
  var DATE_RE = /^\d{4}-\d{2}-\d{2}$/, TIME_RE = /^\d{2}:\d{2}$/;
  FP.sanitizeConfig = function(c){
    var d = FP.defaults();
    c = obj(c);
    var r = obj(c.rsvp), s = obj(c.sections), legacy = !('intro' in c);
    var out = {
      v: 2,
      partner1: str(c.partner1, 40), partner2: str(c.partner2, 40),
      date: DATE_RE.test(str(c.date, 10)) ? c.date : '',
      time: TIME_RE.test(str(c.time, 5)) ? c.time : '',
      venueName: str(c.venueName, 80), venueAddress: str(c.venueAddress, 200), mapsUrl: str(c.mapsUrl, 300),
      subtitle: str(c.subtitle, 100, d.subtitle), message: str(c.message, 600, d.message),
      photos: Array.isArray(c.photos) ? c.photos.filter(function(p){ return typeof p === 'string' && safeImg(p); }).slice(0, 3) : [],
      theme: pick(c.theme, ids(FP.PALETTES), 'sauge'),
      font: pick(c.font, ids(FP.FONTS), 'classique'),
      // Les faire-part créés avant l'ajout des intros n'en ont pas : on ne leur en impose pas une.
      intro: pick(c.intro, ids(FP.INTROS), legacy ? 'aucune' : 'enveloppe'),
      photoShape: pick(c.photoShape, ids(FP.SHAPES), 'arrondi'),
      countdown: 'countdown' in c ? c.countdown === true : true,
      // Les faire-part créés avant l'ajout des ornements et finitions restent tels quels (épuré, encre, sans texture).
      decor: pick(c.decor, ids(FP.DECORS), 'aucun'),
      foil: pick(c.foil, ids(FP.FOILS), 'aucune'),
      texture: c.texture === true,
      tz: /^[A-Za-z]+(\/[A-Za-z0-9_+\-]+){0,2}$/.test(str(c.tz, 64)) ? c.tz : '',
      sections: {}, rsvp: {}
    };
    function sec(id, fields){
      var x = obj(s[id]), o = { on: x.on === true };
      Object.keys(fields).forEach(function(k){ o[k] = str(x[k], fields[k]); });
      return o;
    }
    out.sections.story = sec('story', { text: 1500 });
    out.sections.dress = sec('dress', { text: 600 });
    out.sections.lodging = sec('lodging', { text: 1200, url: 300 });
    out.sections.practical = sec('practical', { text: 1200 });
    out.sections.gifts = sec('gifts', { text: 600, url: 300 });
    var pg = obj(s.program);
    out.sections.program = { on: pg.on === true, items: (Array.isArray(pg.items) ? pg.items : []).slice(0, 8).map(function(it){
      it = obj(it); return { time: TIME_RE.test(str(it.time, 5)) ? it.time : '', label: str(it.label, 60) };
    }) };
    // Ancien format : « infos pratiques » était un simple texte.
    if(!s.practical && typeof c.practical === 'string' && c.practical.trim()){
      out.sections.practical = { on: true, text: c.practical.slice(0, 1200) };
    }
    ['guests', 'companions', 'children', 'diet', 'brunch', 'email', 'phone', 'address', 'message'].forEach(function(k){
      out.rsvp[k] = (k in r) ? r[k] === true : d.rsvp[k];
    });
    out.rsvp.customLabel = str(r.customLabel, 80);
    out.rsvp.deadline = DATE_RE.test(str(r.deadline, 10)) ? r.deadline : '';
    var meta = obj(c.meta);
    if(c.meta) out.meta = { durationSec: typeof meta.durationSec === 'number' ? meta.durationSec : null, updatedAt: str(meta.updatedAt, 40) };
    return out;
  };

  // ------------------------------------------------------------------ Dates
  function parseDate(s){
    var m = DATE_RE.exec(s || '') && /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if(!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return d.getMonth() === +m[2] - 1 ? d : null; // rejette les dates impossibles (31 février…)
  }
  FP.parseDate = parseDate;
  FP.hasTime = function(cfg){ return TIME_RE.test(cfg.time || ''); };
  // Date « murale » du mariage (pour l'affichage : 7 août 2027, 16h00, quel que soit le pays de l'invité).
  // Sans heure (facultative), on prend le début de la journée.
  FP.eventDate = function(cfg){
    var d = parseDate(cfg.date);
    if(!d) return null;
    var t = /^(\d{2}):(\d{2})$/.exec(cfg.time || '') || [0, '00', '00'];
    d.setHours(+t[1], +t[2], 0, 0);
    return d;
  };
  // Instant absolu du mariage (compte à rebours, agenda) : 16h00 à Paris reste 16h00 à Paris pour un invité au
  // Brésil. Sans fuseau connu (anciens faire-part), on suppose Europe/Paris.
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
  function longDate(d){
    var s = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    return d.getDate() === 1 ? s.replace(/^1 /, '1er ') : s;
  }
  FP.longDate = longDate;
  FP.formatDate = function(cfg, withWeekday){
    var d = FP.eventDate(cfg);
    if(!d) return '';
    var s = longDate(d);
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
  function hm(t){ return TIME_RE.test(t || '') ? t.replace(':', 'h') : ''; }
  function initial(s){ var m = /\p{L}/u.exec(String(s || '')); return m ? m[0].toUpperCase() : ''; }

  // ------------------------------------------------------------------ Agenda (.ics)
  // Horodatage UTC (suffixe Z) : chaque agenda le convertit dans le fuseau de l'invité.
  function icsStamp(ms){ return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
  function icsEsc(s){ return String(s).replace(/[\\;,]/g, '\\$&').replace(/\r?\n/g, '\\n'); }
  // Repli compté en octets UTF-8 (norme RFC 5545 : 75 octets max), sans couper un caractère en deux.
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
  FP.slugifyLite = function(s){ return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40); };
  FP.buildIcs = function(cfg){
    cfg = FP.sanitizeConfig(cfg);
    var start = FP.eventInstant(cfg); if(start == null) return '';
    var title = 'Mariage de ' + cfg.partner1 + ' & ' + cfg.partner2, when;
    if(FP.hasTime(cfg)) when = ['DTSTART:' + icsStamp(start), 'DTEND:' + icsStamp(start + 6 * 3600 * 1000)];
    else { // sans heure : événement sur la journée entière
      var d = FP.eventDate(cfg), n = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      var ymd = function(x){ return x.getFullYear() + pad(x.getMonth() + 1) + pad(x.getDate()); };
      when = ['DTSTART;VALUE=DATE:' + ymd(d), 'DTEND;VALUE=DATE:' + ymd(n)];
    }
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Faire-part//FR', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      'UID:' + start + '-' + FP.slugifyLite(title) + '@faire-part', 'DTSTAMP:' + icsStamp(Date.now())].concat(when, [
      'SUMMARY:' + icsEsc(title), 'LOCATION:' + icsEsc([cfg.venueName, cfg.venueAddress].filter(Boolean).join(', ')),
      'END:VEVENT', 'END:VCALENDAR']).map(icsFold).join('\r\n');
  };
  function downloadIcs(cfg){
    var ics = FP.buildIcs(cfg); if(!ics) return;
    var url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    var a = document.createElement('a'); a.href = url; a.download = 'mariage.ics';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  }

  // ------------------------------------------------------------------ Blocs HTML
  var HEART = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.05-4.35-9.5-8.5C.7 9 2.2 5 6.3 5c2 0 3.6 1.1 5.7 3.6C14.1 6.1 15.7 5 17.7 5c4.1 0 5.6 4 3.8 7.5C19.05 16.65 12 21 12 21z"/></svg>';
  function divider(){ return '<div class="divider-heart" aria-hidden="true"><span class="dh-line"></span>' + HEART + '<span class="dh-line"></span></div>'; }
  function head(title){ return '<div class="section-head"><h2>' + esc(title) + '</h2>' + divider() + '</div>'; }
  function linkBtn(l, label){
    return l ? '<div class="center"><a class="maps-btn" href="' + esc(l.href) + '" target="_blank" rel="noopener nofollow">' +
      esc(label) + ' <span class="host">(' + esc(l.host) + ')</span></a></div>' : '';
  }
  function placeholder(preview){ return preview ? '<p class="ph">Votre texte apparaîtra ici.</p>' : ''; }

  function rsvpHtml(cfg, preview){
    var r = cfg.rsvp, h = '';
    var guestsLabel = r.children ? 'Nombre d’adultes (vous inclus)' : 'Nombre de personnes (vous inclus)';
    h += '<form class="rsvp-form" novalidate><fieldset class="rsvp-fields"' + (preview ? ' disabled' : '') + '>';
    h += '<div class="hp" aria-hidden="true"><label>Ne pas remplir<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>';
    h += '<div class="field"><label for="f-name">Nom et prénom</label><input type="text" id="f-name" name="name" maxlength="120" autocomplete="name" required></div>';
    h += '<div class="field"><span class="lab" id="lab-att">Serez-vous présent(e) ?</span><div class="choices" role="radiogroup" aria-labelledby="lab-att">' +
         '<label><input type="radio" name="attendance" value="yes"> Oui, avec plaisir</label>' +
         '<label><input type="radio" name="attendance" value="no"> Je ne pourrai pas</label></div></div>';
    if(r.guests || r.children){
      h += '<div class="field-row when-yes">';
      if(r.guests) h += '<div class="field"><label for="f-guests">' + guestsLabel + '</label><input type="number" id="f-guests" name="guests" min="1" max="20" value="1" inputmode="numeric"></div>';
      if(r.children) h += '<div class="field"><label for="f-children">Nombre d’enfants</label><input type="number" id="f-children" name="children" min="0" max="20" value="0" inputmode="numeric"></div>';
      h += '</div>';
    }
    if(r.companions) h += '<div class="field when-yes when-plus"><label for="f-companions">Prénoms et noms des personnes qui vous accompagnent</label><textarea id="f-companions" name="companions" maxlength="300" rows="2"></textarea></div>';
    if(r.brunch) h += '<div class="field when-yes"><span class="lab" id="lab-brunch">Brunch du lendemain ?</span><div class="choices" role="radiogroup" aria-labelledby="lab-brunch">' +
         '<label><input type="radio" name="brunch" value="yes"> Oui</label>' +
         '<label><input type="radio" name="brunch" value="no"> Non</label></div></div>';
    if(r.diet) h += '<div class="field when-yes"><label for="f-diet">Régime alimentaire ou allergies</label><input type="text" id="f-diet" name="diet" maxlength="300" placeholder="Végétarien, sans gluten…"></div>';
    if(r.email) h += '<div class="field"><label for="f-email">Email</label><input type="email" id="f-email" name="email" maxlength="200" autocomplete="email" inputmode="email"></div>';
    if(r.phone) h += '<div class="field"><label for="f-phone">Téléphone</label><input type="tel" id="f-phone" name="phone" maxlength="30" autocomplete="tel"></div>';
    if(r.address) h += '<div class="field"><label for="f-address">Adresse postale</label><textarea id="f-address" name="address" maxlength="300" rows="2" autocomplete="street-address"></textarea></div>';
    if(r.customLabel) h += '<div class="field"><label for="f-custom">' + esc(r.customLabel) + '</label><input type="text" id="f-custom" name="custom" maxlength="500"></div>';
    if(r.message) h += '<div class="field"><label for="f-msg">Un message pour nous ?</label><textarea id="f-msg" name="message" maxlength="1000"></textarea></div>';
    h += '<div class="center"><button type="submit" class="btn">Envoyer ma réponse</button></div>';
    h += '<p class="form-msg" role="status"></p></fieldset></form>';
    return h;
  }

  // Mêmes règles que le serveur (supabase/schema.sql) : refus des caractères exotiques (<, >, guillemets…).
  var EMAIL_RE = /^[A-Za-z0-9._%+'\-]{1,64}@[A-Za-z0-9.\-]{1,255}\.[A-Za-z]{2,24}$/, PHONE_RE = /^[0-9 +().\-]{6,30}$/;
  FP.EMAIL_RE = EMAIL_RE; FP.PHONE_RE = PHONE_RE;

  function bindRsvp(root, opts){
    var form = root.querySelector('.rsvp-form');
    if(!form) return;
    var whenYes = form.querySelectorAll('.when-yes'), whenPlus = form.querySelectorAll('.when-plus');
    function num(n){ var el = form.querySelector('[name=' + n + ']'); return el ? parseInt(el.value, 10) || 0 : 0; }
    function toggle(){
      var c = form.querySelector('input[name=attendance]:checked');
      var no = !!(c && c.value === 'no'), plus = num('guests') > 1 || num('children') > 0;
      for(var i = 0; i < whenYes.length; i++) whenYes[i].hidden = no;
      for(var j = 0; j < whenPlus.length; j++) whenPlus[j].hidden = no || !plus;
    }
    form.addEventListener('change', toggle); form.addEventListener('input', toggle); toggle();
    form.addEventListener('submit', function(e){
      e.preventDefault();
      if(opts.preview || !opts.onSubmit) return;
      var fd = new FormData(form), msg = form.querySelector('.form-msg'), btn = form.querySelector('button[type=submit]');
      if(fd.get('website')) return; // anti-spam : champ piège rempli par les robots
      var get = function(k, max){ return String(fd.get(k) || '').trim().slice(0, max); };
      var name = get('name', 120), att = fd.get('attendance');
      if(!name || !att){ msg.textContent = 'Merci d’indiquer votre nom et si vous serez présent(e).'; return; }
      var email = get('email', 200), phone = get('phone', 30);
      if(email && !EMAIL_RE.test(email)){ msg.textContent = 'L’adresse email ne semble pas valide.'; return; }
      if(phone && !PHONE_RE.test(phone)){ msg.textContent = 'Le numéro de téléphone ne semble pas valide.'; return; }
      var yes = att === 'yes', plus = num('guests') > 1 || num('children') > 0;
      var data = {
        name: name, attendance: att,
        guests: yes ? Math.max(1, Math.min(20, num('guests') || 1)) : 0,
        children: yes ? Math.max(0, Math.min(20, num('children'))) : 0,
        companions: yes && plus ? get('companions', 300) : '',
        diet: yes ? get('diet', 300) : '',
        brunch: yes ? String(fd.get('brunch') || '') : '',
        email: email, phone: phone, address: get('address', 300), custom: get('custom', 500),
        message: get('message', 1000)
      };
      btn.disabled = true; msg.textContent = '';
      opts.onSubmit(data).then(function(){
        root.querySelector('.form-wrap').innerHTML = '<div class="thanks" tabindex="-1"><h3>Merci ' + esc(name.split(' ')[0]) + ' !</h3><p>' +
          (yes ? 'Votre réponse est bien enregistrée. À très vite !' : 'Merci de nous avoir prévenus, vous nous manquerez.') + '</p></div>';
        var t = root.querySelector('.thanks'); if(t) t.focus();
      }).catch(function(err){
        btn.disabled = false;
        var m = String((err && err.message) || '');
        msg.textContent = /invalid email/.test(m) ? 'L’adresse email ne semble pas valide.'
          : /invalid phone/.test(m) ? 'Le numéro de téléphone ne semble pas valide.'
          : /rate limit/.test(m) ? 'Trop de réponses envoyées depuis cette connexion. Réessayez dans une heure.'
          : 'Oups, l’envoi a échoué. Merci de réessayer dans un instant.';
      });
    });
  }

  // ------------------------------------------------------------------ Intro (enveloppe / monogramme)
  function clearIntro(){ introTimers.forEach(clearTimeout); introTimers = []; }
  function later(fn, ms){ introTimers.push(setTimeout(fn, ms)); }
  function reducedMotion(){ return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }

  function playIntro(root, cfg, opts){
    var content = root.querySelector('.fp-content'), container = opts.introContainer;
    var ini = esc(initial(cfg.partner1) || 'A') + '<span class="amp">&amp;</span>' + esc(initial(cfg.partner2) || 'J');
    var ov = document.createElement('div');
    ov.className = 'fp-intro fp-intro-' + cfg.intro + (container ? ' in-preview' : '');
    if(cfg.intro === 'enveloppe'){
      ov.innerHTML = '<p class="intro-kicker">Vous avez reçu une invitation</p>' +
        '<button type="button" class="env" aria-label="Ouvrir l’invitation">' +
          '<span class="env-back"></span>' +
          '<span class="env-card"><span class="env-card-names">' + esc(cfg.partner1 || 'Prénom') + ' <span class="amp">&amp;</span> ' + esc(cfg.partner2 || 'Prénom') + '</span>' +
            (FP.formatDate(cfg, false) ? '<span class="env-card-date">' + esc(FP.formatDate(cfg, false)) + '</span>' : '') + '</span>' +
          '<span class="env-front"></span><span class="env-flap"></span>' +
          '<span class="env-seal" aria-hidden="true">' + ini + '</span>' +
        '</button>' +
        '<p class="intro-hint">Touchez l’enveloppe pour l’ouvrir</p>';
    } else {
      var d = FP.formatDate(cfg, false);
      ov.innerHTML = '<button type="button" class="mono" aria-label="Ouvrir l’invitation">' +
        '<span class="mono-letters">' + ini + '</span>' +
        (d ? '<span class="mono-date">' + esc(d) + '</span>' : '') + '</button>';
    }
    if(container){
      container.scrollTop = 0;
      // Aperçu « ordinateur » : le faire-part est rendu en 1280 px puis réduit (zoom) ; l'intro doit couvrir l'écran visible.
      var z = parseFloat(getComputedStyle(root).zoom) || 1;
      ov.style.height = (container.clientHeight / z) + 'px'; // CSSOM : autorisé par la CSP (≠ attribut style)
      container.classList.add('fp-locked');
    } else {
      document.documentElement.classList.add('fp-locked');
    }
    if(content) content.inert = true;
    root.appendChild(ov);
    var opened = false;
    function finish(){
      if(!ov.isConnected) return;
      ov.remove();
      if(container) container.classList.remove('fp-locked'); else document.documentElement.classList.remove('fp-locked');
      if(content) content.inert = false;
      document.removeEventListener('keydown', onKey);
    }
    function open(){
      if(opened) return;
      opened = true;
      if(reducedMotion()){ ov.classList.add('done'); later(finish, 250); return; }
      ov.classList.add('open');
      later(function(){ ov.classList.add('done'); }, cfg.intro === 'enveloppe' ? 1500 : 400);
      later(finish, cfg.intro === 'enveloppe' ? 2200 : 1100);
    }
    function onKey(e){ if(e.key === 'Escape') open(); }
    ov.querySelector('button').addEventListener('click', open);
    document.addEventListener('keydown', onKey);
    if(cfg.intro === 'monogramme') later(open, reducedMotion() ? 600 : 2200); // s'ouvre seul
    // Pas de focus automatique (il dessinerait un cadre autour de l'enveloppe) : le reste de la page étant inerte,
    // la touche Tab mène directement au bouton, et Entrée/Espace/Échap l'ouvrent.
    root._fpIntro = { open: open, finish: finish };
  }

  var ART = {
    wreath: { vb: "0 0 240 52", stroke: "M114.0 40.0Q70.0 8.0 16.0 40.0M126.0 40.0Q170.0 8.0 224.0 40.0", fill: "M103.3 33.2C98.1 30.5 95.9 24.5 98.4 19.7C103.4 21.7 105.6 27.8 103.3 33.2ZM94.2 29.0C91.6 34.1 85.8 36.3 81.2 33.9C83.1 29.1 88.9 26.9 94.2 29.0ZM84.8 26.1C79.5 24.9 76.1 19.9 77.3 15.1C82.3 15.7 85.6 20.7 84.8 26.1ZM75.3 24.4C74.3 29.6 69.6 32.9 64.9 31.9C65.4 27.1 70.1 23.8 75.3 24.4ZM65.5 24.0C60.5 24.2 56.3 20.7 56.2 16.1C60.8 15.4 65.0 19.0 65.5 24.0ZM55.6 24.9C55.9 29.7 52.6 33.8 48.2 34.0C47.5 29.7 50.8 25.6 55.6 24.9ZM45.5 27.1C41.0 28.4 36.5 26.1 35.4 22.1C39.3 20.5 43.9 22.8 45.5 27.1ZM35.1 30.6C36.4 34.8 34.2 39.1 30.3 40.1C28.8 36.4 31.0 32.1 35.1 30.6ZM24.6 35.3C20.9 37.2 16.5 36.0 14.8 32.6C18.0 30.5 22.4 31.7 24.6 35.3ZM16.0 40.0C14.7 44.4 10.3 47.0 6.3 45.7C7.1 41.6 11.5 39.0 16.0 40.0ZM136.7 33.2C134.4 27.8 136.6 21.7 141.6 19.7C144.1 24.5 141.9 30.5 136.7 33.2ZM145.8 29.0C151.1 26.9 156.9 29.1 158.8 33.9C154.2 36.3 148.4 34.1 145.8 29.0ZM155.2 26.1C154.4 20.7 157.7 15.7 162.7 15.1C163.9 19.9 160.5 24.9 155.2 26.1ZM164.7 24.4C169.9 23.8 174.6 27.1 175.1 31.9C170.4 32.9 165.7 29.6 164.7 24.4ZM174.5 24.0C175.0 19.0 179.2 15.4 183.8 16.1C183.7 20.7 179.5 24.2 174.5 24.0ZM184.4 24.9C189.2 25.6 192.5 29.7 191.8 34.0C187.4 33.8 184.1 29.7 184.4 24.9ZM194.5 27.1C196.1 22.8 200.7 20.5 204.6 22.1C203.5 26.1 199.0 28.4 194.5 27.1ZM204.9 30.6C209.0 32.1 211.2 36.4 209.7 40.1C205.8 39.1 203.6 34.8 204.9 30.6ZM215.4 35.3C217.6 31.7 222.0 30.5 225.2 32.6C223.5 36.0 219.1 37.2 215.4 35.3ZM224.0 40.0C228.5 39.0 232.9 41.6 233.7 45.7C229.7 47.0 225.3 44.4 224.0 40.0Z", dots: [[120, 40, 2.6]] },
    corner: { vb: "0 0 130 64", stroke: "M2.0 4.0Q40.0 2.0 118.0 34.0M30.0 4.0Q52.0 18.0 58.0 52.0", fill: "M11.7 4.0C18.5 4.1 23.7 9.2 23.3 15.5C17.0 16.0 11.8 10.9 11.7 4.0ZM18.8 4.6C19.9 -2.0 25.7 -6.2 31.6 -4.7C31.1 1.3 25.4 5.5 18.8 4.6ZM26.4 5.5C32.8 6.2 37.2 11.6 36.1 17.4C30.2 17.3 25.8 12.0 26.4 5.5ZM34.5 7.0C36.1 0.9 41.9 -2.5 47.3 -0.7C46.3 5.0 40.6 8.4 34.5 7.0ZM43.2 8.8C49.1 9.9 52.8 15.3 51.4 20.6C45.9 20.1 42.2 14.8 43.2 8.8ZM52.3 11.1C54.2 5.6 59.8 2.7 64.7 4.8C63.5 10.0 57.9 12.9 52.3 11.1ZM62.0 13.8C67.5 15.2 70.6 20.4 69.0 25.3C63.9 24.5 60.7 19.3 62.0 13.8ZM72.2 17.0C74.2 11.9 79.5 9.6 84.0 11.7C82.6 16.5 77.3 18.9 72.2 17.0ZM82.9 20.6C87.9 22.1 90.6 27.0 88.9 31.5C84.2 30.6 81.4 25.6 82.9 20.6ZM94.1 24.6C96.1 20.0 101.1 18.0 105.2 20.2C103.7 24.6 98.7 26.6 94.1 24.6ZM105.8 29.1C110.4 30.7 112.7 35.3 110.9 39.4C106.6 38.3 104.3 33.7 105.8 29.1ZM118.0 34.0C123.0 32.0 128.3 34.2 129.8 38.8C125.4 41.1 120.1 38.9 118.0 34.0ZM35.0 7.6C38.3 4.0 43.5 3.8 46.5 7.1C43.8 10.7 38.7 10.9 35.0 7.6ZM42.4 15.0C45.5 18.3 45.3 23.1 42.0 25.7C38.9 22.9 39.1 18.1 42.4 15.0ZM48.6 24.0C52.3 22.1 56.5 23.5 57.9 27.1C54.6 29.1 50.4 27.7 48.6 24.0ZM53.4 34.5C54.9 38.0 53.4 41.8 50.1 42.9C48.4 39.8 49.9 36.0 53.4 34.5ZM56.9 46.7C60.3 46.1 63.3 48.2 63.6 51.4C60.5 52.2 57.5 50.1 56.9 46.7ZM58.0 52.0C61.1 54.2 61.8 58.2 59.6 60.9C56.5 59.1 55.8 55.1 58.0 52.0Z", dots: [] },
    deco: { vb: "0 0 240 68", stroke: "M100.3 58.5L68.8 53.0M101.2 55.2L78.7 47.0M102.7 52.0L75.0 36.0M104.7 49.1L86.3 33.7M107.1 46.7L86.6 22.2M110.0 44.7L98.0 23.9M113.2 43.2L102.2 13.1M116.5 42.3L112.4 18.7M120.0 42.0L120.0 10.0M123.5 42.3L127.6 18.7M126.8 43.2L137.8 13.1M130.0 44.7L142.0 23.9M132.9 46.7L153.4 22.2M135.3 49.1L153.7 33.7M137.3 52.0L165.0 36.0M138.8 55.2L161.3 47.0M139.7 58.5L171.2 53.0M62 62A58 58 0 0 1 178 62M105 62A15 15 0 0 1 135 62M12 62H56M184 62H228", fill: "M8 58.8L11.2 62L8 65.2L4.8 62ZM232 58.8L235.2 62L232 65.2L228.8 62ZM120 -1.4L123.4 2L120 5.4L116.6 2Z", dots: [] },
    frame: { vb: "0 0 44 44", stroke: "M2 42V14Q2 2 14 2H42M8 42V18Q8 8 18 8H42M14 14m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0", fill: '', dots: [] }
  };
  var artUid = 0;
  // Un ornement en SVG. Avec une dorure, il est peint avec un dégradé métallique (identifiant unique par dessin :
  // plusieurs miniatures cohabitent dans la même page).
  function artSvg(name, foil, cls){
    var a = ART[name], id = 'fpg' + (++artUid), paint = foil !== 'aucune' ? 'url(#' + id + ')' : '';
    var defs = paint ? '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2=".35"><stop offset="0" class="fs1"/><stop offset=".35" class="fs2"/>' +
      '<stop offset=".55" class="fs3"/><stop offset=".75" class="fs2"/><stop offset="1" class="fs4"/></linearGradient></defs>' : '';
    var sw = name === 'frame' ? 1.4 : name === 'deco' ? 1.1 : 1.2;
    return '<svg class="' + cls + '" viewBox="' + a.vb + '" aria-hidden="true" focusable="false">' + defs +
      '<path class="art-s" fill="none" stroke-width="' + sw + '" stroke-linecap="round"' + (paint ? ' stroke="' + paint + '"' : '') + ' d="' + a.stroke + '"/>' +
      (a.fill ? '<path class="art-f"' + (paint ? ' fill="' + paint + '"' : '') + ' d="' + a.fill + '"/>' : '') +
      a.dots.map(function(d){ return '<circle class="art-f" cx="' + d[0] + '" cy="' + d[1] + '" r="' + d[2] + '"' + (paint ? ' fill="' + paint + '"' : '') + '/>'; }).join('') +
      '</svg>';
  }
  // Ornements d'un faire-part : au-dessus des prénoms (couronne, éventail) ou dans les coins (botanique, cadre).
  function decorParts(cfg){
    var d = cfg.decor, f = cfg.foil;
    if(d === 'feuillage') return { top: artSvg('wreath', f, 'dc-top dc-wreath'), corners: '' };
    if(d === 'artdeco') return { top: artSvg('deco', f, 'dc-top dc-deco'), corners: '', bottom: '<span class="dc-rule" aria-hidden="true"></span>' };
    if(d === 'botanique') return { top: '', corners: artSvg('corner', f, 'dc-corner dc-tl') + artSvg('corner', f, 'dc-corner dc-br') };
    if(d === 'cadre') return { top: '', corners: '<span class="dc-frame" aria-hidden="true"></span>' +
      ['tl', 'tr', 'bl', 'br'].map(function(k){ return artSvg('frame', f, 'dc-fc dc-' + k); }).join('') };
    return { top: '', corners: '' };
  }
  function styleAttrs(el, cfg){
    el.setAttribute('data-theme', cfg.theme); el.setAttribute('data-font', cfg.font);
    el.setAttribute('data-decor', cfg.decor); el.setAttribute('data-foil', cfg.foil);
    el.setAttribute('data-texture', cfg.texture ? 'papier' : 'lisse');
  }
  // Miniature d'un faire-part (sélecteur de style) : mêmes palettes, polices, ornements et finitions que le rendu réel.
  FP.miniHtml = function(cfg, opts){
    opts = opts || {};
    var dp = decorParts(cfg), d = FP.formatDate(cfg, false) || '7 août 2027';
    return '<div class="mini-card">' + dp.corners + '<div class="mini-body">' + dp.top +
      '<div class="mini-names">' + esc(cfg.partner1 || 'Camille') + ' <span class="amp">&amp;</span> ' + esc(cfg.partner2 || 'Hugo') + '</div>' +
      '<div class="mini-rule"></div><div class="mini-date">' + esc(d) + '</div></div>' + (dp.bottom || '') + '</div>';
  };
  FP.applyStyleAttrs = function(el, cfg){ el.classList.add('fp'); styleAttrs(el, cfg); };

  // ------------------------------------------------------------------ Rendu
  FP.renderInvitation = function(root, cfg, opts){
    opts = opts || {};
    cfg = FP.sanitizeConfig(cfg);
    if(timer){ clearInterval(timer); timer = null; }
    clearIntro();
    if(root._fpIntro){ root._fpIntro.finish(); root._fpIntro = null; }
    FP.loadFont(cfg.font);

    var photos = cfg.photos.map(safeImg).filter(Boolean), preview = !!opts.preview, sec = cfg.sections;
    root.className = 'fp' + (photos.length ? '' : ' no-photo');
    styleAttrs(root, cfg);
    root.setAttribute('data-shape', cfg.photoShape);
    var dp = decorParts(cfg);

    var p1 = esc(cfg.partner1 || 'Prénom'), p2 = esc(cfg.partner2 || 'Prénom');
    // Espace normale avant « & » (la ligne peut se couper là si les prénoms sont longs), insécable après.
    var names = p1 + ' <span class="amp">&amp;</span>&nbsp;' + p2;
    var dateLong = FP.formatDate(cfg, false), dateFull = FP.formatDate(cfg, true);
    var time = hm(cfg.time), hasDate = !!FP.eventDate(cfg), maps = FP.mapsHref(cfg);
    var h = '';

    // Hero
    if(photos[0]) h += '<div class="hero-photo-wrap"><img class="hero-photo" src="' + photos[0] + '" alt="' + p1 + ' et ' + p2 + '"></div>';
    h += '<div class="hero-text">' + dp.corners + dp.top + '<h1 class="names">' + names + '</h1>';
    if(cfg.subtitle) h += '<div class="subtitle">' + esc(cfg.subtitle) + '</div>';
    h += '<div class="rule"></div>';
    h += '<div class="date">' + (dateLong ? esc(dateLong) : 'Date à venir') + '</div>';
    if(hasDate) h += '<div class="date-sub">' + esc(dateFull.split(' ')[0]) + (time ? ' · ' + esc(time) : '') + '</div>';
    if(hasDate && cfg.countdown){
      h += '<div class="countdown" aria-hidden="true">' +
        ['days:jours', 'hours:heures', 'mins:minutes', 'secs:secondes'].map(function(x){
          var a = x.split(':'); return '<div><div class="cd-num" data-cd="' + a[0] + '">—</div><div class="cd-lab">' + a[1] + '</div></div>';
        }).join('') + '</div>';
    }
    if(hasDate) h += '<button type="button" class="btn" data-ics>Ajouter à mon agenda</button>';
    h += (dp.bottom || '') + '</div>';

    // Sections (fond alterné automatiquement)
    var blocks = [];
    if(cfg.message) blocks.push({ id: 'message', html: '<div class="narrow">' + paras(cfg.message) + '</div>' });
    if(sec.story.on && (sec.story.text.trim() || preview)) blocks.push({ id: 'story', html: head('Notre histoire') + '<div class="narrow">' + (paras(sec.story.text) || placeholder(preview)) + '</div>' });
    var items = sec.program.items.filter(function(it){ return it.label.trim(); });
    if(sec.program.on && (items.length || preview)){
      blocks.push({ id: 'program', html: head('Programme') + (items.length ? '<ol class="timeline">' + items.map(function(it){
        return '<li><span class="t-time">' + esc(hm(it.time)) + '</span><span class="t-dot" aria-hidden="true"></span><span class="t-label">' + esc(it.label) + '</span></li>';
      }).join('') + '</ol>' : placeholder(preview)) });
    }
    if(cfg.venueName){
      var lieu = head('Lieu') + '<div class="lieu-name">' + esc(cfg.venueName) + '</div>';
      if(cfg.venueAddress) lieu += '<div class="lieu-address">' + esc(cfg.venueAddress) + '</div>';
      if(maps) lieu += '<div class="center"><a class="maps-btn" href="' + esc(maps) + '" target="_blank" rel="noopener">Ouvrir dans Maps</a></div>';
      if(photos.length > 1) lieu += '<div class="gallery">' + photos.slice(1).map(function(p){ return '<img loading="lazy" src="' + p + '" alt="">'; }).join('') + '</div>';
      blocks.push({ id: 'lieu', html: lieu });
    }
    [['dress', 'Dress code', null], ['lodging', 'Hébergement', 'Voir les hébergements'], ['practical', 'Infos pratiques', null], ['gifts', 'Liste de mariage', 'Voir la liste']].forEach(function(x){
      var s = sec[x[0]], l = x[2] ? safeLink(s.url) : null;
      if(!s.on || !(s.text.trim() || l || preview)) return;
      blocks.push({ id: x[0], html: head(x[1]) + '<div class="narrow">' + (paras(s.text) || (l ? '' : placeholder(preview))) + '</div>' + linkBtn(l, x[2]) });
    });

    // RSVP
    var rs = head('Merci de confirmer votre présence'), dl = parseDate(cfg.rsvp.deadline);
    if(dl){
      var today = new Date(); today.setHours(0, 0, 0, 0);
      rs += '<p class="deadline">' + (dl < today && !preview
        ? 'La date limite de réponse (' + esc(longDate(dl)) + ') est passée, mais vous pouvez encore nous répondre.'
        : 'Merci de répondre avant le ' + esc(longDate(dl)) + '.') + '</p>';
    }
    if(preview) rs += '<p class="preview-note">Aperçu : le formulaire sera actif une fois le faire-part publié.</p>';
    if(opts.previousName) rs += '<p class="preview-note">Vous avez déjà répondu (' + esc(opts.previousName) + '). Une nouvelle réponse remplacera la précédente.</p>';
    var contact = cfg.rsvp.email || cfg.rsvp.phone || cfg.rsvp.address;
    rs += '<div class="form-wrap">' + rsvpHtml(cfg, preview) + '<p class="privacy">' +
      (contact ? 'Vos réponses et coordonnées sont transmises uniquement aux mariés, pour l’organisation de leur mariage.'
               : 'Vos réponses sont transmises uniquement aux mariés.') + '</p></div>';
    blocks.push({ id: 'rsvp', html: rs });

    blocks.forEach(function(b, i){ h += '<section class="sec-' + b.id + (i % 2 === 0 ? ' alt' : '') + '">' + b.html + '</section>'; });
    h += '<footer>' + divider() + '<div class="fnames">' + names + '</div>' + (dateLong ? '<div class="fdate">' + esc(dateLong) + '</div>' : '') + '</footer>';

    root.innerHTML = '<div class="fp-content">' + h + '</div>';
    bindRsvp(root, opts);

    var ics = root.querySelector('[data-ics]');
    if(ics) ics.addEventListener('click', function(){ downloadIcs(cfg); });

    if(hasDate && cfg.countdown){
      var target = FP.eventInstant(cfg);
      var tick = function(){
        var diff = Math.max(0, target - Date.now()), s = Math.floor(diff / 1000);
        var set = function(k, v){ var el = root.querySelector('[data-cd="' + k + '"]'); if(el) el.textContent = v; };
        set('days', Math.floor(s / 86400)); set('hours', pad(Math.floor(s % 86400 / 3600)));
        set('mins', pad(Math.floor(s % 3600 / 60))); set('secs', pad(s % 60));
      };
      tick(); timer = setInterval(tick, 1000);
    }

    // Intro : toujours sur la page publique (si choisie), à la demande dans l'aperçu.
    if(cfg.intro !== 'aucune' && (preview ? opts.playIntro : opts.intro !== false)) playIntro(root, cfg, opts);
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

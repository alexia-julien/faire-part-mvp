// Page d'accueil : exemple vivant (le vrai rendu d'un faire-part), galerie des ambiances, et passage vers l'éditeur
// avec les prénoms et l'ambiance choisis (dans le fragment d'URL : jamais envoyés au serveur).
(function(){
  'use strict';
  var FP = window.FP;
  var $ = function(id){ return document.getElementById(id); };
  var $$ = function(sel){ return Array.prototype.slice.call(document.querySelectorAll(sel)); };
  if(!FP || !FP.renderInvitation) return; // sans le moteur de rendu, la page reste lisible et les liens fonctionnent

  var STYLE_FIELDS = ['theme', 'font', 'intro', 'photoShape', 'decor', 'foil', 'texture'];
  var preset = FP.PRESETS[0], picked = false;

  function names(){ return { p1: $('p1').value.trim().slice(0, 40), p2: $('p2').value.trim().slice(0, 40) }; }
  function sample(p){
    var n = names(), c = FP.defaults();
    c.partner1 = n.p1 || 'Camille'; c.partner2 = n.p2 || 'Hugo';
    c.date = '2027-06-19'; c.time = '15:30'; c.tz = 'Europe/Paris';
    c.venueName = 'Domaine des Tilleuls'; c.venueAddress = 'Chemin des Vergers\n84220 Gordes';
    c.sections.program = FP.sectionDefaults('program', c);
    c.sections.dress = FP.sectionDefaults('dress', c);
    STYLE_FIELDS.forEach(function(f){ c[f] = p[f]; });
    return FP.sanitizeConfig(c);
  }

  // ---------- Exemple dans le téléphone ----------
  var phone = $('demo-phone'), demo = $('demo'), raf = 0;
  function renderDemo(playIntro){
    FP.renderInvitation(demo, sample(preset), { preview: true, playIntro: !!playIntro, introContainer: phone, namesTag: 'p' });
    if(!playIntro) phone.classList.remove('fp-locked');
  }
  function refresh(){
    if(raf) return;
    raf = requestAnimationFrame(function(){ raf = 0; renderDemo(false); minis(); hrefs(); });
  }
  FP.PRESETS.forEach(function(p, i){
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'pill'; b.textContent = p.label; b.setAttribute('aria-pressed', String(i === 0));
    b.addEventListener('click', function(){
      preset = p; picked = true;
      $$('#demo-pills .pill').forEach(function(x){ x.setAttribute('aria-pressed', String(x === b)); });
      renderDemo(false); phone.scrollTop = 0; hrefs();
    });
    $('demo-pills').appendChild(b);
  });

  // ---------- Galerie : chaque ambiance dessinée avec les prénoms saisis ; un clic ouvre l'éditeur dans ce style ----------
  var gallery = $('gallery');
  FP.PRESETS.forEach(function(p){
    var a = document.createElement('a'); a.className = 'style-card'; a.setAttribute('data-style', p.id);
    var m = document.createElement('span'); m.className = 'fp fp-mini'; m.setAttribute('aria-hidden', 'true');
    var n = document.createElement('span'); n.className = 'style-name'; n.textContent = p.label;
    var g = document.createElement('span'); g.className = 'style-go'; g.textContent = 'Commencer avec ce style';
    a.appendChild(m); a.appendChild(n); a.appendChild(g); gallery.appendChild(a);
  });
  function minis(){
    $$('.style-card').forEach(function(a){
      var p = FP.PRESETS.filter(function(x){ return x.id === a.getAttribute('data-style'); })[0], c = sample(p), m = a.firstChild;
      FP.applyStyleAttrs(m, c); m.innerHTML = FP.miniHtml(c); // miniHtml échappe les prénoms
    });
  }
  // Les polices des ambiances ne sont chargées qu'à l'approche de la galerie (une seule pour le haut de page).
  var fontsLoaded = false;
  function loadFonts(){ if(fontsLoaded) return; fontsLoaded = true; FP.PRESETS.forEach(function(p){ FP.loadFont(p.font); }); }
  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(es){ if(es.some(function(e){ return e.isIntersecting; })){ loadFonts(); io.disconnect(); } }, { rootMargin: '600px' });
    io.observe(gallery);
  } else loadFonts();
  $('demo-pills').addEventListener('click', loadFonts);

  // ---------- Liens vers l'éditeur ----------
  function target(styleId){
    var n = names(), h = new URLSearchParams();
    if(n.p1) h.set('p1', n.p1);
    if(n.p2) h.set('p2', n.p2);
    if(styleId) h.set('s', styleId);
    var s = h.toString();
    return 'creer.html' + (s ? '#' + s : '');
  }
  function hrefs(){
    $$('[data-create]').forEach(function(a){ a.href = target(picked ? preset.id : ''); });
    $$('.style-card').forEach(function(a){ a.href = target(a.getAttribute('data-style')); });
  }
  ['p1', 'p2'].forEach(function(id){
    $(id).addEventListener('input', refresh);
    $(id).addEventListener('keydown', function(e){ if(e.key === 'Enter'){ e.preventDefault(); location.href = target(picked ? preset.id : ''); } });
  });

  // ---------- Visiteur déjà connecté dans ce navigateur ----------
  (function(){
    var s = null;
    try{ s = JSON.parse(localStorage.getItem('fp:session') || 'null'); }catch(e){}
    if(!s || !s.user || typeof s.user.id !== 'string') return;
    $('nav-mine').textContent = 'Mon faire-part'; $('back-home').hidden = false;
  })();

  renderDemo(true); minis(); hrefs();
})();

// Page publique : charge le faire-part par son identifiant et l'affiche avec le formulaire RSVP.
(function(){
  'use strict';
  var FP = window.FP, root = document.getElementById('root');
  var slug = FP.params().slug;

  function fail(msg){ root.className = 'state'; root.textContent = msg; }
  if(!slug) return fail('Lien incomplet : il manque l’identifiant du faire-part.');

  // Mémorise dans CE navigateur la réponse envoyée, avec un identifiant anonyme : l'invité peut la retrouver et la corriger
  // (formulaire pré-rempli), et la page de suivi sait que la nouvelle réponse remplace l'ancienne. Rien n'est envoyé en plus.
  var KEY = 'fp:answered:' + slug, previous = null, FIELDS = ['name', 'attendance', 'guests', 'children', 'companions', 'brunch', 'diet', 'email', 'phone', 'address', 'custom', 'message'];
  try{ previous = JSON.parse(localStorage.getItem(KEY) || 'null'); }catch(e){}
  if(!previous || typeof previous !== 'object' || !/^[a-z0-9]{12,32}$/.test(previous.rid || '')) previous = null;
  var rid = previous ? previous.rid : FP.randomKey(16);
  function clean(d){ // n'accepte que les champs du formulaire, en texte ou nombre, longueur bornée
    var out = {};
    if(!d || typeof d !== 'object') return out;
    FIELDS.forEach(function(k){
      var v = d[k];
      if(typeof v === 'number' && isFinite(v)) out[k] = Math.max(0, Math.min(20, Math.floor(v)));
      else if(typeof v === 'string') out[k] = v.slice(0, 1000);
    });
    if(out.attendance !== 'yes' && out.attendance !== 'no') delete out.attendance;
    return out;
  }
  var prevData = null;
  if(previous){
    prevData = clean(previous.data);
    if(!prevData.name && typeof previous.name === 'string') prevData.name = previous.name.slice(0, 120); // réponses d'avant cette version
    if(!prevData.name) prevData = null;
  }
  var openedAt = 0; // pour la durée de réponse (mesure du funnel), comptée à partir de l'affichage du faire-part

  FP.api.getInvitation(slug).then(function(raw){
    if(!raw) return fail('Ce faire-part est introuvable. Vérifiez le lien reçu.');
    var cfg = FP.sanitizeConfig(raw);
    document.title = cfg.partner1 + ' & ' + cfg.partner2 + ' — Vous êtes invités';
    openedAt = Date.now();
    FP.renderInvitation(root, cfg, {
      previous: prevData,
      // US-14 : lien discret vers Maison Meli, uniquement après la réponse, avec la provenance « faire-part ».
      madeWith: new URL('./?src=faire-part', location.href).href,
      onMadeWith: function(){ if(FP.track) FP.track('cta_create', {}, slug); },
      onSubmit: function(data){
        var payload = Object.assign({}, data, { rid: rid, elapsed: Math.max(0, Math.min(86400, Math.round((Date.now() - openedAt) / 1000))) });
        return FP.api.submitRsvp(slug, payload).then(function(){
          try{ localStorage.setItem(KEY, JSON.stringify({ rid: rid, name: data.name, data: clean(data) })); }catch(e){}
        });
      }
    });
    // Fond de page (au-delà du faire-part) et barre du navigateur mobile assortis à la palette.
    var paper = getComputedStyle(root).getPropertyValue('--paper').trim();
    if(paper){
      document.documentElement.style.backgroundColor = paper; document.body.style.backgroundColor = paper;
      var tc = document.querySelector('meta[name=theme-color]'); if(tc) tc.setAttribute('content', paper);
    }
  }).catch(function(){
    fail('Impossible de charger le faire-part pour le moment. Merci de réessayer dans un instant.');
  });
})();

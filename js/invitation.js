// Page publique : charge le faire-part par son identifiant et l'affiche avec le formulaire RSVP.
(function(){
  'use strict';
  var FP = window.FP, root = document.getElementById('root');
  var slug = FP.params().slug;

  function fail(msg){ root.className = 'state'; root.textContent = msg; }
  if(!slug) return fail('Lien incomplet : il manque l’identifiant du faire-part.');

  FP.api.getInvitation(slug).then(function(cfg){
    if(!cfg) return fail('Ce faire-part est introuvable. Vérifiez le lien reçu.');
    document.title = (cfg.partner1 || '') + ' & ' + (cfg.partner2 || '') + ' — Vous êtes invités';
    FP.renderInvitation(root, cfg, { onSubmit: function(data){ return FP.api.submitRsvp(slug, data); } });
  }).catch(function(){
    fail('Impossible de charger le faire-part pour le moment. Merci de réessayer dans un instant.');
  });
})();

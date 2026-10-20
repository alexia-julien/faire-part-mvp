// Page publique : charge le faire-part par son identifiant et l'affiche avec le formulaire RSVP.
(function(){
  'use strict';
  var FP = window.FP, root = document.getElementById('root');
  var slug = FP.params().slug;

  function fail(msg){ root.className = 'state'; root.textContent = msg; }
  if(!slug) return fail('Lien incomplet : il manque l’identifiant du faire-part.');

  // Mémorise dans CE navigateur qu'une réponse a été envoyée, avec un identifiant anonyme : si l'invité
  // répond une seconde fois (pour corriger), la page de suivi sait que c'est la même personne.
  var KEY = 'fp:answered:' + slug, previous = null;
  try{ previous = JSON.parse(localStorage.getItem(KEY) || 'null'); }catch(e){}
  if(!previous || typeof previous !== 'object' || !/^[a-z0-9]{12,32}$/.test(previous.rid || '')) previous = null;
  var rid = previous ? previous.rid : FP.randomKey(16);

  FP.api.getInvitation(slug).then(function(raw){
    if(!raw) return fail('Ce faire-part est introuvable. Vérifiez le lien reçu.');
    var cfg = FP.sanitizeConfig(raw);
    document.title = cfg.partner1 + ' & ' + cfg.partner2 + ' — Vous êtes invités';
    document.documentElement.setAttribute('data-theme', cfg.theme);
    FP.renderInvitation(root, cfg, {
      previousName: previous && typeof previous.name === 'string' ? previous.name.slice(0, 120) : '',
      onSubmit: function(data){
        data.rid = rid;
        return FP.api.submitRsvp(slug, data).then(function(){
          try{ localStorage.setItem(KEY, JSON.stringify({ rid: rid, name: data.name })); }catch(e){}
        });
      }
    });
  }).catch(function(){
    fail('Impossible de charger le faire-part pour le moment. Merci de réessayer dans un instant.');
  });
})();

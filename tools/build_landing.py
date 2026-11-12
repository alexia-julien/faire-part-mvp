# Génère index.html (page d'accueil) : la FAQ visible et les données structurées viennent de la même liste.
import json, html, sys
OUT = sys.argv[1]
SITE = "https://maison-meli.com/"
TITLE = "Faire-part de mariage digital gratuit avec RSVP | Maison Meli"
DESC = "Créez votre faire-part de mariage en ligne en 3 minutes : 9 ambiances, un lien à partager et les réponses de vos invités suivies au même endroit. Gratuit."
FAQ = [
 ("Est-ce vraiment gratuit ?",
  "Oui. Créer le faire-part, le personnaliser, obtenir le lien à partager et suivre les réponses ne coûte rien, et aucune carte bancaire n’est demandée."),
 ("Faut-il créer un compte ?",
  "Oui, mais seulement au moment de publier : vous personnalisez d’abord votre faire-part librement. Le compte se crée avec votre adresse email (vous recevez un code à 6 chiffres, sans mot de passe à retenir) ou avec votre compte Google. Il sert à retrouver votre faire-part et les réponses depuis n’importe quel appareil."),
 ("Combien de temps faut-il pour créer un faire-part ?",
  "Environ 3 minutes. Seuls les prénoms, la date et le lieu sont obligatoires ; le style, les textes et les questions posées aux invités sont déjà pré-remplis et restent modifiables."),
 ("Comment mes invités répondent-ils ?",
  "Ils ouvrent le lien sur leur téléphone ou leur ordinateur et remplissent le formulaire intégré au faire-part. Ils n’ont rien à installer et aucun compte à créer."),
 ("Puis-je modifier le faire-part après l’avoir envoyé ?",
  "Oui, autant de fois que nécessaire. Le lien envoyé aux invités ne change pas et les réponses déjà reçues sont conservées."),
 ("Quelles informations puis-je demander à mes invités ?",
  "La présence et le nom sont toujours demandés. Vous pouvez ajouter le nombre de personnes, les enfants, les noms des accompagnants, le régime alimentaire et les allergies, la présence au brunch du lendemain, l’email, le téléphone, l’adresse postale, un message libre et une question personnalisée, avec une date limite de réponse."),
 ("Comment suivre les réponses ?",
  "Une fois connecté, votre page de suivi affiche le total des adultes, des enfants et des absents, la liste des régimes alimentaires pour le traiteur, une recherche, des filtres présents ou absents et un export CSV à ouvrir dans Excel ou Google Sheets."),
 ("Combien de faire-part puis-je créer ?",
  "Un faire-part par compte pour l’instant. Il peut contenir jusqu’à 3 photos et recevoir jusqu’à 1 000 réponses."),
 ("Comment envoyer le faire-part ?",
  "Copiez le lien et collez-le où vous voulez : WhatsApp, SMS, email ou réseaux sociaux. Maison Meli n’envoie pas de message à votre place et ne demande pas les coordonnées de vos invités."),
 ("Puis-je supprimer mon faire-part et les réponses ?",
  "Oui, à tout moment depuis votre page « Mon faire-part ». La suppression est définitive et efface aussi les réponses reçues. Vous pouvez aussi supprimer votre compte."),
]
STEPS = [
 ("Indiquez les prénoms, la date et le lieu", "Ce sont les seules informations obligatoires. L’aperçu se met à jour pendant que vous écrivez."),
 ("Choisissez une ambiance", "Neuf styles prêts en un clic, puis couleurs, typographie, ornements, dorure et photos si vous voulez aller plus loin."),
 ("Partagez le lien et suivez les réponses", "Vos invités répondent sur le faire-part. Vous voyez qui vient, combien, et les régimes alimentaires."),
]
e = html.escape
ld = [
 {"@context":"https://schema.org","@type":"WebSite","name":"Maison Meli","url":SITE,"inLanguage":"fr-FR","description":DESC},
 {"@context":"https://schema.org","@type":"WebApplication","name":"Maison Meli","url":SITE,"applicationCategory":"LifestyleApplication",
  "operatingSystem":"Web","browserRequirements":"Navigateur récent, sur téléphone ou ordinateur","inLanguage":"fr-FR",
  "description":"Créateur de faire-part de mariage digital avec formulaire de réponse (RSVP) intégré et suivi des réponses.",
  "offers":{"@type":"Offer","price":"0","priceCurrency":"EUR"},
  "featureList":["Faire-part de mariage en ligne à partager par lien","9 ambiances, 12 palettes de couleurs, 8 typographies","Formulaire de réponse (RSVP) intégré","Suivi des réponses et export CSV","Liste des régimes alimentaires pour le traiteur","Modifiable après l’envoi","Connexion par code email ou Google, sans mot de passe"]},
 {"@context":"https://schema.org","@type":"HowTo","name":"Créer un faire-part de mariage digital avec Maison Meli","totalTime":"PT3M",
  "step":[{"@type":"HowToStep","position":i+1,"name":n,"text":t} for i,(n,t) in enumerate(STEPS)]},
 {"@context":"https://schema.org","@type":"FAQPage",
  "mainEntity":[{"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}} for q,a in FAQ]},
]
ldjson = json.dumps(ld, ensure_ascii=False, separators=(",",":")).replace("</","<\\/")
faq_html = "\n".join('      <details class="q"><summary>%s</summary><p>%s</p></details>' % (e(q, False), e(a, False)) for q,a in FAQ)
steps_html = "\n".join('      <li><h3>%s</h3><p>%s</p></li>' % (e(n, False), e(t, False)) for n,t in STEPS)
HEART = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 21s-7.05-4.35-9.5-8.5C.7 9 2.2 5 6.3 5c2 0 3.6 1.1 5.7 3.6C14.1 6.1 15.7 5 17.7 5c4.1 0 5.6 4 3.8 7.5C19.05 16.65 12 21 12 21z' fill='%235F6E4E'/%3E%3C/svg%3E"
page = f'''<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#F6F2EA">
<title>{e(TITLE)}</title>
<meta name="description" content="{e(DESC)}">
<link rel="canonical" href="{SITE}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Maison Meli">
<meta property="og:locale" content="fr_FR">
<meta property="og:url" content="{SITE}">
<meta property="og:title" content="Le faire-part de mariage digital, gratuit, avec les réponses de vos invités">
<meta property="og:description" content="{e(DESC)}">
<meta property="og:image" content="{SITE}img/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Un faire-part de mariage Maison Meli affiché sur un téléphone">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Faire-part de mariage digital gratuit avec RSVP">
<meta name="twitter:description" content="{e(DESC)}">
<meta name="twitter:image" content="{SITE}img/og.png">
<link rel="icon" href="{HEART}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Mulish:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/invitation.css">
<link rel="stylesheet" href="css/landing.css">
<script type="application/ld+json">{ldjson}</script>
</head>
<body>
<a class="skip" href="#contenu">Aller au contenu</a>
<header class="top">
  <a class="logo" href="./" aria-label="Maison Meli, accueil">Maison Meli</a>
  <nav aria-label="Navigation principale">
    <a href="#ambiances">Ambiances</a>
    <a href="#questions">Questions</a>
    <a href="admin.html" id="nav-mine">Se connecter</a>
    <a class="btn btn-small" href="creer.html" data-create>Créer mon faire-part</a>
  </nav>
</header>

<main id="contenu">
  <section class="hero" aria-labelledby="h-hero">
    <div class="hero-text">
      <h1 id="h-hero">Le faire-part de mariage digital, gratuit, avec les réponses de vos invités</h1>
      <p class="lead">Écrivez vos prénoms, choisissez une ambiance, partagez un lien. Vos invités ouvrent l’enveloppe sur leur téléphone et répondent sur place. Prêt en 3 minutes.</p>
      <div class="start" id="start" role="group" aria-label="Commencer mon faire-part">
        <label>Premier prénom<input type="text" id="p1" maxlength="40" autocomplete="off" autocapitalize="words" placeholder="Camille"></label>
        <span class="start-amp" aria-hidden="true">&amp;</span>
        <label>Second prénom<input type="text" id="p2" maxlength="40" autocomplete="off" autocapitalize="words" placeholder="Hugo"></label>
        <a class="btn btn-big" href="creer.html" data-create id="cta-hero">Créer mon faire-part</a>
      </div>
      <p class="reassure">Gratuit, sans carte bancaire. Le compte se crée en dernier, au moment de publier.</p>
      <p class="back-home" id="back-home" hidden><a href="admin.html" id="back-link">Retrouver mon faire-part et les réponses</a></p>
    </div>
    <div class="hero-demo">
      <div class="demo-phone" id="demo-phone"><div id="demo"><p class="demo-fallback">Camille &amp; Hugo vous invitent à célébrer leur mariage, le 19 juin 2027.</p></div></div>
      <div class="demo-tools">
        <p id="demo-label">Essayez une ambiance sur cet exemple</p>
        <div class="pills" id="demo-pills" role="group" aria-labelledby="demo-label"></div>
      </div>
    </div>
  </section>

  <section class="how" aria-labelledby="h-how">
    <h2 id="h-how">Trois étapes, et le lien est prêt à envoyer</h2>
    <ol class="steps3">
{steps_html}
    </ol>
  </section>

  <section class="styles" id="ambiances" aria-labelledby="h-styles">
    <h2 id="h-styles">Neuf ambiances, de la plus champêtre à la plus habillée</h2>
    <p class="sub">Chacune règle d’un coup les couleurs, la typographie, les ornements et la finition, comme une collection chez un papetier. Choisissez-en une pour commencer : tout reste modifiable ensuite, avec 12 palettes, 8 typographies, la dorure et vos photos.</p>
    <div class="gallery" id="gallery">
      <noscript><p>Champêtre, Romantique, Château, Élégance, Gatsby, Jardin d’hiver, Bohème, Porcelaine, Minimaliste.</p></noscript>
    </div>
  </section>

  <section class="inside" aria-labelledby="h-inside">
    <h2 id="h-inside">Un faire-part pour vos invités, un tableau de suivi pour vous</h2>
    <div class="two">
      <div>
        <h3>Ce que reçoivent vos invités</h3>
        <ul>
          <li>Une enveloppe à ouvrir ou votre monogramme, puis le faire-part à vos couleurs</li>
          <li>La date, l’heure, le lieu et un bouton vers le plan d’accès</li>
          <li>Un compte à rebours et l’ajout de la date à leur agenda</li>
          <li>Les sections dont vous avez besoin : votre histoire, le programme de la journée, le dress code, les hébergements, les infos pratiques, la liste de mariage</li>
          <li>Le formulaire de réponse, directement dans la page</li>
        </ul>
      </div>
      <div>
        <h3>Ce que vous suivez</h3>
        <ul>
          <li>Qui vient, qui ne vient pas, et le total des adultes et des enfants</li>
          <li>Les régimes alimentaires et allergies, regroupés pour le traiteur</li>
          <li>La présence au brunch du lendemain et les noms des accompagnants</li>
          <li>Les emails de vos invités à copier d’un clic, si vous les demandez</li>
          <li>Un export CSV à ouvrir dans Excel ou Google Sheets</li>
        </ul>
      </div>
    </div>
  </section>

  <section class="nokey" aria-labelledby="h-nokey">
    <h2 id="h-nokey">Un compte, sans mot de passe</h2>
    <div class="two">
      <p>Vous personnalisez votre faire-part sans rien créer. Au moment de publier, vous indiquez votre <strong>adresse email</strong> et recevez un code à 6 chiffres, ou vous continuez avec <strong>Google</strong>. C’est tout.</p>
      <p>Ce compte garde votre faire-part et les réponses de vos invités : vous les retrouvez depuis votre téléphone ou votre ordinateur, sans lien à conserver. Vos invités, eux, n’ont aucun compte à créer.</p>
    </div>
  </section>

  <section class="faq" id="questions" aria-labelledby="h-faq">
    <h2 id="h-faq">Questions fréquentes</h2>
    <div class="faq-list">
{faq_html}
    </div>
  </section>

  <section class="final" aria-labelledby="h-final">
    <h2 id="h-final">Votre faire-part peut partir ce soir</h2>
    <p>Prénoms, date, lieu : le reste est déjà prêt.</p>
    <a class="btn btn-big btn-light" href="creer.html" data-create>Créer mon faire-part</a>
  </section>
</main>

<footer class="foot">
  <p class="logo">Maison Meli</p>
  <nav aria-label="Pied de page">
    <a href="creer.html" data-create>Créer mon faire-part</a>
    <a href="admin.html">Mon faire-part</a>
    <a href="confidentialite.html">Confidentialité</a>
  </nav>
</footer>
<script src="js/render.js"></script>
<script src="js/landing.js"></script>
</body>
</html>
'''
open(OUT, "w", encoding="utf-8").write(page)
print(len(page), "octets ;", len(TITLE), "car. titre ;", len(DESC), "car. description")

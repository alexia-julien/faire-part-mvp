// Textes de la page d'accueil : la FAQ visible et les données structurées (SEO/GEO) viennent de la même source.
export const TITLE = "Faire-part de mariage digital gratuit avec RSVP | Maison Meli";
export const DESC = "Créez votre faire-part de mariage en ligne en 3 minutes : 9 ambiances, une enveloppe qui s’ouvre, un lien à partager et les réponses de vos invités suivies au même endroit. Gratuit.";

export const FAQ: [string, string][] = [
  ["Est-ce vraiment gratuit ?", "Oui. Créer le faire-part, le personnaliser, obtenir le lien à partager et suivre les réponses ne coûte rien, et aucune carte bancaire n’est demandée."],
  ["Faut-il créer un compte ?", "Oui, mais seulement au moment de publier : vous personnalisez d’abord votre faire-part librement. Le compte se crée avec votre adresse email (vous recevez un code à 6 chiffres, sans mot de passe à retenir) ou avec votre compte Google. Il sert à retrouver votre faire-part et les réponses depuis n’importe quel appareil."],
  ["Combien de temps faut-il pour créer un faire-part ?", "Environ 3 minutes. Seuls les prénoms, la date et le lieu sont obligatoires ; le style, les textes et les questions posées aux invités sont déjà pré-remplis et restent modifiables."],
  ["Comment mes invités répondent-ils ?", "Ils ouvrent le lien sur leur téléphone ou leur ordinateur, ouvrent l’enveloppe, puis répondent directement sur le faire-part, une question à la fois. Ils n’ont rien à installer et aucun compte à créer."],
  ["Puis-je modifier le faire-part après l’avoir envoyé ?", "Oui, autant de fois que nécessaire. Le lien envoyé aux invités ne change pas et les réponses déjà reçues sont conservées."],
  ["Quelles informations puis-je demander à mes invités ?", "La présence et le nom sont toujours demandés. Vous pouvez ajouter le nombre de personnes, les enfants, les noms des accompagnants, le régime alimentaire et les allergies, la présence au brunch du lendemain, l’email, le téléphone, l’adresse postale, un message libre et une question personnalisée, avec une date limite de réponse."],
  ["Comment suivre les réponses ?", "Une fois connecté, votre page de suivi affiche le total des adultes, des enfants et des absents, la liste des régimes alimentaires pour le traiteur, une recherche, des filtres présents ou absents et un export CSV à ouvrir dans Excel ou Google Sheets."],
  ["Combien de faire-part puis-je créer ?", "Un faire-part par compte pour l’instant. Il peut contenir jusqu’à 3 photos et recevoir jusqu’à 1 000 réponses."],
  ["Comment envoyer le faire-part ?", "Partagez le lien en un geste sur WhatsApp, par SMS ou par email, ou affichez son QR code. Maison Meli n’envoie pas de message à votre place et ne demande pas les coordonnées de vos invités."],
  ["Puis-je supprimer mon faire-part et les réponses ?", "Oui, à tout moment depuis votre page « Mon faire-part ». La suppression est définitive et efface aussi les réponses reçues. Vous pouvez aussi supprimer votre compte."],
];

export const STEPS3: [string, string][] = [
  ["Indiquez les prénoms, la date et le lieu", "Ce sont les seules informations obligatoires. L’aperçu se met à jour pendant que vous écrivez."],
  ["Choisissez une ambiance", "Neuf collections prêtes en un geste, puis couleurs, typographie, ornements, dorure et photos si vous voulez aller plus loin."],
  ["Partagez le lien et suivez les réponses", "Vos invités ouvrent l’enveloppe et répondent sur le faire-part. Vous voyez qui vient, combien, et les régimes alimentaires."],
];

export const FEATURES = [
  "Faire-part de mariage en ligne à partager par lien",
  "Ouverture d’enveloppe animée, cachet de cire aux initiales",
  "9 ambiances, 12 palettes de couleurs, 8 typographies",
  "Formulaire de réponse (RSVP) intégré",
  "Suivi des réponses et export CSV",
  "Liste des régimes alimentaires pour le traiteur",
  "Modifiable après l’envoi",
  "Partage WhatsApp, SMS, email et QR code",
  "Connexion par code email ou Google, sans mot de passe",
];

export function jsonLd(site: string) {
  return [
    { "@context": "https://schema.org", "@type": "WebSite", name: "Maison Meli", url: site + "/", inLanguage: "fr-FR", description: DESC },
    { "@context": "https://schema.org", "@type": "WebApplication", name: "Maison Meli", url: site + "/", applicationCategory: "LifestyleApplication", operatingSystem: "Web",
      browserRequirements: "Navigateur récent, sur téléphone ou ordinateur", inLanguage: "fr-FR",
      description: "Créateur de faire-part de mariage digital avec formulaire de réponse (RSVP) intégré et suivi des réponses.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" }, featureList: FEATURES },
    { "@context": "https://schema.org", "@type": "HowTo", name: "Créer un faire-part de mariage digital avec Maison Meli", totalTime: "PT3M",
      step: STEPS3.map(([name, text], i) => ({ "@type": "HowToStep", position: i + 1, name, text })) },
    { "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
  ];
}

export const STORY = [
  { k: "Le premier contact", t: "Une enveloppe qui s’ouvre", d: "Un cachet de cire à vos initiales. Au toucher, il se fend, le rabat s’ouvre et la carte glisse jusqu’à eux. Le moment qu’ils captureront pour le partager." },
  { k: "Le jour J approche", t: "Un compte à rebours, et tout ce qu’il faut savoir", d: "La date, le lieu en un geste vers le plan, le programme de la journée, le dress code, l’ajout à l’agenda." },
  { k: "La réponse", t: "Une question à la fois", d: "Présence, nombre de personnes, régimes en pastilles. Trente secondes, sans compte ni application, et vous recevez tout au même endroit." },
];

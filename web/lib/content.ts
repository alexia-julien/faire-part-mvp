// Textes de la page d'accueil : la FAQ visible et les données structurées (SEO/GEO) viennent de la même source.
import { ENTITY, PAGES } from "./site";
import { faqPage, webApplication, website } from "./schema";

export const TITLE = PAGES.home.title;
export const DESC = PAGES.home.description;

// Paragraphe-définition sous le héros (40 à 60 mots) : autonome et citable tel quel par les moteurs IA.
export const DEFINITION = ENTITY + " Vous composez votre faire-part en ligne en trois minutes environ, vous le partagez par un lien sur WhatsApp, par SMS ou par e-mail, et vos invités répondent directement dessus, sans application ni compte à créer.";

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
  ["Un faire-part de mariage digital, c’est poli ?", "Oui, s’il est soigné et personnel. Le faire-part envoyé par lien est désormais courant : il arrive le jour même, se garde dans le téléphone et permet de répondre en un geste. Pour quelques proches très attachés au papier, un appel ou un mot de vive voix complète très bien l’envoi."],
  ["Et pour les grands-parents ou les invités peu à l’aise avec le téléphone ?", "Ils touchent simplement le lien reçu, comme pour une photo : aucune application à installer, aucun mot de passe. Les informations sont écrites en grand et la réponse se fait une question à la fois. Un proche peut aussi répondre pour eux depuis son propre téléphone."],
  ["Mes invités doivent-ils installer une application ?", "Non. Le faire-part s’ouvre dans le navigateur du téléphone ou de l’ordinateur, sur iPhone comme sur Android. Les invités n’ont ni application à télécharger ni compte à créer, même pour répondre."],
  ["Maison Meli imprime-t-il des faire-part papier ?", "Non, Maison Meli est 100 % digital : il n’imprime pas et n’envoie rien par la poste. Vous pouvez en revanche télécharger le QR code de votre faire-part et l’ajouter sur un support imprimé de votre choix."],
  ["Quand envoyer son faire-part de mariage ?", "Les guides mariage conseillent en général d’envoyer le faire-part entre trois et six mois avant la date, et un save the date six à douze mois avant pour un mariage en été, à l’étranger ou pendant les vacances. Le lien Maison Meli part le jour même : vous pouvez l’envoyer dès que le lieu et l’horaire sont confirmés."],
];

// Tableau factuel Maison Meli / papier / modèle Canva (relevé du 20/11/2026, sources dans le comparatif papier ou digital).
export const COMPARE: { head: string[]; rows: string[][] } = {
  head: ["", "Maison Meli", "Faire-part papier", "Modèle Canva"],
  rows: [
    ["Prix", "Gratuit", "425 € en moyenne pour 100 invitations et la papeterie (Mariages.net), plus le timbre : 1,52 € en 2026, 1,67 € en 2027", "Modèles gratuits ; impression et modèles premium payants"],
    ["Délai d’envoi", "Le jour même, par lien", "Impression et livraison, puis 3 jours de courrier en Lettre verte", "Le jour même si vous envoyez l’image ou le PDF"],
    ["Réponses des invités", "Intégrées au faire-part, suivies dans un tableau", "Carton-réponse, e-mail ou téléphone, à compiler à la main", "Pas intégrées par défaut : formulaire séparé ou application tierce"],
    ["Modification après l’envoi", "Oui, même lien", "Non, il faut réimprimer", "Il faut renvoyer une nouvelle version"],
    ["Régimes alimentaires", "Collectés et regroupés pour le traiteur", "À demander et noter soi-même", "À demander dans un formulaire séparé"],
  ],
};

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

export function jsonLd() {
  return [
    website(),
    webApplication(FEATURES),
    { "@context": "https://schema.org", "@type": "HowTo", name: "Créer un faire-part de mariage digital avec Maison Meli", totalTime: "PT3M",
      step: STEPS3.map(([name, text], i) => ({ "@type": "HowToStep", position: i + 1, name, text })) },
    faqPage(FAQ),
  ];
}

export const STORY = [
  { k: "Le premier contact", t: "Une enveloppe qui s’ouvre", d: "Un cachet de cire à vos initiales. Au toucher, il se fend, le rabat s’ouvre et la carte glisse jusqu’à eux. Le moment qu’ils captureront pour le partager." },
  { k: "Le jour J approche", t: "Un compte à rebours, et tout ce qu’il faut savoir", d: "La date, le lieu en un geste vers le plan, le programme de la journée, le dress code, l’ajout à l’agenda." },
  { k: "La réponse", t: "Une question à la fois", d: "Présence, nombre de personnes, régimes en pastilles. Trente secondes, sans compte ni application, et vous recevez tout au même endroit." },
];

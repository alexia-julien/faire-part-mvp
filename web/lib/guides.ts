// Guides et comparatifs (familles E et F du brief). Rédigés avec l'aide d'une IA : chaque article reste en noindex
// (index: false, hors plan du site) tant que Julien ne l'a pas relu et validé (protocole de la section 8 du brief).
// Pour publier un article relu : passer `index` à true et mettre à jour `updated`. Un article par semaine au maximum.
import type { Page } from "./site";

export type Guide = Page & { published: string; headline: string; kind: "guide" | "comparatif"; summary: string };

const G = (g: Guide) => g;

export const GUIDES = {
  digital: G({ kind: "guide", path: "/guide/faire-part-mariage-digital/", crumb: "Le faire-part digital", index: true, published: "2026-11-21", updated: "2026-11-21", priority: 0.7,
    title: "Faire-part de mariage digital : le guide complet (2027)", headline: "Le faire-part de mariage digital : le guide complet",
    description: "Qu’est-ce qu’un faire-part de mariage digital, est-ce poli, comment l’envoyer et suivre les réponses : avantages, limites et étiquette, exemples à l’appui.",
    summary: "Définition, avantages, limites, étiquette, envoi et réponses : tout ce qu’il faut savoir avant de choisir.", ogTitle: "Le faire-part de mariage digital : le guide complet" }),
  textes: G({ kind: "guide", path: "/guide/texte-faire-part-mariage/", crumb: "40 textes de faire-part", index: true, published: "2026-11-21", updated: "2026-11-21", priority: 0.7,
    title: "Texte faire-part mariage : 40 exemples à copier (2027)", headline: "Texte de faire-part de mariage : 40 exemples à copier",
    description: "40 textes de faire-part de mariage à copier : classiques, simples, originaux, humour, mariage civil, sans enfants, cagnotte. Avec les règles de rédaction.",
    summary: "Classiques, simples, originaux, avec humour, pour un mariage civil, sans enfants ou avec cagnotte.", ogTitle: "Texte de faire-part de mariage : 40 exemples" }),
  reponses: G({ kind: "guide", path: "/guide/reponses-invites-mariage/", crumb: "Les réponses des invités", index: true, published: "2026-11-21", updated: "2026-11-21", priority: 0.7,
    title: "Réponses des invités au mariage : délais, relances, régimes", headline: "Organiser les réponses de ses invités",
    description: "Date limite de réponse, relances, accompagnants, enfants, régimes alimentaires : la méthode pour obtenir toutes les réponses de vos invités à temps.",
    summary: "Date limite, relances, accompagnants, enfants, régimes : la méthode pour tout recevoir à temps.", ogTitle: "Organiser les réponses de ses invités" }),
  quand: G({ kind: "guide", path: "/guide/quand-envoyer-faire-part-mariage/", crumb: "Quand envoyer ses faire-part", index: true, published: "2026-11-21", updated: "2026-11-21", priority: 0.6,
    title: "Quand envoyer ses faire-part de mariage ? Délais (2027)", headline: "Quand envoyer ses faire-part de mariage ?",
    description: "Combien de mois avant envoyer ses faire-part de mariage, le save the date et la date limite de réponse : les délais des guides comparés, cas par cas.",
    summary: "Les délais conseillés par les guides mariage, comparés, et les cas particuliers : été, étranger, hiver, mariage proche.", ogTitle: "Quand envoyer ses faire-part de mariage ?" }),
  papier: G({ kind: "comparatif", path: "/comparatif/faire-part-papier-ou-digital/", crumb: "Papier ou digital ?", index: true, published: "2026-11-21", updated: "2026-11-21", priority: 0.6,
    title: "Faire-part papier ou digital : le comparatif honnête", headline: "Faire-part papier ou digital : lequel choisir ?",
    description: "Faire-part de mariage papier ou digital : prix, délais, réponses des invités, écologie, étiquette. Le comparatif honnête, avec les limites du digital.",
    summary: "Prix, délais, réponses, écologie, étiquette : le comparatif honnête, limites du digital comprises.", ogTitle: "Faire-part papier ou digital : lequel choisir ?" }),
  canva: G({ kind: "comparatif", path: "/comparatif/alternative-canva-faire-part/", crumb: "Alternative à Canva", index: true, published: "2026-11-21", updated: "2026-11-21", priority: 0.6,
    title: "Alternative à Canva pour un faire-part de mariage", headline: "Une alternative à Canva pour son faire-part de mariage",
    description: "Canva ou un outil spécialisé pour votre faire-part de mariage ? Ce que chacun fait bien, ce qui manque à Canva (réponses des invités) et comment choisir.",
    summary: "Ce que Canva fait très bien, ce qui lui manque pour un mariage, et quand choisir un outil spécialisé.", ogTitle: "Une alternative à Canva pour son faire-part" }),
} satisfies Record<string, Guide>;

export const GUIDE_LIST: Guide[] = Object.values(GUIDES);
export const GUIDE_LINKS: Guide[] = [GUIDES.digital, GUIDES.textes, GUIDES.reponses];

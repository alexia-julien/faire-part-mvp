// Registre des pages publiques : une seule source pour les métadonnées (title, description, canonical, Open Graph),
// le plan du site (sitemap.xml), le fil d'Ariane et les liens internes. Brief SEO/GEO du 20/11/2026, sections 4 à 6.
import type { Metadata } from "next";
import { SITE } from "./config";

export { SITE };
export const BRAND = "Maison Meli";
// Phrase de présentation de l'entité, à répéter mot pour mot partout (site, réseaux, annuaires, presse).
export const ENTITY = "Maison Meli est un créateur de faire-part de mariage digital, gratuit, avec suivi des réponses des invités, conçu en France.";
export const FOUNDER = { name: "Julien Meli", url: SITE + "/a-propos/#julien" };
// Profils officiels de la marque (JSON-LD sameAs) : à compléter dès qu'ils existent (Instagram, Pinterest, TikTok…).
export const SAME_AS: string[] = [];

export type Page = {
  path: string;          // adresse canonique, avec barre finale
  title: string;         // ≤ 60 caractères
  description: string;   // 140 à 155 caractères
  updated: string;       // vraie date de dernière modification du contenu (AAAA-MM-JJ), pour lastmod
  index: boolean;        // false : noindex et absente du plan du site
  crumb: string;         // libellé court (fil d'Ariane, menus)
  og?: string;           // nom de l'image Open Graph générée (app/og/[file]) ; par défaut, dérivé de path
  ogTitle?: string;      // texte de l'image Open Graph
  priority?: number;
};

const P = (p: Page) => p;

export const PAGES = {
  home: P({ path: "/", title: "Faire-part de mariage digital gratuit avec RSVP | Maison Meli", crumb: "Accueil", index: true, updated: "2026-11-20", priority: 1,
    description: "Créez votre faire-part de mariage en 3 minutes : 9 ambiances, une enveloppe qui s’ouvre, un lien à partager et les réponses de vos invités. Gratuit.",
    og: "accueil", ogTitle: "Le faire-part de mariage digital qui fait dire « oh »" }),
  ambiances: P({ path: "/ambiances/", title: "Ambiances de faire-part de mariage digital | Maison Meli", crumb: "Ambiances", index: true, updated: "2026-11-20", priority: 0.9,
    description: "Champêtre, bohème, chic, Gatsby, minimaliste : 9 ambiances de faire-part de mariage digital, avec enveloppe animée et réponses des invités. Gratuit.",
    ogTitle: "Neuf ambiances de faire-part de mariage digital" }),
  rsvp: P({ path: "/rsvp-mariage-en-ligne/", title: "RSVP mariage en ligne gratuit : suivez vos invités", crumb: "Réponses des invités", index: true, updated: "2026-11-20", priority: 0.9,
    description: "Le RSVP de mariage en ligne, intégré au faire-part : présence, accompagnants, enfants, régimes alimentaires, export CSV. Sans relance ni tableur. Gratuit.",
    ogTitle: "Les réponses de vos invités, sans relance ni tableur" }),
  whatsapp: P({ path: "/faire-part-mariage-whatsapp/", title: "Envoyer son faire-part de mariage sur WhatsApp | Maison Meli", crumb: "Envoi sur WhatsApp", index: true, updated: "2026-11-20", priority: 0.9,
    description: "Envoyez votre faire-part de mariage sur WhatsApp, par SMS ou par e-mail en un seul lien : vos invités l’ouvrent et répondent sans application. Gratuit.",
    ogTitle: "Votre faire-part de mariage sur WhatsApp, en un lien" }),
  exemple: P({ path: "/exemples/camille-et-thomas/", title: "Exemple de faire-part de mariage digital | Maison Meli", crumb: "Exemple", index: true, updated: "2026-11-20", priority: 0.8,
    description: "Ouvrez un vrai faire-part de mariage digital Maison Meli : l’enveloppe, le programme, la réponse des invités. Un exemple fictif à tester librement.",
    ogTitle: "Le faire-part de Camille et Thomas (exemple)" }),
  tarifs: P({ path: "/tarifs/", title: "Tarifs Maison Meli : faire-part de mariage gratuit", crumb: "Tarifs", index: true, updated: "2026-11-20", priority: 0.7,
    description: "Ce qui est gratuit chez Maison Meli et ce qui le restera : création, ambiances, lien de partage, réponses des invités et export. Sans carte bancaire.",
    ogTitle: "Ce qui est gratuit, et ce qui le restera" }),
  apropos: P({ path: "/a-propos/", title: "Maison Meli : née d’un vrai mariage", crumb: "À propos", index: true, updated: "2026-11-20", priority: 0.6,
    description: "Qui est derrière Maison Meli, pourquoi ce faire-part de mariage digital existe et comment il est conçu : l’histoire, les principes et le contact.",
    ogTitle: "Pourquoi Maison Meli existe" }),
  mentions: P({ path: "/mentions-legales/", title: "Mentions légales | Maison Meli", crumb: "Mentions légales", index: true, updated: "2026-11-20", priority: 0.2,
    description: "Mentions légales du site maison-meli.com : éditeur, directeur de la publication, hébergeur, propriété intellectuelle et contact de Maison Meli.",
    ogTitle: "Mentions légales" }),
  confidentialite: P({ path: "/confidentialite/", title: "Confidentialité et données personnelles | Maison Meli", crumb: "Confidentialité", index: true, updated: "2026-11-20", priority: 0.3,
    description: "Ce que Maison Meli enregistre, pourquoi, combien de temps et chez qui : compte, faire-part, réponses des invités, mesure d’audience sans cookie.",
    ogTitle: "Confidentialité" }),
  conditions: P({ path: "/conditions/", title: "Conditions d’utilisation | Maison Meli", crumb: "Conditions d’utilisation", index: true, updated: "2026-11-19", priority: 0.2,
    description: "Les règles d’utilisation de Maison Meli, créateur gratuit de faire-part de mariage digital : le service, votre contenu, les réponses, la suppression.",
    ogTitle: "Conditions d’utilisation" }),
  guides: P({ path: "/guide/", title: "Guides du faire-part de mariage | Maison Meli", crumb: "Guides", index: true, updated: "2026-11-20", priority: 0.7,
    description: "Textes, délais, étiquette, réponses des invités : les guides Maison Meli pour organiser votre faire-part de mariage, avec des exemples à copier.",
    ogTitle: "Les guides du faire-part de mariage" }),
  outils: P({ path: "/outils/", title: "Outils gratuits pour votre faire-part de mariage", crumb: "Outils", index: true, updated: "2026-11-20", priority: 0.6,
    description: "Générateur de texte de faire-part et rétroplanning d’envoi : des outils simples et gratuits, sans compte, pour préparer votre faire-part de mariage.",
    ogTitle: "Des outils gratuits pour votre faire-part" }),
  generateur: P({ path: "/outils/generateur-texte-faire-part/", title: "Générateur de texte de faire-part de mariage gratuit", crumb: "Générateur de texte", index: true, updated: "2026-11-20", priority: 0.7,
    description: "Générez le texte de votre faire-part de mariage selon le ton, la cérémonie et les invités : un texte prêt à copier ou à mettre dans votre faire-part.",
    ogTitle: "Le texte de votre faire-part, en 30 secondes" }),
  retroplanning: P({ path: "/outils/retroplanning-faire-part/", title: "Rétroplanning du faire-part de mariage : calculez vos dates", crumb: "Rétroplanning", index: true, updated: "2026-11-20", priority: 0.7,
    description: "Indiquez la date de votre mariage : le rétroplanning calcule quand envoyer le save the date, le faire-part, la date limite de réponse et les relances.",
    ogTitle: "Quand envoyer chaque étape de votre faire-part" }),
  creer: P({ path: "/creer/", title: "Créer mon faire-part", crumb: "Créer mon faire-part", index: false, updated: "2026-11-20",
    description: "Créez votre faire-part de mariage digital avec réponses des invités intégrées. Gratuit." }),
  mine: P({ path: "/mon-faire-part/", title: "Mon faire-part", crumb: "Mon faire-part", index: false, updated: "2026-11-20", description: "" }),
} satisfies Record<string, Page>;

export type PageKey = keyof typeof PAGES;
export const url = (path: string) => SITE + path;
export const ogFile = (p: Page) => (p.og || (p.path.replace(/^\/|\/$/g, "").replace(/\//g, "-") || "accueil")) + ".png";

// Métadonnées Next.js d'une page : title absolu, description, canonical, robots, Open Graph et Twitter.
export function meta(p: Page, extra: { robots?: Metadata["robots"]; type?: "website" | "article"; published?: string } = {}): Metadata {
  const image = { url: "/og/" + ogFile(p), width: 1200, height: 630, alt: p.ogTitle || p.title };
  return {
    title: { absolute: p.title },
    description: p.description,
    alternates: { canonical: url(p.path) },
    robots: extra.robots || (p.index ? { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } : { index: false, follow: true }),
    openGraph: {
      type: extra.type || "website", siteName: BRAND, locale: "fr_FR", url: url(p.path), title: p.ogTitle || p.title, description: p.description, images: [image],
      ...(extra.type === "article" ? { publishedTime: extra.published, modifiedTime: p.updated, authors: [FOUNDER.url] } : {}),
    },
    twitter: { card: "summary_large_image", title: p.ogTitle || p.title, description: p.description, images: [image.url] },
  };
}

export const fmtDate = (iso: string) => new Date(iso + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

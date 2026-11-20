// Données structurées (JSON-LD, schema.org). Le balisage décrit uniquement ce qui est visible sur la page.
// Jamais d'aggregateRating sans vrais avis collectés. Les blocs application/ld+json ne s'exécutent pas : la CSP
// (scripts/postbuild.mjs) n'a pas besoin de les autoriser.
import { BRAND, ENTITY, FOUNDER, SAME_AS, SITE, ogFile, url, type Page } from "./site";

type Json = Record<string, unknown>;
const ctx = { "@context": "https://schema.org" };

export const ORG_ID = SITE + "/#organisation";
export const PERSON_ID = FOUNDER.url;

export function person(): Json {
  return { "@type": "Person", "@id": PERSON_ID, name: FOUNDER.name, url: FOUNDER.url, jobTitle: "Fondateur de Maison Meli", worksFor: { "@id": ORG_ID } };
}

export function organization(): Json {
  return {
    ...ctx, "@type": "Organization", "@id": ORG_ID, name: BRAND, url: SITE + "/", description: ENTITY,
    logo: { "@type": "ImageObject", url: SITE + "/logo.png", width: 512, height: 512 },
    founder: person(), areaServed: "FR", knowsLanguage: "fr-FR",
    ...(SAME_AS.length ? { sameAs: SAME_AS } : {}),
  };
}

export function website(): Json {
  return { ...ctx, "@type": "WebSite", "@id": SITE + "/#site", name: BRAND, url: SITE + "/", inLanguage: "fr-FR", description: ENTITY, publisher: { "@id": ORG_ID } };
}

export function webApplication(features: string[]): Json {
  return {
    ...ctx, "@type": "WebApplication", "@id": SITE + "/#application", name: BRAND, url: SITE + "/", applicationCategory: "LifestyleApplication",
    operatingSystem: "Web", browserRequirements: "Navigateur récent, sur téléphone ou ordinateur", inLanguage: "fr-FR",
    description: "Créateur de faire-part de mariage digital avec formulaire de réponse (RSVP) intégré et suivi des réponses des invités.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR", description: "Création, partage et suivi des réponses gratuits, sans carte bancaire." },
    featureList: features, publisher: { "@id": ORG_ID },
  };
}

export function faqPage(faq: readonly (readonly [string, string])[]): Json {
  return { ...ctx, "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };
}

export function breadcrumb(trail: readonly Pick<Page, "path" | "crumb">[]): Json {
  return { ...ctx, "@type": "BreadcrumbList", itemListElement: trail.map((p, i) => ({ "@type": "ListItem", position: i + 1, name: p.crumb, item: url(p.path) })) };
}

export function article(p: Page & { published: string; headline: string }): Json {
  return {
    ...ctx, "@type": "Article", headline: p.headline, description: p.description, inLanguage: "fr-FR",
    mainEntityOfPage: url(p.path), url: url(p.path), image: SITE + "/og/" + ogFile(p),
    datePublished: p.published, dateModified: p.updated, author: person(), publisher: { "@id": ORG_ID },
  };
}

export function JsonLd({ data }: { data: Json | Json[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

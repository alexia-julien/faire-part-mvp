import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { IS_STAGING } from "@/lib/config";

export const dynamic = "force-static";

// Brief SEO/GEO, section 7 : tout est autorisé, y compris les robots des moteurs IA (pour une marque inconnue, être lu
// rapporte plus que ça ne coûte). Les pages privées (éditeur, suivi, faire-part des clients) sont exclues par noindex
// dans leur HTML, JAMAIS ici : un robot bloqué ne verrait pas le noindex et pourrait indexer l'adresse quand même.
const BOTS = ["Googlebot", "Google-Extended", "Bingbot", "OAI-SearchBot", "ChatGPT-User", "GPTBot", "PerplexityBot", "ClaudeBot", "Claude-SearchBot", "Applebot", "Applebot-Extended"];

export default function robots(): MetadataRoute.Robots {
  // Recette (staging.maison-meli.com) : interdite à tous les robots, pour ne jamais concurrencer le vrai site.
  if (IS_STAGING) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [...BOTS.map((userAgent) => ({ userAgent, allow: "/" })), { userAgent: "*", allow: "/" }],
    sitemap: SITE + "/sitemap.xml",
  };
}

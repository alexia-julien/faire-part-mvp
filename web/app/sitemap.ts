import type { MetadataRoute } from "next";
import { allPages } from "@/lib/pages";
import { url } from "@/lib/site";

export const dynamic = "force-static";

// Seules les pages indexables y figurent ; lastmod = vraie date de modification du contenu (pas la date du build).
export default function sitemap(): MetadataRoute.Sitemap {
  return allPages().filter((p) => p.index).map((p) => ({ url: url(p.path), lastModified: p.updated, priority: p.priority }));
}

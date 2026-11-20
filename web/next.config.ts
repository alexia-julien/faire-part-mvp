import type { NextConfig } from "next";

// Export statique (GitHub Pages) : une page HTML par route, pré-rendue au build pour le SEO/GEO.
// Adresses propres avec barre finale (/creer/, /ambiances/champetre/). invitation.html est recréé par postbuild.mjs
// (les liens déjà envoyés aux invités restent valides pour toujours) ; les anciennes adresses .html redirigent (public/_redirects).
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

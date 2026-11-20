import type { NextConfig } from "next";

// Export statique (GitHub Pages) : une page HTML par route, pré-rendue au build pour le SEO/GEO.
// « creer » → creer.html, « invitation » → invitation.html… : les liens déjà envoyés restent valides.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: false,
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

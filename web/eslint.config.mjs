import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Encodeur de QR code recopié tel quel (ES5, @ts-nocheck) : on ne le réécrit pas.
    "lib/qr.ts",
  ]),
  {
    rules: {
      // Liens <a> voulus : chaque page exportée porte sa propre CSP (scripts/postbuild.mjs ; Google seulement sur
      // /creer/ et /mon-faire-part/). Une navigation côté client garderait la CSP de la page de départ.
      "@next/next/no-html-link-for-pages": "off",
    },
  },
]);

export default eslintConfig;

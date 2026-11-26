// Configuration Supabase. Les clés « anon » sont publiques par conception : l'accès aux données est verrouillé par les
// fonctions SQL (voir supabase/). Ne JAMAIS mettre ici une clé « service_role ».
//
// Trois façons de construire le site (variable lue au build) :
//   * production (par défaut)            : maison-meli.com, base Supabase de production.
//   * NEXT_PUBLIC_FP_ENV=staging         : staging.maison-meli.com, base Supabase de recette (aucune vraie donnée,
//                                          aucune mesure comptée en prod). Seule exception : /admin/, qui lit TOUJOURS
//                                          les statistiques de production (décision de Julien du 26/11/2026).
//   * NEXT_PUBLIC_FP_LOCAL=1             : mode local (données dans le navigateur, code de connexion 123456) : tests sans backend.
const LOCAL = process.env.NEXT_PUBLIC_FP_LOCAL === "1";
export const ENV: "production" | "staging" = process.env.NEXT_PUBLIC_FP_ENV === "staging" ? "staging" : "production";
export const IS_STAGING = ENV === "staging";

export const PROD_SUPABASE = {
  url: "https://pmtwhrqfdvbxbgrzcytl.supabase.co",
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtdHdocnFmZHZieGJncnpjeXRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1MjQ3MzEsImV4cCI6MjEwODEwMDczMX0.7jw9LLJC8dCBHe4fIPnLfgmIFVdbTC19oIR5ZytF-aw",
};
export const STAGING_SUPABASE = {
  url: "https://pcppyluqhsbhkjzmjpzk.supabase.co",
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjcHB5bHVxaHNiaGtqem1qcHprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU3MTQ4MzUsImV4cCI6MjExMTI5MDgzNX0.3Za1JrUuf45PYMl2gor2QvoiRzdTnIIbQ8OoGmCvEd8",
};

// Page /admin/ sur la recette : elle parle à la base de PRODUCTION (avec une session à part, pour ne pas mélanger
// le compte de recette et le compte administrateur).
const ADMIN_ON_STAGING = IS_STAGING && typeof window !== "undefined" && /^\/admin(\/|$)/.test(window.location.pathname);
const SUPA = ADMIN_ON_STAGING || !IS_STAGING ? PROD_SUPABASE : STAGING_SUPABASE;

export const CONFIG = {
  supabaseUrl: LOCAL ? "" : SUPA.url,
  supabaseKey: LOCAL ? "" : SUPA.key,
  // Clé de la session dans le stockage du navigateur.
  sessionKey: ADMIN_ON_STAGING ? "fp:session:prod" : "fp:session",
  // Identifiant public du client OAuth Google (projet Google Cloud « Maison Meli »).
  googleClientId: LOCAL ? "" : "682631444427-blcasnhnc55tc5lk49urhkic16dj8hf1.apps.googleusercontent.com",
};
export const IS_REMOTE = !!(CONFIG.supabaseUrl && CONFIG.supabaseKey);
export const SITE = IS_STAGING ? "https://staging.maison-meli.com" : "https://maison-meli.com";

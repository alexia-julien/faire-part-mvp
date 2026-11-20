// Configuration Supabase. La clé « anon » est publique par conception : l'accès aux données est verrouillé par les
// fonctions SQL (voir supabase/). Ne JAMAIS mettre ici la clé « service_role ».
// NEXT_PUBLIC_FP_LOCAL=1 au build = mode local (données dans le navigateur, code de connexion 123456) : tests sans backend.
const LOCAL = process.env.NEXT_PUBLIC_FP_LOCAL === "1";

export const CONFIG = {
  supabaseUrl: LOCAL ? "" : "https://pmtwhrqfdvbxbgrzcytl.supabase.co",
  supabaseKey: LOCAL ? "" : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtdHdocnFmZHZieGJncnpjeXRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1MjQ3MzEsImV4cCI6MjEwODEwMDczMX0.7jw9LLJC8dCBHe4fIPnLfgmIFVdbTC19oIR5ZytF-aw",
  // Identifiant public du client OAuth Google (projet Google Cloud « Maison Meli »).
  googleClientId: LOCAL ? "" : "682631444427-blcasnhnc55tc5lk49urhkic16dj8hf1.apps.googleusercontent.com",
};
export const IS_REMOTE = !!(CONFIG.supabaseUrl && CONFIG.supabaseKey);
export const SITE = "https://maison-meli.com";

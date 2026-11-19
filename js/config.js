// Configuration Supabase. La clé "anon" est publique par conception : l'accès aux données est verrouillé
// par les fonctions SQL (voir supabase/schema.sql). Ne JAMAIS mettre ici la clé "service_role".
// Laisser vide = mode local (données stockées dans le navigateur, pour développer et tester sans backend).
window.FP_CONFIG = {
  supabaseUrl: 'https://pmtwhrqfdvbxbgrzcytl.supabase.co',
  // Identifiant public du client OAuth Google (projet Google Cloud « Maison Meli ») : bouton « Se connecter avec Google ».
  googleClientId: '682631444427-blcasnhnc55tc5lk49urhkic16dj8hf1.apps.googleusercontent.com',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtdHdocnFmZHZieGJncnpjeXRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1MjQ3MzEsImV4cCI6MjEwODEwMDczMX0.7jw9LLJC8dCBHe4fIPnLfgmIFVdbTC19oIR5ZytF-aw'
};

// Renseigner après avoir créé le projet Supabase (Project Settings > API).
// La clé "anon" est publique par conception : l'accès aux données est verrouillé par les fonctions SQL (voir supabase/schema.sql).
// Laisser vide = mode local (données stockées dans le navigateur, pour développer et tester sans backend).
window.FP_CONFIG = {
  supabaseUrl: '',
  supabaseKey: ''
};

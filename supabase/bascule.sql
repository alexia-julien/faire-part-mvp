-- Comptes, étape 2 : LA BASCULE. À exécuter au moment où le site passe en « comptes uniquement ».
-- DESTRUCTIF ET DÉFINITIF : supprime les faire-part créés sans compte, les liens privés et les espaces testeurs.
-- À lancer après supabase/comptes.sql, en même temps que la mise en ligne du nouveau site.

delete from public.invitations where owner is null;           -- faire-part sans compte (et leurs réponses, en cascade)

drop function if exists public.create_invitation(text, text, jsonb);
drop function if exists public.update_invitation(text, text, jsonb);
drop function if exists public.delete_invitation(text, text);
drop function if exists public.delete_rsvp(text, text, bigint);
drop function if exists public.list_rsvps(text, text);
drop function if exists public.summarize_invitations(jsonb);
drop function if exists public.tester_workspace(text);
drop function if exists public.tester_attach(text, text, text);
drop function if exists public.tester_detach(text, text);

-- Espaces testeurs : tables et fonctions internes. Le journal private.events garde ses lignes (colonne tester_id sans référence).
alter table private.events drop constraint if exists events_tester_id_fkey;
drop table if exists private.tester_invitations;
drop table if exists private.testers;
drop function if exists private.tester_id(text);
drop function if exists private.create_tester(text);

-- Plus de clé : la gestion passe uniquement par le compte propriétaire.
alter table public.invitations drop column if exists key_hash;
alter table public.invitations alter column owner set not null;

-- Comptes (Supabase Auth), étape 1 : ajoute la gestion par compte SANS rien retirer (idempotent).
-- L'ancien fonctionnement (liens privés, espaces testeurs) continue de marcher tant que supabase/bascule.sql n'est pas exécuté.
--
--   * invitations.owner = le compte propriétaire. Un compte possède AU PLUS un faire-part (index unique).
--   * Toute la gestion passe par des fonctions « account_* » réservées aux visiteurs connectés (rôle authenticated) :
--     elles agissent sur LE faire-part du compte, sans identifiant ni clé à fournir.
--   * get_invitation et submit_rsvp restent publiques (invités), et deviennent aussi appelables une fois connecté.

alter table public.invitations add column if not exists owner uuid references auth.users(id) on delete cascade;
create unique index if not exists invitations_owner_one on public.invitations(owner) where owner is not null;
alter table public.invitations alter column key_hash drop not null; -- un faire-part de compte n'a pas de clé

-- Le compte connecté (null pour un visiteur, et pour une session anonyme si elles étaient activées un jour).
create or replace function private.account_id()
returns uuid language sql stable set search_path = ''
as $$
  select case when coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then null else auth.uid() end;
$$;
revoke all on function private.account_id() from public, anon, authenticated;

-- Le faire-part du compte : { slug, config, created_at, updated_at, responses, last_response }, ou null s'il n'en a pas.
create or replace function public.account_invitation()
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare v_uid uuid := private.account_id();
begin
  if v_uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  perform private.rate_limit('account', 240);
  return (select jsonb_build_object('slug', i.slug, 'config', i.config, 'created_at', i.created_at, 'updated_at', i.updated_at,
            'responses', (select count(*) from rsvps r where r.slug = i.slug),
            'last_response', (select max(r.created_at) from rsvps r where r.slug = i.slug))
            from invitations i where i.owner = v_uid);
end $$;

-- Création du faire-part du compte. Erreurs : 'one per account', ou 23505 si l'identifiant (slug) est déjà pris.
create or replace function public.account_create_invitation(p_slug text, p_config jsonb)
returns void language plpgsql security definer set search_path = public, extensions
as $$
declare v_uid uuid := private.account_id(); v_constraint text;
begin
  if v_uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  perform private.rate_limit('create', 10);
  perform private.check_config(p_config);
  if exists (select 1 from invitations where owner = v_uid) then raise exception 'one per account'; end if;
  begin
    insert into invitations(slug, config, owner) values (p_slug, p_config, v_uid);
  exception when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'invitations_owner_one' then raise exception 'one per account'; end if; -- deux créations simultanées
    raise;
  end;
  perform private.log_event('invitation_created', null, p_slug, jsonb_build_object('theme', p_config->>'theme', 'account', true));
end $$;

-- Modification : false si le compte n'a pas de faire-part.
create or replace function public.account_update_invitation(p_config jsonb)
returns boolean language plpgsql security definer set search_path = public, extensions
as $$
declare v_uid uuid := private.account_id(); v_slug text;
begin
  if v_uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  perform private.rate_limit('update', 30);
  perform private.check_config(p_config);
  update invitations set config = p_config, updated_at = now() where owner = v_uid returning slug into v_slug;
  if v_slug is null then return false; end if;
  perform private.log_event('invitation_updated', null, v_slug, jsonb_build_object('theme', p_config->>'theme'));
  return true;
end $$;

-- Suppression définitive du faire-part du compte et de ses réponses (le compte reste).
create or replace function public.account_delete_invitation()
returns boolean language plpgsql security definer set search_path = public, extensions
as $$
declare v_uid uuid := private.account_id(); v_slug text;
begin
  if v_uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  perform private.rate_limit('delete', 120);
  delete from invitations where owner = v_uid returning slug into v_slug;
  if v_slug is null then return false; end if;
  perform private.log_event('invitation_deleted', null, v_slug);
  return true;
end $$;

-- Réponses reçues par le faire-part du compte (null s'il n'en a pas).
create or replace function public.account_rsvps()
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare v_uid uuid := private.account_id(); v_slug text;
begin
  if v_uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  perform private.rate_limit('list', 120);
  select slug into v_slug from invitations where owner = v_uid;
  if v_slug is null then return null; end if;
  perform private.log_event('rsvps_listed', null, v_slug);
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'created_at', created_at, 'data', data) order by created_at)
                     from rsvps where slug = v_slug), '[]'::jsonb);
end $$;

-- Suppression d'une réponse du faire-part du compte : false si elle n'existe pas (ou appartient à un autre faire-part).
create or replace function public.account_delete_rsvp(p_id bigint)
returns boolean language plpgsql security definer set search_path = public, extensions
as $$
declare v_uid uuid := private.account_id();
begin
  if v_uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  perform private.rate_limit('delete', 120);
  delete from rsvps r using invitations i where i.owner = v_uid and r.slug = i.slug and r.id = p_id;
  return found;
end $$;

-- Suppression du compte, de son faire-part et des réponses reçues. Définitif.
create or replace function public.delete_account()
returns boolean language plpgsql security definer set search_path = public, extensions
as $$
declare v_uid uuid := private.account_id();
begin
  if v_uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  perform private.rate_limit('delete', 120);
  delete from invitations where owner = v_uid;
  delete from auth.users where id = v_uid;
  perform private.log_event('account_deleted');
  return true;
end $$;

-- Droits : les fonctions de compte sont réservées aux visiteurs connectés ; les deux fonctions des invités
-- (ouvrir un faire-part, répondre) doivent aussi marcher quand on est connecté.
do $$
declare f text;
begin
  foreach f in array array['public.account_invitation()', 'public.account_create_invitation(text, jsonb)',
    'public.account_update_invitation(jsonb)', 'public.account_delete_invitation()', 'public.account_rsvps()',
    'public.account_delete_rsvp(bigint)', 'public.delete_account()']
  loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end $$;
grant execute on function public.get_invitation(text) to authenticated;
grant execute on function public.submit_rsvp(text, jsonb) to authenticated;

-- Comptes (Supabase Auth) : un faire-part peut appartenir à un compte. À exécuter APRÈS schema.sql (idempotent).
--
-- Principe
--   * invitations.owner = le compte propriétaire (null = faire-part sans compte, géré par son lien privé, comme avant).
--   * Un compte possède AU PLUS un faire-part (index unique) : c'est la vraie limite « un faire-part par personne ».
--   * Le propriétaire connecté gère son faire-part sans la clé : chaque fonction de gestion accepte
--     « bonne clé » OU « je suis le propriétaire » (private.can_manage). Le lien privé continue de fonctionner.
--   * private.settings.require_account : 'false' = la création sans compte reste permise (transition) ;
--     'true' = il faut un compte (ou un espace testeur valide) pour créer un faire-part.
--       update private.settings set value = 'true' where name = 'require_account';
--   * Les espaces testeurs ne changent pas : un faire-part créé avec un jeton testeur valide n'a pas de propriétaire.

alter table public.invitations add column if not exists owner uuid references auth.users(id) on delete set null;
create unique index if not exists invitations_owner_one on public.invitations(owner) where owner is not null;

create table if not exists private.settings (name text primary key, value text not null);
alter table private.settings enable row level security;
revoke all on private.settings from public, anon, authenticated;
insert into private.settings(name, value) values ('require_account', 'false') on conflict (name) do nothing;

-- Le compte connecté (null pour un visiteur, et pour une session anonyme si elles étaient activées un jour).
create or replace function private.account_id()
returns uuid language sql stable set search_path = ''
as $$
  select case when coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then null else auth.uid() end;
$$;

-- Droit de gérer un faire-part : la bonne clé, ou être le compte propriétaire.
create or replace function private.can_manage(p_slug text, p_key text)
returns boolean language sql stable set search_path = public, extensions
as $$
  select exists (
    select 1 from invitations
     where slug = p_slug
       and (owner = private.account_id() or key_hash = crypt(coalesce(p_key, ''), key_hash)));
$$;
revoke all on function private.account_id() from public, anon, authenticated;
revoke all on function private.can_manage(text, text) from public, anon, authenticated;

-- Création : p_tester (jeton d'espace testeur) est facultatif. L'ancienne signature à 3 paramètres est remplacée ;
-- un appel avec 3 paramètres nommés continue de fonctionner (p_tester vaut null).
drop function if exists public.create_invitation(text, text, jsonb);
create or replace function public.create_invitation(p_slug text, p_key text, p_config jsonb, p_tester text default null)
returns void language plpgsql security definer set search_path = public, extensions
as $$
declare v_uid uuid := private.account_id(); v_owner uuid; v_constraint text;
begin
  perform private.rate_limit('create', 10);
  if length(coalesce(p_key, '')) < 16 or length(p_key) > 64 then raise exception 'invalid key'; end if;
  perform private.check_config(p_config);
  if private.tester_id(p_tester) is null then
    if v_uid is not null then
      if exists (select 1 from invitations where owner = v_uid) then raise exception 'one per account'; end if;
      v_owner := v_uid;
    elsif coalesce((select value from private.settings where name = 'require_account'), 'false') = 'true' then
      raise exception 'account required';
    end if;
  end if;
  begin
    insert into invitations(slug, key_hash, config, owner) values (p_slug, crypt(p_key, gen_salt('bf')), p_config, v_owner);
  exception when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'invitations_owner_one' then raise exception 'one per account'; end if; -- deux créations simultanées
    raise;
  end;
  perform private.log_event('invitation_created', null, p_slug,
    jsonb_build_object('theme', p_config->>'theme', 'account', v_owner is not null));
end $$;

create or replace function public.update_invitation(p_slug text, p_key text, p_config jsonb)
returns boolean language plpgsql security definer set search_path = public, extensions
as $$
declare v_ok boolean;
begin
  perform private.rate_limit('update', 30);
  perform private.check_config(p_config);
  if not private.can_manage(p_slug, p_key) then return false; end if;
  update invitations set config = p_config, updated_at = now() where slug = p_slug;
  v_ok := found;
  if v_ok then perform private.log_event('invitation_updated', null, p_slug, jsonb_build_object('theme', p_config->>'theme')); end if;
  return v_ok;
end $$;

create or replace function public.delete_invitation(p_slug text, p_key text)
returns boolean language plpgsql security definer set search_path = public, extensions
as $$
declare v_ok boolean;
begin
  perform private.rate_limit('delete', 120);
  if not private.can_manage(p_slug, p_key) then return false; end if;
  delete from invitations where slug = p_slug;
  v_ok := found;
  if v_ok then perform private.log_event('invitation_deleted', null, p_slug); end if;
  return v_ok;
end $$;

create or replace function public.delete_rsvp(p_slug text, p_key text, p_id bigint)
returns boolean language plpgsql security definer set search_path = public, extensions
as $$
begin
  perform private.rate_limit('delete', 120);
  if not private.can_manage(p_slug, p_key) then return false; end if;
  delete from rsvps where slug = p_slug and id = p_id;
  return true;
end $$;

create or replace function public.list_rsvps(p_slug text, p_key text)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
begin
  perform private.rate_limit('list', 120);
  if not private.can_manage(p_slug, p_key) then return null; end if;
  perform private.log_event('rsvps_listed', null, p_slug);
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'created_at', created_at, 'data', data) order by created_at)
                     from rsvps where slug = p_slug), '[]'::jsonb);
end $$;

create or replace function public.summarize_invitations(p_items jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare it jsonb; v_cfg jsonb; v_out jsonb := '[]'::jsonb;
begin
  perform private.rate_limit('summary', 120);
  if p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception 'invalid data'; end if;
  if jsonb_array_length(p_items) > 100 then raise exception 'too many'; end if;
  for it in select value from jsonb_array_elements(p_items) loop
    v_cfg := null;
    if jsonb_typeof(it) = 'object' and private.can_manage(it->>'slug', it->>'key') then
      select config into v_cfg from invitations where slug = it->>'slug';
    end if;
    if v_cfg is null then
      v_out := v_out || jsonb_build_array(jsonb_build_object('slug', left(coalesce(it->>'slug', ''), 63), 'invalid', true));
    else
      v_out := v_out || jsonb_build_array(jsonb_build_object(
        'slug', it->>'slug',
        'partner1', v_cfg->>'partner1', 'partner2', v_cfg->>'partner2', 'date', v_cfg->>'date', 'theme', v_cfg->>'theme',
        'responses', (select count(*) from rsvps where slug = it->>'slug'),
        'last_response', (select max(created_at) from rsvps where slug = it->>'slug')));
    end if;
  end loop;
  return v_out;
end $$;

-- Les faire-part du compte connecté (0 ou 1), au même format que summarize_invitations. null si personne n'est connecté.
create or replace function public.account_invitations()
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare v_uid uuid := private.account_id();
begin
  if v_uid is null then return null; end if;
  perform private.rate_limit('summary', 120);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'slug', i.slug, 'partner1', i.config->>'partner1', 'partner2', i.config->>'partner2', 'date', i.config->>'date', 'theme', i.config->>'theme',
      'responses', (select count(*) from rsvps r where r.slug = i.slug),
      'last_response', (select max(r.created_at) from rsvps r where r.slug = i.slug)))
    from invitations i where i.owner = v_uid), '[]'::jsonb);
end $$;

-- Rattache au compte connecté un faire-part créé sans compte (preuve : sa clé).
-- 'ok' | 'forbidden' (pas connecté, mauvaise clé, ou faire-part d'un espace testeur) | 'taken' (déjà à un autre compte) | 'limit' (ce compte en a déjà un)
create or replace function public.claim_invitation(p_slug text, p_key text)
returns text language plpgsql security definer set search_path = public, extensions
as $$
declare v_uid uuid := private.account_id(); v_owner uuid;
begin
  if v_uid is null then return 'forbidden'; end if;
  perform private.rate_limit('claim', 30);
  select owner into v_owner from invitations where slug = p_slug and key_hash = crypt(coalesce(p_key, ''), key_hash) for update;
  if not found then return 'forbidden'; end if;
  if v_owner = v_uid then return 'ok'; end if;
  if v_owner is not null then return 'taken'; end if;
  if exists (select 1 from private.tester_invitations where slug = p_slug) then return 'forbidden'; end if;
  if exists (select 1 from invitations where owner = v_uid) then return 'limit'; end if;
  begin
    update invitations set owner = v_uid where slug = p_slug;
  exception when unique_violation then return 'limit';
  end;
  perform private.log_event('invitation_claimed', null, p_slug);
  return 'ok';
end $$;

-- Suppression du compte connecté, de son faire-part et des réponses reçues. Définitif.
create or replace function public.delete_account()
returns boolean language plpgsql security definer set search_path = public, extensions
as $$
declare v_uid uuid := private.account_id();
begin
  if v_uid is null then return false; end if;
  perform private.rate_limit('delete', 120);
  delete from invitations where owner = v_uid;
  delete from auth.users where id = v_uid;
  perform private.log_event('account_deleted');
  return true;
end $$;

-- Droits : rien pour PUBLIC. Un visiteur connecté appelle l'API avec le rôle « authenticated » : il doit pouvoir faire
-- tout ce que fait un visiteur anonyme (ouvrir un faire-part, répondre…), plus les fonctions de compte.
do $$
declare f text;
begin
  foreach f in array array[
    'public.create_invitation(text, text, jsonb, text)', 'public.update_invitation(text, text, jsonb)',
    'public.delete_invitation(text, text)', 'public.delete_rsvp(text, text, bigint)', 'public.list_rsvps(text, text)',
    'public.summarize_invitations(jsonb)', 'public.get_invitation(text)', 'public.submit_rsvp(text, jsonb)',
    'public.tester_workspace(text)', 'public.tester_attach(text, text, text)', 'public.tester_detach(text, text)']
  loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated, service_role', f);
  end loop;
  foreach f in array array['public.account_invitations()', 'public.claim_invitation(text, text)', 'public.delete_account()']
  loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end $$;

-- Schéma Supabase du MVP faire-part.
-- À exécuter une fois dans Supabase > SQL Editor.
--
-- Principe de sécurité : les tables sont verrouillées (RLS activé, aucune policy, aucun droit direct pour anon).
-- Le navigateur ne passe QUE par les fonctions ci-dessous (SECURITY DEFINER) :
--   - n'importe qui peut lire un faire-part publié (get_invitation) et y répondre (submit_rsvp) ;
--   - seul le détenteur de la clé secrète peut modifier le faire-part ou lire les réponses.
-- La clé secrète n'est jamais stockée en clair (hash bcrypt).

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.invitations (
  slug       text primary key check (slug ~ '^[a-z0-9][a-z0-9-]{2,62}$'),
  key_hash   text not null,
  config     jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rsvps (
  id         bigint generated always as identity primary key,
  slug       text not null references public.invitations(slug) on delete cascade,
  data       jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists rsvps_slug_idx on public.rsvps(slug);

alter table public.invitations enable row level security;
alter table public.rsvps enable row level security;
revoke all on public.invitations, public.rsvps from anon, authenticated;

-- Création (la clé secrète est générée côté navigateur, 16 caractères minimum).
create or replace function public.create_invitation(p_slug text, p_key text, p_config jsonb)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if length(coalesce(p_key, '')) < 16 then raise exception 'key too short'; end if;
  if octet_length(p_config::text) > 4000000 then raise exception 'config too large'; end if;
  insert into invitations(slug, key_hash, config) values (p_slug, crypt(p_key, gen_salt('bf')), p_config);
end $$;

-- Modification (clé secrète requise). Renvoie false si la clé est mauvaise.
create or replace function public.update_invitation(p_slug text, p_key text, p_config jsonb)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
begin
  if octet_length(p_config::text) > 4000000 then raise exception 'config too large'; end if;
  update invitations set config = p_config, updated_at = now()
   where slug = p_slug and key_hash = crypt(p_key, key_hash);
  return found;
end $$;

-- Lecture publique d'un faire-part publié (renvoie null s'il n'existe pas).
create or replace function public.get_invitation(p_slug text)
returns jsonb language sql security definer set search_path = public as $$
  select config from invitations where slug = p_slug;
$$;

-- Réponse d'un invité (publique). Limites anti-abus : 4 Ko par réponse, 1000 réponses par faire-part.
create or replace function public.submit_rsvp(p_slug text, p_data jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from invitations where slug = p_slug) then raise exception 'not found'; end if;
  if octet_length(p_data::text) > 4000 then raise exception 'too large'; end if;
  if (select count(*) from rsvps where slug = p_slug) >= 1000 then raise exception 'too many responses'; end if;
  insert into rsvps(slug, data) values (p_slug, p_data);
end $$;

-- Lecture des réponses (clé secrète requise).
create or replace function public.list_rsvps(p_slug text, p_key text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  if not exists (select 1 from invitations where slug = p_slug and key_hash = crypt(p_key, key_hash)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'created_at', created_at, 'data', data) order by created_at)
                     from rsvps where slug = p_slug), '[]'::jsonb);
end $$;

grant execute on function public.create_invitation(text, text, jsonb) to anon;
grant execute on function public.update_invitation(text, text, jsonb) to anon;
grant execute on function public.get_invitation(text) to anon;
grant execute on function public.submit_rsvp(text, jsonb) to anon;
grant execute on function public.list_rsvps(text, text) to anon;

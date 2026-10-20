-- Schéma Supabase du MVP faire-part (version durcie).
-- À exécuter dans Supabase > SQL Editor. Le fichier est idempotent : on peut le rejouer en entier à tout moment
-- (c'est ce qu'il faut faire pour appliquer une mise à jour). Tout est dans UNE transaction : si une instruction
-- échoue, rien n'est modifié.
--
-- Modèle de sécurité
--   - Tables verrouillées (RLS activé, aucune policy, aucun droit direct pour anon) : le navigateur ne passe
--     QUE par les fonctions ci-dessous (SECURITY DEFINER).
--   - Public : lire un faire-part publié (get_invitation), y répondre (submit_rsvp).
--   - Clé privée requise : modifier le faire-part, lire les réponses. La clé n'est stockée que hashée (bcrypt).
--   - Validation côté serveur de tout ce qui entre (on ne fait pas confiance au navigateur).
--   - Limitation de débit par IP (hashée) pour freiner le spam et le remplissage de la base.
--   - Les fonctions et la table internes sont dans le schéma "private", non exposé par l'API.

begin;

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------- Tables
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

create table if not exists private.rate_limits (
  bucket       text not null,
  ip_hash      text not null,
  window_start timestamptz not null,
  hits         integer not null default 1,
  primary key (bucket, ip_hash, window_start)
);
revoke all on private.rate_limits from public, anon, authenticated;

-- ---------------------------------------------------------------- Fonctions internes
-- Identifiant anonymisé du visiteur (hash de l'IP fournie par Cloudflare/Supabase). Null si l'IP est inconnue.
create or replace function private.client_id() returns text
language plpgsql stable set search_path = public, extensions as $$
declare h json; ip text;
begin
  begin
    h := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    return null;
  end;
  ip := coalesce(nullif(h->>'cf-connecting-ip', ''), nullif(h->>'x-real-ip', ''));
  if ip is null then return null; end if;
  return encode(digest(ip, 'sha256'), 'hex');
end $$;

-- Limite le nombre d'appels par heure et par IP. Si l'IP est inconnue, on ne bloque personne.
create or replace function private.rate_limit(p_bucket text, p_limit integer) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare v_ip text := private.client_id(); v_hits integer;
begin
  if v_ip is null then return; end if;
  insert into private.rate_limits(bucket, ip_hash, window_start)
  values (p_bucket, v_ip, date_trunc('hour', now()))
  on conflict (bucket, ip_hash, window_start) do update set hits = private.rate_limits.hits + 1
  returning hits into v_hits;
  if v_hits > p_limit then raise exception 'rate limit' using errcode = '54000'; end if;
  if random() < 0.02 then
    delete from private.rate_limits where window_start < now() - interval '1 day';
  end if;
end $$;

-- Contrôle de forme et de taille d'un faire-part (3 photos max, 3 Mo max au total).
create or replace function private.check_config(p_config jsonb) returns void
language plpgsql as $$
begin
  if p_config is null or jsonb_typeof(p_config) <> 'object' then raise exception 'invalid config'; end if;
  if octet_length(p_config::text) > 3000000 then raise exception 'config too large'; end if;
  if p_config->'photos' is not null then
    if jsonb_typeof(p_config->'photos') <> 'array' then raise exception 'invalid photos'; end if;
    if jsonb_array_length(p_config->'photos') > 3 then raise exception 'invalid photos'; end if;
  end if;
end $$;

revoke all on function private.client_id() from public, anon, authenticated;
revoke all on function private.rate_limit(text, integer) from public, anon, authenticated;
revoke all on function private.check_config(jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------- API publique
-- Création (la clé privée est générée dans le navigateur : 16 à 64 caractères). 10 créations / heure / IP.
create or replace function public.create_invitation(p_slug text, p_key text, p_config jsonb)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform private.rate_limit('create', 10);
  if length(coalesce(p_key, '')) < 16 or length(p_key) > 64 then raise exception 'invalid key'; end if;
  perform private.check_config(p_config);
  insert into invitations(slug, key_hash, config) values (p_slug, crypt(p_key, gen_salt('bf')), p_config);
end $$;

-- Modification (clé privée requise). Renvoie false si la clé est mauvaise. 30 appels / heure / IP.
create or replace function public.update_invitation(p_slug text, p_key text, p_config jsonb)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
begin
  perform private.rate_limit('update', 30);
  perform private.check_config(p_config);
  update invitations set config = p_config, updated_at = now()
   where slug = p_slug and key_hash = crypt(p_key, key_hash);
  return found;
end $$;

-- Lecture publique d'un faire-part publié (renvoie null s'il n'existe pas).
create or replace function public.get_invitation(p_slug text)
returns jsonb language sql security definer set search_path = public as $$
  select config from invitations where slug = p_slug;
$$;

-- Réponse d'un invité (publique). Le contenu est reconstruit champ par champ : tout ce qui n'est pas prévu est
-- ignoré. 100 réponses / heure / IP / faire-part, 1000 réponses max par faire-part.
create or replace function public.submit_rsvp(p_slug text, p_data jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_att text; v_guests integer;
begin
  perform private.rate_limit('rsvp:' || coalesce(p_slug, ''), 100);
  if p_data is null or jsonb_typeof(p_data) <> 'object' then raise exception 'invalid data'; end if;
  if octet_length(p_data::text) > 8000 then raise exception 'too large'; end if;
  if not exists (select 1 from invitations where slug = p_slug) then raise exception 'not found'; end if;
  v_att := p_data->>'attendance';
  if v_att is null or v_att not in ('yes', 'no') then raise exception 'invalid attendance'; end if;
  if coalesce(btrim(p_data->>'name'), '') = '' then raise exception 'name required'; end if;
  if (select count(*) from rsvps where slug = p_slug) >= 1000 then raise exception 'too many responses'; end if;

  if v_att = 'no' then
    v_guests := 0;
  elsif (p_data->>'guests') ~ '^[0-9]{1,2}$' then
    v_guests := least(greatest((p_data->>'guests')::integer, 1), 20);
  else
    v_guests := 1;
  end if;

  insert into rsvps(slug, data) values (p_slug, jsonb_build_object(
    -- identifiant anonyme du navigateur de l'invité : sert à repérer une réponse corrigée (doublon)
    'rid',        case when (p_data->>'rid') ~ '^[a-z0-9]{12,32}$' then p_data->>'rid' else '' end,
    'name',       left(btrim(p_data->>'name'), 120),
    'attendance', v_att,
    'guests',     v_guests,
    'diet',       left(coalesce(p_data->>'diet', ''), 300),
    'brunch',     case when p_data->>'brunch' in ('yes', 'no') then p_data->>'brunch' else '' end,
    'message',    left(coalesce(p_data->>'message', ''), 1000)
  ));
end $$;

-- Lecture des réponses (clé privée requise). Renvoie null si la clé est mauvaise (sans lever d'erreur, pour que
-- les tentatives ratées comptent dans la limitation de débit). 120 appels / heure / IP.
create or replace function public.list_rsvps(p_slug text, p_key text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  perform private.rate_limit('list', 120);
  if not exists (select 1 from invitations where slug = p_slug and key_hash = crypt(p_key, key_hash)) then
    return null;
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'created_at', created_at, 'data', data) order by created_at)
                     from rsvps where slug = p_slug), '[]'::jsonb);
end $$;

-- Suppression d'une réponse (réponse de test, spam, doublon). Clé privée requise. Renvoie false si la clé est
-- mauvaise. 120 appels / heure / IP.
create or replace function public.delete_rsvp(p_slug text, p_key text, p_id bigint)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
begin
  perform private.rate_limit('delete', 120);
  if not exists (select 1 from invitations where slug = p_slug and key_hash = crypt(p_key, key_hash)) then
    return false;
  end if;
  delete from rsvps where slug = p_slug and id = p_id;
  return true;
end $$;

-- Seules ces 6 fonctions sont appelables depuis le navigateur.
revoke execute on function public.delete_rsvp(text, text, bigint) from public;
grant execute on function public.delete_rsvp(text, text, bigint) to anon;
revoke execute on function public.create_invitation(text, text, jsonb) from public;
revoke execute on function public.update_invitation(text, text, jsonb) from public;
revoke execute on function public.get_invitation(text) from public;
revoke execute on function public.submit_rsvp(text, jsonb) from public;
revoke execute on function public.list_rsvps(text, text) from public;
grant execute on function public.create_invitation(text, text, jsonb) to anon;
grant execute on function public.update_invitation(text, text, jsonb) to anon;
grant execute on function public.get_invitation(text) to anon;
grant execute on function public.submit_rsvp(text, jsonb) to anon;
grant execute on function public.list_rsvps(text, text) to anon;

commit;

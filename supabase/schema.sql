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
language plpgsql set search_path = public as $$
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
-- Les coordonnées (email, téléphone, adresse) sont validées ici : on refuse plutôt que d'enregistrer n'importe quoi.
create or replace function public.submit_rsvp(p_slug text, p_data jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_att text; v_yes boolean; v_guests integer; v_children integer; v_email text; v_phone text;
begin
  perform private.rate_limit('rsvp:' || coalesce(p_slug, ''), 100);
  if p_data is null or jsonb_typeof(p_data) <> 'object' then raise exception 'invalid data'; end if;
  if octet_length(p_data::text) > 12000 then raise exception 'too large'; end if;
  if not exists (select 1 from invitations where slug = p_slug) then raise exception 'not found'; end if;
  v_att := p_data->>'attendance';
  if v_att is null or v_att not in ('yes', 'no') then raise exception 'invalid attendance'; end if;
  if coalesce(btrim(p_data->>'name'), '') = '' then raise exception 'name required'; end if;
  if (select count(*) from rsvps where slug = p_slug) >= 1000 then raise exception 'too many responses'; end if;
  v_yes := v_att = 'yes';

  v_email := left(btrim(coalesce(p_data->>'email', '')), 200);
  if v_email <> '' and v_email !~ '^[A-Za-z0-9._%+''-]{1,64}@[A-Za-z0-9.-]{1,255}\.[A-Za-z]{2,24}$' then raise exception 'invalid email'; end if;
  v_phone := btrim(coalesce(p_data->>'phone', ''));
  if v_phone <> '' and v_phone !~ '^[0-9 +().-]{6,30}$' then raise exception 'invalid phone'; end if;

  if not v_yes then
    v_guests := 0;
  elsif (p_data->>'guests') ~ '^[0-9]{1,2}$' then
    v_guests := least(greatest((p_data->>'guests')::integer, 1), 20);
  else
    v_guests := 1;
  end if;
  if v_yes and (p_data->>'children') ~ '^[0-9]{1,2}$' then
    v_children := least((p_data->>'children')::integer, 20);
  else
    v_children := 0;
  end if;

  insert into rsvps(slug, data) values (p_slug, jsonb_build_object(
    -- identifiant anonyme du navigateur de l'invité : sert à repérer une réponse corrigée (doublon)
    'rid',        case when (p_data->>'rid') ~ '^[a-z0-9]{12,32}$' then p_data->>'rid' else '' end,
    'name',       left(btrim(p_data->>'name'), 120),
    'attendance', v_att,
    'guests',     v_guests,
    'children',   v_children,
    'companions', case when v_yes then left(btrim(coalesce(p_data->>'companions', '')), 300) else '' end,
    'diet',       case when v_yes then left(coalesce(p_data->>'diet', ''), 300) else '' end,
    'brunch',     case when v_yes and p_data->>'brunch' in ('yes', 'no') then p_data->>'brunch' else '' end,
    'email',      v_email,
    'phone',      v_phone,
    'address',    left(btrim(coalesce(p_data->>'address', '')), 300),
    'custom',     left(btrim(coalesce(p_data->>'custom', '')), 500),
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

-- Résumé de plusieurs faire-part en un appel (liste « Mes faire-part »). Chaque élément doit fournir la bonne clé
-- privée, sinon il est renvoyé comme « invalide » (sans aucune donnée). 100 faire-part max, 120 appels / heure / IP.
create or replace function public.summarize_invitations(p_items jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare it jsonb; v_cfg jsonb; v_out jsonb := '[]'::jsonb;
begin
  perform private.rate_limit('summary', 120);
  if p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception 'invalid data'; end if;
  if jsonb_array_length(p_items) > 100 then raise exception 'too many'; end if;
  for it in select value from jsonb_array_elements(p_items) loop
    v_cfg := null;
    if jsonb_typeof(it) = 'object' then
      select config into v_cfg from invitations
       where slug = it->>'slug' and key_hash = crypt(coalesce(it->>'key', ''), key_hash);
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

-- ---------------------------------------------------------------- Espaces testeurs (wedding planners)
-- Chaque testeur reçoit un lien personnel (admin.html#t=<jeton>) qui retrouve TOUS ses faire-part, sur n'importe
-- quel appareil. Le jeton (32 caractères aléatoires, ~160 bits) n'est stocké que hashé (SHA-256). Les clés privées
-- des faire-part rattachés sont stockées CHIFFRÉES avec ce jeton (pgp_sym_encrypt) : sans le lien du testeur,
-- même une copie de la base ne permet pas de les relire.
-- Création d'un testeur : dans le SQL Editor, select private.create_tester('Nom du testeur');  → renvoie le jeton.
-- Désactiver un testeur : update private.testers set disabled = true where name = '...';
create table if not exists private.testers (
  id           bigint generated always as identity primary key,
  name         text not null check (length(btrim(name)) between 1 and 80),
  token_hash   text not null unique,
  disabled     boolean not null default false,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz
);
create table if not exists private.tester_invitations (
  tester_id bigint not null references private.testers(id) on delete cascade,
  slug      text not null references public.invitations(slug) on delete cascade,
  key_enc   bytea not null,
  added_at  timestamptz not null default now(),
  primary key (tester_id, slug)
);
revoke all on private.testers, private.tester_invitations from public, anon, authenticated;

-- Jeton → identifiant du testeur actif (null si jeton mal formé, inconnu ou désactivé).
create or replace function private.tester_id(p_token text) returns bigint
language sql stable set search_path = public, extensions as $$
  select id from private.testers
   where coalesce(p_token, '') ~ '^[a-z0-9]{32}$'
     and token_hash = encode(digest(p_token, 'sha256'), 'hex') and not disabled;
$$;

-- Réservé au propriétaire (SQL Editor) : crée un testeur et renvoie son jeton, affiché UNE seule fois.
create or replace function private.create_tester(p_name text) returns text
language plpgsql set search_path = public, extensions as $$
declare v_chars text := 'abcdefghijkmnpqrstuvwxyz23456789'; v_bytes bytea := gen_random_bytes(32); v_token text := '';
begin
  for i in 0..31 loop v_token := v_token || substr(v_chars, (get_byte(v_bytes, i) & 31) + 1, 1); end loop;
  insert into private.testers(name, token_hash) values (btrim(p_name), encode(digest(v_token, 'sha256'), 'hex'));
  return v_token;
end $$;

revoke all on function private.tester_id(text) from public, anon, authenticated;
revoke all on function private.create_tester(text) from public, anon, authenticated;

-- Espace d'un testeur : son nom et ses faire-part (avec leurs clés privées). Null si le jeton est invalide.
-- 120 appels / heure / IP.
create or replace function public.tester_workspace(p_token text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_id bigint; v_name text;
begin
  perform private.rate_limit('tester', 120);
  v_id := private.tester_id(p_token);
  if v_id is null then return null; end if;
  update private.testers set last_seen_at = now() where id = v_id returning name into v_name;
  return jsonb_build_object('name', v_name, 'items', coalesce((
    select jsonb_agg(jsonb_build_object('slug', ti.slug, 'key', pgp_sym_decrypt(ti.key_enc, p_token)) order by ti.added_at desc)
      from private.tester_invitations ti where ti.tester_id = v_id), '[]'::jsonb));
end $$;

-- Rattache un faire-part à l'espace (jeton du testeur ET clé privée du faire-part requis). Idempotent.
-- 200 faire-part max par espace, 60 appels / heure / IP. Renvoie false si le jeton ou la clé est mauvais.
create or replace function public.tester_attach(p_token text, p_slug text, p_key text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare v_id bigint;
begin
  perform private.rate_limit('tester-attach', 60);
  v_id := private.tester_id(p_token);
  if v_id is null or coalesce(p_key, '') !~ '^[a-z0-9]{16,64}$' then return false; end if;
  if not exists (select 1 from invitations where slug = p_slug and key_hash = crypt(p_key, key_hash)) then return false; end if;
  if not exists (select 1 from private.tester_invitations where tester_id = v_id and slug = p_slug)
     and (select count(*) from private.tester_invitations where tester_id = v_id) >= 200 then
    raise exception 'too many';
  end if;
  insert into private.tester_invitations(tester_id, slug, key_enc) values (v_id, p_slug, pgp_sym_encrypt(p_key, p_token))
  on conflict (tester_id, slug) do nothing;
  return true;
end $$;

-- Retire un faire-part de l'espace (ne supprime PAS le faire-part). Renvoie false si le jeton est mauvais.
create or replace function public.tester_detach(p_token text, p_slug text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare v_id bigint;
begin
  perform private.rate_limit('tester-attach', 60);
  v_id := private.tester_id(p_token);
  if v_id is null then return false; end if;
  delete from private.tester_invitations where tester_id = v_id and slug = p_slug;
  return true;
end $$;

revoke execute on function public.tester_workspace(text) from public, authenticated;
revoke execute on function public.tester_attach(text, text, text) from public, authenticated;
revoke execute on function public.tester_detach(text, text) from public, authenticated;
grant execute on function public.tester_workspace(text) to anon;
grant execute on function public.tester_attach(text, text, text) to anon;
grant execute on function public.tester_detach(text, text) to anon;

-- Suppression définitive d'un faire-part (clé privée requise) : ses réponses et son rattachement aux espaces testeurs
-- partent avec lui (on delete cascade). Renvoie false si la clé est mauvaise. 120 appels / heure / IP.
create or replace function public.delete_invitation(p_slug text, p_key text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
begin
  perform private.rate_limit('delete', 120);
  delete from invitations where slug = p_slug and key_hash = crypt(coalesce(p_key, ''), key_hash);
  return found;
end $$;
revoke execute on function public.delete_invitation(text, text) from public, authenticated;
grant execute on function public.delete_invitation(text, text) to anon;

-- Seules ces 11 fonctions sont appelables depuis le navigateur (les 7 ci-dessous + delete_invitation + les 3 des espaces testeurs).
revoke execute on function public.summarize_invitations(jsonb) from public;
grant execute on function public.summarize_invitations(jsonb) to anon;
revoke execute on function public.summarize_invitations(jsonb) from authenticated;
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
-- Supabase accorde par défaut l'exécution aux utilisateurs connectés : l'app n'en utilise pas, on referme.
revoke execute on function public.create_invitation(text, text, jsonb) from authenticated;
revoke execute on function public.update_invitation(text, text, jsonb) from authenticated;
revoke execute on function public.get_invitation(text) from authenticated;
revoke execute on function public.submit_rsvp(text, jsonb) from authenticated;
revoke execute on function public.list_rsvps(text, text) from authenticated;
revoke execute on function public.delete_rsvp(text, text, bigint) from authenticated;

commit;

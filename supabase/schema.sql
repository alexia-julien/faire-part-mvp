-- Schéma Supabase de Maison Meli : TOUTE la base, telle qu'elle tourne en production (relevée le 21/11/2026).
-- Remplace les anciens schema.sql (liens privés), comptes.sql, bascule.sql et mesure.sql, tous déjà appliqués
-- (historique dans git). À exécuter dans Supabase > SQL Editor. Idempotent : rejouable en entier à tout moment,
-- c'est ce qu'il faut faire pour appliquer une mise à jour. Une seule transaction : si une instruction échoue,
-- rien n'est modifié.
--
-- Modèle de sécurité
--   - Tables verrouillées (RLS activé, aucune policy, aucun droit direct) : le navigateur ne passe QUE par les
--     fonctions ci-dessous (SECURITY DEFINER).
--   - Invités (anon) : lire un faire-part (get_invitation), y répondre (submit_rsvp), mesure (track).
--     Worker Cloudflare (anon) : aperçu de lien (get_invitation_preview : prénoms, date, palette, ne compte rien).
--   - Compte connecté (authenticated, Supabase Auth) : les fonctions account_* agissent sur LE faire-part du
--     compte (un au plus), sans identifiant ni clé à fournir ; delete_account supprime tout.
--   - Validation côté serveur de tout ce qui entre ; limitation de débit par IP (hashée).
--   - Fonctions et tables internes dans le schéma « private », non exposé par l'API.
--
-- Mesure du funnel (PRD, section KPIs), sans cookie : private.events. Un visiteur = empreinte SHA-256 de son IP.
--   landing_view, editor_start, auth_gate, share, qr_download, cta_create, premium_click, session_end, feedback_shown : navigateur (public.track)
--   invitation_created / updated / deleted, invitation_viewed, rsvp_submitted, rsvp_added_manual, rsvps_listed,
--   account_deleted, premium_interest, digest_sent, feedback_submitted : base
-- Lecture : select * from private.kpis_30j;  select * from private.funnel_semaine;

begin;

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------- Tables
create table if not exists public.invitations (
  slug       text primary key check (slug ~ '^[a-z0-9][a-z0-9-]{2,62}$'),
  config     jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  owner      uuid not null references auth.users(id) on delete cascade
);
create unique index if not exists invitations_owner_one on public.invitations(owner) where owner is not null; -- un faire-part par compte

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

create table if not exists private.events (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  event      text not null,
  tester_id  bigint,            -- historique : espaces testeurs supprimés le 19/11/2026, toujours null depuis
  slug       text,
  visitor    text,
  meta       jsonb not null default '{}'::jsonb
);
create index if not exists events_created_idx on private.events (created_at desc);
create index if not exists events_slug_idx on private.events (slug, created_at desc);
create index if not exists events_event_created_idx on private.events (event, created_at);
create index if not exists events_tester_idx on private.events (tester_id, created_at desc); -- historique

alter table private.rate_limits enable row level security;
alter table private.events enable row level security;
revoke all on private.rate_limits, private.events from public, anon, authenticated;

-- Préférences de notification du couple (US-17) et date du dernier récapitulatif envoyé.
create table if not exists private.notify_prefs (
  owner      uuid primary key references auth.users(id) on delete cascade,
  digest     boolean not null default true,
  last_sent  timestamptz
);
-- Test « fausse porte » du Pack Premium (PRD, modèle économique) : qui voudrait être prévenu du lancement.
create table if not exists private.premium_waitlist (
  email      text primary key,
  created_at timestamptz not null default now(),
  account    uuid references auth.users(id) on delete set null,
  origin     text
);
alter table private.notify_prefs enable row level security;
alter table private.premium_waitlist enable row level security;
revoke all on private.notify_prefs, private.premium_waitlist from public, anon, authenticated;

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

-- Limitation de débit : p_limit appels par heure, par IP et par « bucket ». Erreur 54000 au-delà.
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

-- Garde-fous sur la configuration d'un faire-part (le contenu est revalidé à l'affichage par sanitizeConfig).
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

-- Le compte connecté (null pour un visiteur, et pour une session anonyme si elles étaient activées un jour).
create or replace function private.account_id() returns uuid
language sql stable set search_path = '' as $$
  select case when coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then null else auth.uid() end;
$$;

-- Journal de mesure. Ne casse jamais l'app ; conservation 13 mois. p_tester_id : historique, toujours null.
create or replace function private.log_event(p_event text, p_tester_id bigint default null, p_slug text default null,
                                             p_meta jsonb default '{}'::jsonb) returns void
language plpgsql set search_path = public, extensions as $$
declare ua text; dev text;
begin
  -- Catégorie d'appareil déduite du user-agent (le user-agent lui-même n'est jamais stocké).
  begin
    ua := nullif(current_setting('request.headers', true), '')::json->>'user-agent';
  exception when others then ua := null; end;
  dev := case
    when ua is null or ua = '' then 'inconnu'
    when ua ~* 'ipad|tablet|playbook|silk|kindle' or (ua ~* 'android' and ua !~* 'mobile') then 'tablette'
    when ua ~* 'mobi|iphone|ipod|android|windows phone' then 'mobile'
    else 'ordinateur' end;
  insert into private.events(event, tester_id, slug, visitor, meta)
  values (p_event, p_tester_id, left(p_slug, 63), private.client_id(),
          jsonb_build_object('device', dev) || coalesce(p_meta, '{}'::jsonb));
  if random() < 0.01 then delete from private.events where created_at < now() - interval '13 months'; end if; -- durée de conservation
exception when others then
  null; -- la mesure ne doit jamais casser l'app
end $$;

revoke all on function private.client_id() from public, anon, authenticated;
revoke all on function private.rate_limit(text, integer) from public, anon, authenticated;
revoke all on function private.check_config(jsonb) from public, anon, authenticated;
revoke all on function private.account_id() from public, anon, authenticated;
revoke all on function private.log_event(text, bigint, text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------- Invités (publiques)
-- Lire un faire-part publié (compte une ouverture).
create or replace function public.get_invitation(p_slug text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_cfg jsonb;
begin
  select config into v_cfg from invitations where slug = p_slug;
  if v_cfg is not null then perform private.log_event('invitation_viewed', null, p_slug); end if;
  return v_cfg;
end $$;

-- Aperçu de lien (Worker Cloudflare) : prénoms, date et palette seulement ; ne journalise rien, pour ne pas
-- compter les robots d'aperçu comme des ouvertures.
create or replace function public.get_invitation_preview(p_slug text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'p1', left(coalesce(config->>'partner1', ''), 40),
    'p2', left(coalesce(config->>'partner2', ''), 40),
    'date', case when config->>'date' ~ '^\d{4}-\d{2}-\d{2}$' then config->>'date' else '' end,
    'theme', left(coalesce(config->>'theme', ''), 20))
  from invitations where slug = p_slug;
$$;

-- Réponse d'un invité : tout est revalidé et tronqué. Une nouvelle ligne à chaque envoi ; « rid » relie les
-- corrections d'une même réponse (US-13). 100 envois / heure / IP / faire-part, 1 000 réponses max.
create or replace function public.submit_rsvp(p_slug text, p_data jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v_att text; v_yes boolean; v_guests integer; v_children integer; v_email text; v_phone text; v_rid text; v_edit boolean; v_sec integer;
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
  v_rid := case when (p_data->>'rid') ~ '^[a-z0-9]{12,32}$' then p_data->>'rid' else '' end;
  v_edit := v_rid <> '' and exists (select 1 from rsvps where slug = p_slug and data->>'rid' = v_rid);
  v_sec := case when (p_data->>'elapsed') ~ '^[0-9]{1,5}$' then least((p_data->>'elapsed')::integer, 86400) end;
  insert into rsvps(slug, data) values (p_slug, jsonb_build_object(
    'rid',        v_rid,
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
  perform private.log_event('rsvp_submitted', null, p_slug,
    jsonb_strip_nulls(jsonb_build_object('attendance', v_att, 'edit', v_edit, 'seconds', v_sec)));
end $$;

-- Mesure côté navigateur : liste blanche d'événements et de valeurs ; ne renvoie jamais d'erreur.
create or replace function public.track(p_event text, p_slug text default null, p_meta jsonb default '{}'::jsonb) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare v_meta jsonb := '{}'::jsonb; v_slug text;
begin
  if p_event is null or p_event not in ('landing_view', 'editor_start', 'auth_gate', 'share', 'qr_download', 'cta_create', 'premium_click', 'session_end', 'feedback_shown') then return; end if;
  begin
    perform private.rate_limit('track', 600);
  exception when others then return;
  end;
  if jsonb_typeof(p_meta) = 'object' then
    if p_meta->>'src' in ('direct', 'seo', 'ia', 'faire-part', 'reseaux', 'email', 'autre') then v_meta := v_meta || jsonb_build_object('src', p_meta->>'src'); end if;
    if p_meta->>'channel' in ('natif', 'whatsapp', 'sms', 'email', 'copie') then v_meta := v_meta || jsonb_build_object('channel', p_meta->>'channel'); end if;
    if jsonb_typeof(p_meta->'seconds') = 'number' and (p_meta->>'seconds')::numeric between 1 and 14400 then
      v_meta := v_meta || jsonb_build_object('seconds', round((p_meta->>'seconds')::numeric)::int);
    end if;
  end if;
  if p_slug ~ '^[a-z0-9][a-z0-9-]{2,62}$' and exists (select 1 from invitations where slug = p_slug) then v_slug := p_slug; end if;
  perform private.log_event(p_event, null, v_slug, v_meta);
end $$;

-- ---------------------------------------------------------------- Compte connecté
-- Le faire-part du compte : { slug, config, created_at, updated_at, responses, last_response }, ou null.
create or replace function public.account_invitation() returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_uid uuid := private.account_id();
begin
  if v_uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  perform private.rate_limit('account', 240);
  return (select jsonb_build_object('slug', i.slug, 'config', i.config, 'created_at', i.created_at, 'updated_at', i.updated_at,
            'responses', (select count(*) from rsvps r where r.slug = i.slug),
            'last_response', (select max(r.created_at) from rsvps r where r.slug = i.slug))
            from invitations i where i.owner = v_uid);
end $$;

-- Création. Erreurs : 'one per account', ou 23505 si l'identifiant (slug) est déjà pris.
create or replace function public.account_create_invitation(p_slug text, p_config jsonb) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare v_uid uuid := private.account_id(); v_constraint text; v_src text := p_config->'meta'->>'src';
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
  if v_src is null or v_src not in ('direct', 'seo', 'ia', 'faire-part', 'reseaux', 'email', 'autre') then v_src := 'inconnue'; end if;
  perform private.log_event('invitation_created', null, p_slug, jsonb_build_object('theme', p_config->>'theme', 'account', true, 'src', v_src));
end $$;

-- Modification : false si le compte n'a pas de faire-part.
create or replace function public.account_update_invitation(p_config jsonb) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
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

-- Suppression définitive du faire-part (et de ses réponses, en cascade).
create or replace function public.account_delete_invitation() returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare v_uid uuid := private.account_id(); v_slug text;
begin
  if v_uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  perform private.rate_limit('delete', 120);
  delete from invitations where owner = v_uid returning slug into v_slug;
  if v_slug is null then return false; end if;
  perform private.log_event('invitation_deleted', null, v_slug);
  return true;
end $$;

-- Réponses du faire-part du compte : [{ id, created_at, data }], ou null s'il n'a pas de faire-part.
create or replace function public.account_rsvps() returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
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

-- Suppression d'une réponse du faire-part du compte.
create or replace function public.account_delete_rsvp(p_id bigint) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare v_uid uuid := private.account_id();
begin
  if v_uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  perform private.rate_limit('delete', 120);
  delete from rsvps r using invitations i where i.owner = v_uid and r.slug = i.slug and r.id = p_id;
  return found;
end $$;

-- Suppression du compte et de tout ce qui lui appartient (RGPD).
create or replace function public.delete_account() returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare v_uid uuid := private.account_id();
begin
  if v_uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  perform private.rate_limit('delete', 120);
  update private.feedback set email = null where account = v_uid; -- retours conservés, mais anonymisés
  delete from invitations where owner = v_uid;
  delete from auth.users where id = v_uid;
  perform private.log_event('account_deleted');
  return true;
end $$;


-- Réponse saisie à la main par le couple (invité qui a répondu par téléphone). Marquée « manual ».
create or replace function public.account_add_rsvp(p_data jsonb) returns bigint
language plpgsql security definer set search_path = public, extensions as $$
declare v_uid uuid := private.account_id(); v_slug text; v_att text; v_yes boolean; v_guests integer := 0; v_children integer := 0; v_id bigint;
begin
  if v_uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  perform private.rate_limit('manual', 200);
  select slug into v_slug from invitations where owner = v_uid;
  if v_slug is null then raise exception 'not found'; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or octet_length(p_data::text) > 4000 then raise exception 'invalid data'; end if;
  v_att := p_data->>'attendance';
  if v_att is null or v_att not in ('yes', 'no') then raise exception 'invalid attendance'; end if;
  if coalesce(btrim(p_data->>'name'), '') = '' then raise exception 'name required'; end if;
  if (select count(*) from rsvps where slug = v_slug) >= 1000 then raise exception 'too many responses'; end if;
  v_yes := v_att = 'yes';
  if v_yes then
    v_guests := case when (p_data->>'guests') ~ '^[0-9]{1,2}$' then least(greatest((p_data->>'guests')::integer, 1), 20) else 1 end;
    v_children := case when (p_data->>'children') ~ '^[0-9]{1,2}$' then least((p_data->>'children')::integer, 20) else 0 end;
  end if;
  insert into rsvps(slug, data) values (v_slug, jsonb_build_object(
    'rid', encode(gen_random_bytes(8), 'hex'), 'manual', true,
    'name', left(btrim(p_data->>'name'), 120), 'attendance', v_att, 'guests', v_guests, 'children', v_children,
    'companions', case when v_yes then left(btrim(coalesce(p_data->>'companions', '')), 300) else '' end,
    'diet', case when v_yes then left(coalesce(p_data->>'diet', ''), 300) else '' end,
    'brunch', '', 'email', '', 'phone', '', 'address', '', 'custom', '',
    'message', left(coalesce(p_data->>'message', ''), 1000)
  )) returning id into v_id;
  perform private.log_event('rsvp_added_manual', null, v_slug, jsonb_build_object('attendance', v_att));
  return v_id;
end $$;

-- Récapitulatif e-mail des nouvelles réponses (US-17) : lire (p_digest null) ou changer la préférence du compte.
create or replace function public.account_notify(p_digest boolean default null) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare v_uid uuid := private.account_id(); v_on boolean;
begin
  if v_uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  perform private.rate_limit('account', 240);
  if p_digest is not null then
    insert into private.notify_prefs(owner, digest) values (v_uid, p_digest)
    on conflict (owner) do update set digest = excluded.digest;
  end if;
  select digest into v_on from private.notify_prefs where owner = v_uid;
  return coalesce(v_on, true);
end $$;

-- Fausse porte Premium : enregistre l'e-mail d'un couple intéressé. Ouvert aux visiteurs (brouillon sans compte).
create or replace function public.premium_interest(p_email text, p_origin text default null) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare v_email text := lower(left(btrim(coalesce(p_email, '')), 200));
begin
  perform private.rate_limit('premium', 10);
  if v_email !~ '^[a-z0-9._%+''-]{1,64}@[a-z0-9.-]{1,255}\.[a-z]{2,24}$' then raise exception 'invalid email'; end if;
  insert into private.premium_waitlist(email, account, origin)
  values (v_email, private.account_id(), case when p_origin in ('editeur', 'tableau', 'tarifs') then p_origin end)
  on conflict (email) do nothing;
  perform private.log_event('premium_interest', null, null,
    jsonb_strip_nulls(jsonb_build_object('origin', case when p_origin in ('editeur', 'tableau', 'tarifs') then p_origin end)));
end $$;

-- ---------------------------------------------------------------- Droits d'exécution
-- Supabase accorde par défaut l'exécution à public, anon et authenticated : on referme tout, puis on ouvre au cas par cas.
revoke all on function public.get_invitation(text), public.get_invitation_preview(text), public.submit_rsvp(text, jsonb),
  public.track(text, text, jsonb), public.account_invitation(), public.account_create_invitation(text, jsonb),
  public.account_update_invitation(jsonb), public.account_delete_invitation(), public.account_rsvps(),
  public.account_delete_rsvp(bigint), public.delete_account(), public.account_add_rsvp(jsonb), public.account_notify(boolean),
  public.premium_interest(text, text) from public, anon, authenticated;

grant execute on function public.get_invitation(text), public.submit_rsvp(text, jsonb), public.track(text, text, jsonb)
  to anon, authenticated;
grant execute on function public.get_invitation_preview(text) to anon;
grant execute on function public.premium_interest(text, text) to anon, authenticated;
grant execute on function public.account_invitation(), public.account_create_invitation(text, jsonb),
  public.account_update_invitation(jsonb), public.account_delete_invitation(), public.account_rsvps(),
  public.account_delete_rsvp(bigint), public.delete_account(), public.account_add_rsvp(jsonb), public.account_notify(boolean)
  to authenticated, service_role;

-- ---------------------------------------------------------------- Vues de pilotage (SQL Editor uniquement)
-- Funnel par semaine (6 derniers mois).
create or replace view private.funnel_semaine as
with w as (
  select date_trunc('week', created_at)::date as semaine, event, visitor, slug, meta
  from private.events where created_at >= now() - interval '182 days'
)
select s.semaine,
  (select count(distinct visitor) from w where w.semaine = s.semaine and event = 'landing_view') as visiteurs,
  (select count(distinct visitor) from w where w.semaine = s.semaine and event = 'editor_start') as demarrages,
  (select count(distinct visitor) from w where w.semaine = s.semaine and event = 'auth_gate') as ecran_compte,
  (select count(*) from auth.users u where date_trunc('week', u.created_at)::date = s.semaine) as comptes_crees,
  (select count(*) from w where w.semaine = s.semaine and event = 'invitation_created') as publications,
  (select count(*) from w where w.semaine = s.semaine and event = 'invitation_created' and meta->>'src' = 'faire-part') as publications_virales,
  (select count(distinct (slug, visitor)) from w where w.semaine = s.semaine and event = 'invitation_viewed') as ouvertures_uniques,
  (select count(*) from w where w.semaine = s.semaine and event = 'rsvp_submitted' and coalesce((meta->>'edit')::boolean, false) = false) as reponses,
  (select count(*) from w where w.semaine = s.semaine and event = 'rsvp_submitted' and (meta->>'edit')::boolean) as corrections,
  (select count(*) from w where w.semaine = s.semaine and event = 'share') as partages,
  (select count(*) from w where w.semaine = s.semaine and event = 'cta_create') as clics_creez_le_votre,
  (select count(*) from w where w.semaine = s.semaine and event = 'premium_click') as clics_premium,
  (select count(*) from w where w.semaine = s.semaine and event = 'premium_interest') as emails_premium,
  (select count(*) from w where w.semaine = s.semaine and event = 'rsvp_added_manual') as reponses_manuelles
from (select distinct semaine from w union select date_trunc('week', now())::date) s
order by s.semaine desc;

-- Indicateurs du PRD sur 30 jours glissants.
create or replace view private.kpis_30j as
with e as (
  select * from private.events where created_at >= now() - interval '30 days'
), v as (
  select
    count(distinct visitor) filter (where event = 'landing_view') as visiteurs,
    count(distinct visitor) filter (where event = 'editor_start') as demarrages,
    count(*) filter (where event = 'invitation_created') as publications,
    count(*) filter (where event = 'invitation_created' and meta->>'src' = 'faire-part') as virales,
    count(distinct (slug, visitor)) filter (where event = 'invitation_viewed') as ouvertures,
    count(*) filter (where event = 'rsvp_submitted' and coalesce((meta->>'edit')::boolean, false) = false) as reponses,
    count(*) filter (where event = 'cta_create') as clics_cta,
    percentile_cont(0.5) within group (order by (meta->>'seconds')::numeric)
      filter (where event = 'rsvp_submitted' and coalesce((meta->>'edit')::boolean, false) = false and meta ? 'seconds') as duree_mediane_s
  from e
), c as (
  select count(*) as comptes from auth.users where created_at >= now() - interval '30 days'
), r as (
  select count(*) filter (where x.premier is not null and x.premier <= i.created_at + interval '7 days') as avec_rsvp_7j,
         count(*) as eligibles
  from public.invitations i
  left join lateral (select min(created_at) as premier from public.rsvps where slug = i.slug) x on true
  where i.created_at <= now() - interval '7 days'
), a as (
  select count(*) as actifs from public.invitations i
  where (select count(distinct coalesce(nullif(data->>'rid', ''), lower(data->>'name'))) from public.rsvps where slug = i.slug) >= 10
)
select
  v.visiteurs as visiteurs_uniques,
  round(100.0 * v.demarrages / nullif(v.visiteurs, 0), 1) as demarrage_pct,
  round(100.0 * c.comptes / nullif(v.demarrages, 0), 1) as compte_cree_pct,
  round(100.0 * v.publications / nullif(c.comptes, 0), 1) as publication_pct,
  round(100.0 * r.avec_rsvp_7j / nullif(r.eligibles, 0), 1) as premier_rsvp_7j_pct,
  a.actifs as faire_part_actifs,
  round(100.0 * v.reponses / nullif(v.ouvertures, 0), 1) as taux_reponse_pct,
  v.duree_mediane_s as duree_reponse_mediane_s,
  round(100.0 * v.clics_cta / nullif(v.reponses, 0), 1) as clics_creez_le_votre_pct,
  round(v.virales::numeric / nullif(v.publications, 0), 2) as coefficient_viral_k,
  v.publications, v.reponses, c.comptes
from v, c, r, a;

revoke all on private.funnel_semaine, private.kpis_30j from public, anon, authenticated;


-- ---------------------------------------------------------------- Récapitulatif e-mail des réponses (US-17)
-- Une fois par jour (8 h 30 heure de Paris en hiver, 9 h 30 en été), chaque couple qui a reçu de nouvelles réponses
-- depuis le dernier envoi reçoit UN e-mail (au plus un par jour, désactivable depuis « Mon faire-part »).
-- Envoi par l'API Resend via pg_net. Inactif tant que la clé n'est pas dans le coffre :
--   select vault.create_secret('re_…', 'resend_api_key');
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create or replace function private.html(p text) returns text
language sql immutable set search_path = '' as $$
  select replace(replace(replace(replace(replace(coalesce(p, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;'), '''', '&#39;');
$$;

create or replace function private.send_rsvp_digests() returns integer
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_key text; v_n integer := 0; r record; v_since timestamptz; v_new integer; v_list text; v_txt text;
  v_yes integer; v_no integer; v_people integer; v_couple text; v_html text; v_subject text;
begin
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  if v_key is null or v_key = '' then return 0; end if;
  for r in
    select i.slug, i.config, i.created_at as inv_created, u.id as uid, u.email, p.last_sent
    from invitations i join auth.users u on u.id = i.owner
    left join private.notify_prefs p on p.owner = i.owner
    where coalesce(p.digest, true) and u.email is not null
  loop
    v_since := greatest(coalesce(r.last_sent, r.inv_created), now() - interval '7 days');
    select count(*) into v_new from rsvps
      where slug = r.slug and created_at > v_since and coalesce((data->>'manual')::boolean, false) = false;
    continue when v_new = 0;
    -- Dernière version de chaque réponse (les corrections d'une même réponse partagent « rid »).
    with last as (
      select distinct on (coalesce(nullif(data->>'rid', ''), 'id' || id)) data
      from rsvps where slug = r.slug order by coalesce(nullif(data->>'rid', ''), 'id' || id), created_at desc
    )
    select count(*) filter (where data->>'attendance' = 'yes'), count(*) filter (where data->>'attendance' = 'no'),
           coalesce(sum((data->>'guests')::int + (data->>'children')::int) filter (where data->>'attendance' = 'yes'), 0)
      into v_yes, v_no, v_people from last;
    select string_agg('<li style="margin:0 0 6px">' || private.html(data->>'name') || ' : ' ||
             case when data->>'attendance' = 'yes'
               then 'vient' || case when (data->>'guests')::int + (data->>'children')::int > 1
                 then ' (' || ((data->>'guests')::int + (data->>'children')::int) || ' personnes)' else '' end
               else 'ne pourra pas venir' end || '</li>', '' order by created_at),
           string_agg('- ' || (data->>'name') || ' : ' || case when data->>'attendance' = 'yes' then 'vient' else 'ne vient pas' end,
             E'\n' order by created_at)
      into v_list, v_txt
      from (select data, created_at from rsvps where slug = r.slug and created_at > v_since
              and coalesce((data->>'manual')::boolean, false) = false order by created_at limit 30) n;
    v_couple := btrim(coalesce(r.config->>'partner1', '') || ' & ' || coalesce(r.config->>'partner2', ''), ' &');
    v_subject := case when v_new = 1 then '1 nouvelle réponse à votre faire-part' else v_new || ' nouvelles réponses à votre faire-part' end;
    v_html := '<div style="background:#FAF7F2;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#1C1A17">'
      || '<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px">'
      || '<p style="margin:0 0 4px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8A6D33">Maison Meli</p>'
      || '<h1 style="margin:0 0 16px;font-family:Georgia,serif;font-weight:400;font-size:28px">' || private.html(v_couple) || '</h1>'
      || '<p style="margin:0 0 16px;font-size:16px">' || private.html(v_subject) || ' depuis le dernier récapitulatif :</p>'
      || '<ul style="margin:0 0 20px;padding-left:20px;font-size:16px">' || coalesce(v_list, '') || '</ul>'
      || '<p style="margin:0 0 24px;font-size:16px">À ce jour : <strong>' || v_yes || ' oui</strong> (' || v_people
      || ' personne' || case when v_people > 1 then 's' else '' end || '), ' || v_no || ' non.</p>'
      || '<p style="margin:0 0 28px"><a href="https://maison-meli.com/mon-faire-part/?src=email" style="display:inline-block;background:#1C1A17;color:#FAF7F2;text-decoration:none;padding:14px 24px;border-radius:999px;font-size:15px">Voir toutes les réponses</a></p>'
      || '<p style="margin:0;font-size:13px;color:#6B645B">Vous recevez au plus un e-mail par jour, seulement quand il y a du nouveau. Pour ne plus les recevoir : « Mon faire-part », puis « Récapitulatif par e-mail ».</p>'
      || '</div></div>';
    perform net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object('Authorization', 'Bearer ' || v_key, 'Content-Type', 'application/json'),
      body := jsonb_build_object(
        'from', 'Maison Meli <notifications@maison-meli.com>', 'reply_to', 'contact@maison-meli.com',
        'to', jsonb_build_array(r.email), 'subject', v_subject || ' · ' || v_couple, 'html', v_html,
        'text', v_subject || E' :\n' || coalesce(v_txt, '') || E'\n\nÀ ce jour : ' || v_yes || ' oui (' || v_people || ' personnes), '
                || v_no || E' non.\nToutes les réponses : https://maison-meli.com/mon-faire-part/\n\n'
                || 'Pour ne plus recevoir ces e-mails : Mon faire-part > Récapitulatif par e-mail.'));
    insert into private.notify_prefs(owner, last_sent) values (r.uid, now())
    on conflict (owner) do update set last_sent = now();
    perform private.log_event('digest_sent', null, r.slug, jsonb_build_object('reponses', v_new));
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

revoke all on function private.html(text), private.send_rsvp_digests() from public, anon, authenticated;

-- ---------------------------------------------------------------- Tableau de bord admin (/admin/)
-- Réservé aux comptes listés dans private.admins (ajoutés à la main). Toute autre session reçoit « not admin » (42501).
create table if not exists private.admins (user_id uuid primary key references auth.users(id) on delete cascade, created_at timestamptz not null default now());
revoke all on private.admins from public, anon, authenticated;

create table if not exists private.exclusions (
  kind text not null check (kind in ('account', 'slug', 'visitor')),
  id text not null,
  created_at timestamptz not null default now(),
  primary key (kind, id)
);
revoke all on private.exclusions from public, anon, authenticated;

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select private.account_id() is not null and exists (select 1 from private.admins where user_id = private.account_id());
$$;

-- Activité exclue des indicateurs : comptes admin ou exclus, leurs faire-part (ou ceux exclus un par un),
-- et les visiteurs qui ont créé ou géré ces faire-part, ou ouvert le tableau de bord.
create or replace function private.excluded_accounts() returns setof uuid
language sql stable security definer set search_path = public, extensions as $$
  select user_id from private.admins
  union select u.id from auth.users u join private.exclusions x on x.kind = 'account' and x.id = u.id::text;
$$;
create or replace function private.excluded_slugs() returns setof text
language sql stable security definer set search_path = public, extensions as $$
  select slug from invitations where owner in (select private.excluded_accounts())
  union select id from private.exclusions where kind = 'slug';
$$;
create or replace function private.excluded_visitors() returns setof text
language sql stable security definer set search_path = public, extensions as $$
  select id from private.exclusions where kind = 'visitor'
  union select distinct visitor from private.events
   where visitor is not null and slug in (select private.excluded_slugs())
     and event in ('invitation_created', 'invitation_updated', 'invitation_attached', 'rsvps_listed', 'share', 'qr_download');
$$;
revoke all on function private.excluded_accounts(), private.excluded_slugs(), private.excluded_visitors(), private.is_admin() from public, anon, authenticated;

drop function if exists public.admin_dashboard(date, date);
create or replace function public.admin_dashboard(p_from date, p_to date, p_exclude boolean default true) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare d0 timestamptz; d1 timestamptz; v jsonb; xa uuid[] := '{}'; xs text[] := '{}'; xv text[] := '{}'; me text;
begin
  if not private.is_admin() then raise exception 'not admin' using errcode = '42501'; end if;
  -- Le réseau depuis lequel l'admin consulte le tableau de bord est le sien : on l'exclut aussi.
  me := private.client_id();
  if me is not null then insert into private.exclusions(kind, id) values ('visitor', me) on conflict do nothing; end if;
  if p_exclude then
    xa := array(select private.excluded_accounts());
    xs := array(select private.excluded_slugs());
    xv := array(select private.excluded_visitors());
  end if;
  if p_from is null or p_to is null or p_from > p_to or p_to - p_from > 731 then
    raise exception 'période invalide' using errcode = '22023';
  end if;
  d0 := p_from::timestamp at time zone 'Europe/Paris';
  d1 := (p_to + 1)::timestamp at time zone 'Europe/Paris';

  with p as (
    select 'actuelle' as periode, d0 as a, d1 as b
    union all select 'precedente', d0 - (d1 - d0), d0
  ),
  ev as (select * from private.events where not (coalesce(visitor, '') = any(xv)) and not (coalesce(slug, '') = any(xs))),
  us as (select * from auth.users where not (id = any(xa))),
  e as (select p.periode, ev.* from p join ev on ev.created_at >= p.a and ev.created_at < p.b),
  -- Réseaux qui ont créé ou gèrent chaque faire-part : leurs ouvertures ne sont pas des ouvertures d'invités.
  own as (select distinct slug, visitor from private.events where visitor is not null and slug is not null and event in ('invitation_created', 'invitation_updated', 'invitation_attached', 'rsvps_listed', 'share', 'qr_download')),
  s as (select periode, visitor, (created_at at time zone 'Europe/Paris')::date as jour, max((meta->>'seconds')::int) as sec
        from e where event = 'session_end' and meta ? 'seconds' group by 1, 2, 3),
  m as (
    select p.periode,
      (select count(distinct visitor) from e where e.periode = p.periode and event = 'landing_view') as visiteurs,
      (select count(*) from e where e.periode = p.periode and event = 'landing_view') as pages_accueil,
      (select count(distinct visitor) from e where e.periode = p.periode and event = 'editor_start') as demarres,
      (select count(distinct visitor) from e where e.periode = p.periode and event in ('auth_gate', 'invitation_created')) as termines,
      (select count(*) from us u where u.created_at >= p.a and u.created_at < p.b) as comptes,
      (select count(*) from e where e.periode = p.periode and event = 'invitation_created') as faire_part,
      (select count(*) from e where e.periode = p.periode and event = 'invitation_created' and meta->>'src' = 'faire-part') as faire_part_viraux,
      (select count(distinct (slug, visitor)) from e where e.periode = p.periode and event = 'invitation_viewed'
         and not exists (select 1 from own where own.slug = e.slug and own.visitor = e.visitor)) as ouvertures_invites,
      (select count(*) from e where e.periode = p.periode and event = 'rsvp_submitted' and coalesce((meta->>'edit')::boolean, false) = false) as reponses_rsvp,
      (select count(*) from s where s.periode = p.periode) as sessions_mesurees,
      (select round(percentile_cont(0.5) within group (order by sec))::int from s where s.periode = p.periode) as duree_mediane_s,
      (select round(avg(sec))::int from s where s.periode = p.periode) as duree_moyenne_s
    from p
  ),
  k as (
    select m.*,
      round(100.0 * demarres / nullif(visiteurs, 0), 1) as taux_demarrage,
      round(100.0 * termines / nullif(demarres, 0), 1) as taux_finalisation,
      round(100.0 * comptes / nullif(termines, 0), 1) as taux_ouverture,
      round(100.0 * faire_part / nullif(comptes, 0), 1) as taux_publication,
      round(100.0 * comptes / nullif(visiteurs, 0), 1) as taux_transformation,
      round(100.0 * reponses_rsvp / nullif(ouvertures_invites, 0), 1) as taux_reponse_invites
    from m
  ),
  j as (select generate_series(p_from, p_to, interval '1 day')::date as jour),
  ej as (select (created_at at time zone 'Europe/Paris')::date as jour, event, visitor from ev
         where created_at >= d0 and created_at < d1 and event in ('landing_view', 'editor_start', 'invitation_created')),
  uj as (select (created_at at time zone 'Europe/Paris')::date as jour, count(*) as n from us
         where created_at >= d0 and created_at < d1 group by 1),
  jr as (
    select to_char(j.jour, 'YYYY-MM-DD') as jour,
      (select count(distinct visitor) from ej where ej.jour = j.jour and event = 'landing_view') as visiteurs,
      (select count(distinct visitor) from ej where ej.jour = j.jour and event = 'editor_start') as demarres,
      coalesce((select n from uj where uj.jour = j.jour), 0) as comptes,
      (select count(*) from ej where ej.jour = j.jour and event = 'invitation_created') as faire_part
    from j
  ),
  ap as (select coalesce(meta->>'device', 'inconnu') as appareil, count(distinct visitor) as visiteurs
         from ev where event = 'landing_view' and created_at >= d0 and created_at < d1 group by 1),
  es as (select event, visitor, coalesce(meta->>'src', 'direct') as src from ev
         where created_at >= d0 and created_at < d1 and event in ('landing_view', 'editor_start', 'invitation_created')),
  so as (select src as source,
           count(distinct visitor) filter (where event = 'landing_view') as visiteurs,
           count(distinct visitor) filter (where event = 'editor_start') as demarres,
           count(*) filter (where event = 'invitation_created') as faire_part
         from es group by 1)
  select jsonb_build_object(
    'periode', jsonb_build_object('from', p_from, 'to', p_to),
    'totaux', jsonb_build_object('comptes', (select count(*) from us), 'faire_part', (select count(*) from invitations where not (slug = any(xs)))),
    'exclusion', jsonb_build_object('active', p_exclude, 'comptes', cardinality(xa), 'faire_part', cardinality(xs), 'visiteurs', cardinality(xv)),
    'kpis', (select jsonb_object_agg(periode, to_jsonb(k) - 'periode') from k),
    'jours', (select coalesce(jsonb_agg(to_jsonb(jr) order by jr.jour), '[]'::jsonb) from jr),
    'appareils', (select coalesce(jsonb_agg(jsonb_build_object('appareil', appareil, 'visiteurs', visiteurs,
                    'part_pct', round(100.0 * visiteurs / nullif((select sum(visiteurs) from ap), 0), 1)) order by visiteurs desc), '[]'::jsonb) from ap),
    'sources', (select coalesce(jsonb_agg(jsonb_build_object('source', source, 'visiteurs', visiteurs, 'demarres', demarres, 'faire_part', faire_part,
                    'part_pct', round(100.0 * visiteurs / nullif((select sum(visiteurs) from so), 0), 1)) order by visiteurs desc, faire_part desc), '[]'::jsonb)
                  from so where visiteurs > 0 or faire_part > 0)
  ) into v;
  return v;
end $$;

revoke all on function public.admin_dashboard(date, date, boolean) from public, anon, authenticated;
grant execute on function public.admin_dashboard(date, date, boolean) to authenticated;

-- Détail des comptes créés sur la période (e-mail compris : réservé à l'admin).
create or replace function public.admin_accounts(p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not private.is_admin() then raise exception 'not admin' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', u.id, 'email', u.email, 'created_at', u.created_at, 'last_sign_in_at', u.last_sign_in_at,
      'provider', coalesce(u.raw_app_meta_data->>'provider', 'email'),
      'admin', exists (select 1 from private.admins a where a.user_id = u.id),
      'excluded', u.id in (select private.excluded_accounts()),
      'faire_part', (select jsonb_agg(jsonb_build_object('slug', i.slug, 'partner1', i.config->>'partner1', 'partner2', i.config->>'partner2'))
                     from invitations i where i.owner = u.id)
    ) order by u.created_at desc)
    from auth.users u
    where u.created_at >= p_from::timestamp at time zone 'Europe/Paris' and u.created_at < (p_to + 1)::timestamp at time zone 'Europe/Paris'
  ), '[]'::jsonb);
end $$;

-- Détail des faire-part créés sur la période, y compris ceux supprimés depuis (prénoms alors inconnus).
drop function if exists public.admin_invitations(date, date);
-- Ouvertures et réponses comptées sur la période, comme les cartes ; hors créateur du faire-part et, si p_exclude, hors activité de l'admin.
create or replace function public.admin_invitations(p_from date, p_to date, p_exclude boolean default true) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare d0 timestamptz := p_from::timestamp at time zone 'Europe/Paris'; d1 timestamptz := (p_to + 1)::timestamp at time zone 'Europe/Paris'; xv text[] := '{}';
begin
  if not private.is_admin() then raise exception 'not admin' using errcode = '42501'; end if;
  if p_exclude then xv := array(select private.excluded_visitors()); end if;
  return coalesce((
    with c as (
      select slug, created_at from invitations where created_at >= d0 and created_at < d1
      union
      select slug, min(created_at) from private.events where event = 'invitation_created' and created_at >= d0 and created_at < d1
        and slug is not null and slug not in (select slug from invitations) group by slug
    )
    select jsonb_agg(jsonb_build_object(
      'slug', c.slug, 'created_at', c.created_at, 'online', i.slug is not null,
      'partner1', i.config->>'partner1', 'partner2', i.config->>'partner2', 'wedding_date', i.config->>'date',
      'owner_email', u.email,
      'ouvertures', (select count(distinct v.visitor) from private.events v where v.event = 'invitation_viewed' and v.slug = c.slug
                       and v.created_at >= d0 and v.created_at < d1 and not (coalesce(v.visitor, '') = any(xv))
                       and not exists (select 1 from private.events o where o.slug = c.slug and o.visitor = v.visitor and o.event in ('invitation_created', 'invitation_updated', 'invitation_attached', 'rsvps_listed', 'share', 'qr_download'))),
      'reponses', (select count(*) from rsvps r where r.slug = c.slug and r.created_at >= d0 and r.created_at < d1
                     and coalesce((r.data->>'manual')::boolean, false) = false),
      'excluded', c.slug in (select private.excluded_slugs()),
      'excluded_by_account', i.owner in (select private.excluded_accounts())
    ) order by c.created_at desc)
    from c left join invitations i on i.slug = c.slug left join auth.users u on u.id = i.owner
  ), '[]'::jsonb);
end $$;

-- Exclure ou réintégrer un compte ou un faire-part (un compte admin reste toujours exclu).
create or replace function public.admin_set_exclusion(p_kind text, p_id text, p_excluded boolean) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not private.is_admin() then raise exception 'not admin' using errcode = '42501'; end if;
  if p_kind not in ('account', 'slug') or p_id is null or length(p_id) > 100 then raise exception 'exclusion invalide' using errcode = '22023'; end if;
  if p_excluded then insert into private.exclusions(kind, id) values (p_kind, p_id) on conflict do nothing;
  else delete from private.exclusions where kind = p_kind and id = p_id; end if;
end $$;

revoke all on function public.admin_accounts(date, date), public.admin_invitations(date, date, boolean), public.admin_set_exclusion(text, text, boolean) from public, anon, authenticated;
grant execute on function public.admin_accounts(date, date), public.admin_invitations(date, date, boolean), public.admin_set_exclusion(text, text, boolean) to authenticated;

-- ---------------------------------------------------------------- Retours utilisateurs (26/11/2026)
-- Note de l'expérience de création (0 à 10, une par compte, modifiable) + avis libre, et signalements
-- (bug, mécontentement, idée), ouverts aussi aux visiteurs sans compte. Chaque nouveau retour envoie un e-mail
-- aux administrateurs (private.admins) via Resend, si la clé est dans le coffre (sinon rien n'est envoyé).
-- Lecture : section « Retours » de /admin/ (admin_feedback). Conservation : 13 mois.
create extension if not exists pg_net with schema extensions;

-- (private.html est aussi définie plus haut : répétée ici pour que cette section soit rejouable seule.)
create or replace function private.html(p text) returns text
language sql immutable set search_path = '' as $$
  select replace(replace(replace(replace(replace(coalesce(p, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;'), '''', '&#39;');
$$;
revoke all on function private.html(text) from public, anon, authenticated;

create table if not exists private.feedback (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  kind       text not null check (kind in ('rating', 'bug', 'unhappy', 'idea')),
  score      smallint check (score between 0 and 10),
  message    text check (char_length(message) <= 2000),
  email      text check (char_length(email) <= 254),
  account    uuid references auth.users(id) on delete set null,
  visitor    text,
  slug       text,
  context    jsonb not null default '{}'::jsonb,
  status     text not null default 'new' check (status in ('new', 'in_progress', 'done')),
  constraint feedback_score_rating check ((kind = 'rating') = (score is not null))
);
create unique index if not exists feedback_rating_one on private.feedback(account) where kind = 'rating';
create index if not exists feedback_created_idx on private.feedback(created_at desc);
alter table private.feedback enable row level security;
revoke all on private.feedback from public, anon, authenticated;

-- E-mail aux administrateurs pour un retour. Ne casse jamais l'envoi du retour.
create or replace function private.notify_feedback(p_id bigint) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_key text; f private.feedback; v_to jsonb; v_label text; v_subject text; v_html text; v_txt text; v_from text; v_ctx text;
begin
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  if v_key is null or v_key = '' then return; end if;
  select * into f from private.feedback where id = p_id;
  if not found then return; end if;
  select jsonb_agg(u.email) into v_to from private.admins a join auth.users u on u.id = a.user_id where u.email is not null;
  if v_to is null then return; end if;
  v_from := coalesce(f.email, (select email from auth.users where id = f.account), 'visiteur sans compte');
  v_label := case f.kind when 'rating' then 'Note ' || f.score || '/10' when 'bug' then 'Bug signalé'
               when 'unhappy' then 'Mécontentement' else 'Idée' end;
  v_subject := '[Maison Meli] ' || v_label || coalesce(' · ' || left(regexp_replace(f.message, '\s+', ' ', 'g'), 60), '');
  v_ctx := concat_ws(' · ', f.context->>'page', f.context->>'device',
             case when f.context ? 'vw' then (f.context->>'vw') || '×' || (f.context->>'vh') || ' px' end,
             case when f.context ? 'step' then 'étape ' || (f.context->>'step') end, f.slug);
  v_html := '<div style="font-family:Helvetica,Arial,sans-serif;color:#1C1A17;max-width:560px">'
    || '<p style="margin:0 0 4px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8A6D33">Maison Meli · nouveau retour</p>'
    || '<h1 style="margin:0 0 16px;font-family:Georgia,serif;font-weight:400;font-size:26px">' || private.html(v_label) || '</h1>'
    || '<p style="margin:0 0 16px;font-size:16px;white-space:pre-wrap">' || coalesce(private.html(f.message), '<em>(sans commentaire)</em>') || '</p>'
    || '<p style="margin:0 0 6px;font-size:14px"><strong>De :</strong> ' || private.html(v_from) || '</p>'
    || '<p style="margin:0 0 6px;font-size:14px"><strong>Contexte :</strong> ' || private.html(nullif(v_ctx, '')) || '</p>'
    || case when jsonb_array_length(coalesce(f.context->'errors', '[]'::jsonb)) > 0
         then '<p style="margin:0 0 6px;font-size:13px;color:#6B645B"><strong>Erreurs JS :</strong><br>'
              || (select string_agg(private.html(e), '<br>') from jsonb_array_elements_text(f.context->'errors') e) || '</p>' else '' end
    || '<p style="margin:16px 0 0"><a href="https://staging.maison-meli.com/admin/#retours">Voir tous les retours</a></p></div>';
  v_txt := v_label || E'\n\n' || coalesce(f.message, '(sans commentaire)') || E'\n\nDe : ' || v_from
    || E'\nContexte : ' || coalesce(nullif(v_ctx, ''), '—') || E'\n\nTous les retours : https://staging.maison-meli.com/admin/#retours';
  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_key, 'Content-Type', 'application/json'),
    body := jsonb_strip_nulls(jsonb_build_object(
      'from', 'Maison Meli <notifications@maison-meli.com>', 'to', v_to,
      'reply_to', case when v_from ~ '@' then v_from end,
      'subject', v_subject, 'html', v_html, 'text', v_txt)));
exception when others then
  null; -- l'alerte ne doit jamais empêcher d'enregistrer le retour
end $$;
revoke all on function private.notify_feedback(bigint) from public, anon, authenticated;

-- Envoyer un retour. p_kind : rating (compte obligatoire, p_score 0-10) | bug | unhappy | idea (p_message obligatoire).
-- p_context : liste blanche (page, step, vw, vh, editing, ua, errors). p_hp : champ piège invisible (robots).
create or replace function public.submit_feedback(p_kind text, p_score integer default null, p_message text default null,
  p_email text default null, p_context jsonb default '{}'::jsonb, p_hp text default null) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid uuid := private.account_id(); v_msg text; v_email text; v_ctx jsonb := '{}'::jsonb; v_slug text; v_id bigint;
  ua text; dev text; v_err jsonb;
begin
  if coalesce(p_hp, '') <> '' then return; end if; -- robot : on fait comme si de rien n'était
  if p_kind is null or p_kind not in ('rating', 'bug', 'unhappy', 'idea') then raise exception 'invalid kind' using errcode = '22023'; end if;
  perform private.rate_limit('feedback', 5);
  v_msg := nullif(btrim(left(coalesce(p_message, ''), 2000)), '');
  if p_kind = 'rating' then
    if v_uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
    if p_score is null or p_score < 0 or p_score > 10 then raise exception 'invalid score' using errcode = '22023'; end if;
  elsif v_msg is null or char_length(v_msg) < 3 then
    raise exception 'message required' using errcode = '22023';
  end if;
  v_email := nullif(lower(btrim(coalesce(p_email, ''))), '');
  if v_email is not null and v_email !~ '^[^\s@]{1,64}@[^\s@]+\.[a-z]{2,24}$' then raise exception 'invalid email' using errcode = '22023'; end if;
  if v_email is null and v_uid is not null then select email into v_email from auth.users where id = v_uid; end if;

  begin ua := nullif(current_setting('request.headers', true), '')::json->>'user-agent'; exception when others then ua := null; end;
  dev := case
    when ua is null or ua = '' then 'inconnu'
    when ua ~* 'ipad|tablet|playbook|silk|kindle' or (ua ~* 'android' and ua !~* 'mobile') then 'tablette'
    when ua ~* 'mobi|iphone|ipod|android|windows phone' then 'mobile'
    else 'ordinateur' end;
  v_ctx := jsonb_build_object('device', dev);
  if jsonb_typeof(p_context) = 'object' then
    if p_context->>'page' ~ '^/[A-Za-z0-9/._-]{0,120}$' then v_ctx := v_ctx || jsonb_build_object('page', p_context->>'page'); end if;
    if p_context->>'step' ~ '^[a-z]{2,20}$' then v_ctx := v_ctx || jsonb_build_object('step', p_context->>'step'); end if;
    if jsonb_typeof(p_context->'vw') = 'number' and (p_context->>'vw')::numeric between 100 and 10000 then v_ctx := v_ctx || jsonb_build_object('vw', round((p_context->>'vw')::numeric)::int); end if;
    if jsonb_typeof(p_context->'vh') = 'number' and (p_context->>'vh')::numeric between 100 and 10000 then v_ctx := v_ctx || jsonb_build_object('vh', round((p_context->>'vh')::numeric)::int); end if;
    if jsonb_typeof(p_context->'editing') = 'boolean' then v_ctx := v_ctx || jsonb_build_object('editing', p_context->'editing'); end if;
    if p_kind <> 'rating' then
      -- Navigateur exact et dernières erreurs : seulement pour un signalement, utiles pour reproduire.
      if ua is not null then v_ctx := v_ctx || jsonb_build_object('ua', left(ua, 300)); end if;
      if jsonb_typeof(p_context->'errors') = 'array' then
        select jsonb_agg(left(e, 300)) into v_err from (select e from jsonb_array_elements_text(p_context->'errors') e limit 5) x;
        if v_err is not null then v_ctx := v_ctx || jsonb_build_object('errors', v_err); end if;
      end if;
    end if;
  end if;
  if v_uid is not null then select slug into v_slug from invitations where owner = v_uid; end if;

  if p_kind = 'rating' then
    insert into private.feedback(kind, score, message, email, account, visitor, slug, context)
    values ('rating', p_score, v_msg, v_email, v_uid, private.client_id(), v_slug, v_ctx)
    on conflict (account) where kind = 'rating' do update
      set score = excluded.score, message = excluded.message, email = excluded.email, slug = excluded.slug,
          context = excluded.context, updated_at = now(), status = 'new'
    returning id into v_id;
  else
    insert into private.feedback(kind, message, email, account, visitor, slug, context)
    values (p_kind, v_msg, v_email, v_uid, private.client_id(), v_slug, v_ctx)
    returning id into v_id;
  end if;
  perform private.log_event('feedback_submitted', null, v_slug,
    jsonb_strip_nulls(jsonb_build_object('kind', p_kind, 'score', case when p_kind = 'rating' then p_score end)));
  perform private.notify_feedback(v_id);
  if random() < 0.02 then delete from private.feedback where created_at < now() - interval '13 months'; end if; -- conservation
end $$;

-- La note du compte connecté : { score, message, updated_at } ou null.
create or replace function public.account_rating() returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare v_uid uuid := private.account_id();
begin
  if v_uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  return (select jsonb_build_object('score', score, 'message', message, 'updated_at', updated_at)
          from private.feedback where kind = 'rating' and account = v_uid);
end $$;

-- /admin/ : retours de la période (notes : moyenne et répartition hors activité exclue ; liste complète).
create or replace function public.admin_feedback(p_from date, p_to date, p_exclude boolean default true) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare d0 timestamptz; d1 timestamptz; xa uuid[] := '{}'; xv text[] := '{}';
begin
  if not private.is_admin() then raise exception 'not admin' using errcode = '42501'; end if;
  if p_from is null or p_to is null or p_from > p_to or p_to - p_from > 731 then raise exception 'période invalide' using errcode = '22023'; end if;
  d0 := p_from::timestamp at time zone 'Europe/Paris';
  d1 := (p_to + 1)::timestamp at time zone 'Europe/Paris';
  xa := array(select private.excluded_accounts());
  xv := array(select private.excluded_visitors());
  return (
    with f as (
      select fb.*, (coalesce(fb.account = any(xa), false) or coalesce(fb.visitor, '') = any(xv)) as excluded,
             (select email from auth.users u where u.id = fb.account) as account_email
      from private.feedback fb where fb.updated_at >= d0 and fb.updated_at < d1
    ),
    r as (select score from f where kind = 'rating' and (not p_exclude or not excluded))
    select jsonb_build_object(
      'notes', jsonb_build_object(
        'nombre', (select count(*) from r),
        'moyenne', (select round(avg(score), 1) from r),
        'repartition', (select jsonb_agg((select count(*) from r where score = s) order by s) from generate_series(0, 10) s)),
      'signalements', (select count(*) from f where kind <> 'rating' and (not p_exclude or not excluded)),
      'a_traiter', (select count(*) from f where kind <> 'rating' and status <> 'done' and (not p_exclude or not excluded)),
      'items', coalesce((select jsonb_agg(jsonb_build_object(
          'id', id, 'created_at', created_at, 'updated_at', updated_at, 'kind', kind, 'score', score, 'message', message,
          'email', coalesce(email, account_email), 'account', account is not null, 'slug', slug, 'context', context,
          'status', status, 'excluded', excluded) order by updated_at desc) from f), '[]'::jsonb)
    ));
end $$;

create or replace function public.admin_set_feedback_status(p_id bigint, p_status text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not private.is_admin() then raise exception 'not admin' using errcode = '42501'; end if;
  if p_status not in ('new', 'in_progress', 'done') then raise exception 'statut invalide' using errcode = '22023'; end if;
  update private.feedback set status = p_status where id = p_id;
end $$;

revoke all on function public.submit_feedback(text, integer, text, text, jsonb, text), public.account_rating(),
  public.admin_feedback(date, date, boolean), public.admin_set_feedback_status(bigint, text) from public, anon, authenticated;
grant execute on function public.submit_feedback(text, integer, text, text, jsonb, text) to anon, authenticated;
grant execute on function public.account_rating(), public.admin_feedback(date, date, boolean), public.admin_set_feedback_status(bigint, text) to authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'rsvp-digest';
select cron.schedule('rsvp-digest', '30 7 * * *', 'select private.send_rsvp_digests()');

commit;

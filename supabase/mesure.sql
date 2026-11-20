-- Mesure du funnel (PRD Maison Meli, section KPIs) : de la visite au premier RSVP, sans cookie publicitaire.
-- Idempotent : rejouable dans le SQL Editor. Appliqué en production sous le nom de migration « mesure_funnel ».
--
-- Journal : private.events (schéma non exposé par l'API). Un visiteur = empreinte SHA-256 de son adresse IP
-- (private.client_id, déjà utilisée pour limiter les abus) : aucune IP en clair, aucun identifiant sur l'appareil.
--
-- Événements                    | Origine                      | Sert à
-- landing_view {src}            | navigateur (index.html)      | visiteurs uniques par source
-- editor_start {src}            | navigateur (prénoms saisis)  | taux de démarrage
-- auth_gate                     | navigateur (clic Publier)    | abandon à l'étape compte
-- invitation_created {src}      | account_create_invitation    | publications, coefficient viral (src = faire-part)
-- invitation_viewed             | get_invitation               | ouvertures uniques du faire-part
-- rsvp_submitted {attendance, seconds, edit} | submit_rsvp     | taux et durée de réponse, premier RSVP
-- share {channel}, qr_download  | navigateur                   | usage du partage
-- cta_create                    | navigateur (après réponse)   | clics « Créez le vôtre »

begin;

create table if not exists private.events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  event text not null,
  tester_id bigint,            -- historique (espaces testeurs supprimés le 19/11/2026)
  slug text,
  visitor text,
  meta jsonb not null default '{}'::jsonb
);
alter table private.events enable row level security; -- schéma non exposé ; lu uniquement depuis le SQL Editor
create index if not exists events_event_created_idx on private.events (event, created_at);
create index if not exists events_slug_idx on private.events (slug);

create or replace function private.log_event(p_event text, p_tester_id bigint default null, p_slug text default null, p_meta jsonb default '{}'::jsonb)
returns void language plpgsql set search_path = public, extensions as $$
begin
  insert into private.events(event, tester_id, slug, visitor, meta)
  values (p_event, p_tester_id, left(p_slug, 63), private.client_id(), coalesce(p_meta, '{}'::jsonb));
  if random() < 0.01 then delete from private.events where created_at < now() - interval '13 months'; end if; -- durée de conservation
exception when others then
  null; -- la mesure ne doit jamais casser l'app
end $$;
revoke all on function private.log_event(text, bigint, text, jsonb) from public, anon, authenticated;

-- Événements envoyés par le navigateur : liste blanche, métadonnées filtrées, 600 / heure / IP. Ne renvoie jamais d'erreur.
create or replace function public.track(p_event text, p_slug text default null, p_meta jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v_meta jsonb := '{}'::jsonb; v_slug text;
begin
  if p_event is null or p_event not in ('landing_view', 'editor_start', 'auth_gate', 'share', 'qr_download', 'cta_create') then return; end if;
  begin
    perform private.rate_limit('track', 600);
  exception when others then return;
  end;
  if jsonb_typeof(p_meta) = 'object' then
    if p_meta->>'src' in ('direct', 'seo', 'ia', 'faire-part', 'reseaux', 'email', 'autre') then v_meta := v_meta || jsonb_build_object('src', p_meta->>'src'); end if;
    if p_meta->>'channel' in ('natif', 'whatsapp', 'sms', 'email', 'copie') then v_meta := v_meta || jsonb_build_object('channel', p_meta->>'channel'); end if;
  end if;
  if p_slug ~ '^[a-z0-9][a-z0-9-]{2,62}$' and exists (select 1 from invitations where slug = p_slug) then v_slug := p_slug; end if;
  perform private.log_event(p_event, null, v_slug, v_meta);
end $$;
revoke all on function public.track(text, text, jsonb) from public;
grant execute on function public.track(text, text, jsonb) to anon, authenticated;

-- Publication : la provenance du couple (config.meta.src) est journalisée pour le coefficient viral.
create or replace function public.account_create_invitation(p_slug text, p_config jsonb)
returns void language plpgsql security definer set search_path = public, extensions as $$
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
    if v_constraint = 'invitations_owner_one' then raise exception 'one per account'; end if;
    raise;
  end;
  if v_src is null or v_src not in ('direct', 'seo', 'ia', 'faire-part', 'reseaux', 'email', 'autre') then v_src := 'inconnue'; end if;
  perform private.log_event('invitation_created', null, p_slug, jsonb_build_object('theme', p_config->>'theme', 'account', true, 'src', v_src));
end $$;

-- Réponse d'un invité : inchangée, plus la journalisation (présence, durée depuis l'ouverture, correction ou non).
create or replace function public.submit_rsvp(p_slug text, p_data jsonb)
returns void language plpgsql security definer set search_path = public as $$
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
    -- identifiant anonyme du navigateur de l'invité : sert à repérer une réponse corrigée (doublon)
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

-- ---------------------------------------------------------------- Lecture (SQL Editor, réservée au propriétaire)
-- Funnel par semaine. Les comptes viennent de auth.users (un compte supprimé disparaît du décompte).
create or replace view private.funnel_semaine as
with w as (
  select date_trunc('week', created_at)::date as semaine, event, visitor, slug, meta from private.events
  where created_at >= now() - interval '26 weeks'
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
  (select count(*) from w where w.semaine = s.semaine and event = 'cta_create') as clics_creez_le_votre
from (select distinct semaine from w union select date_trunc('week', now())::date) s
order by s.semaine desc;

-- KPIs de la PRD sur 30 jours glissants (cibles de départ entre parenthèses, à recaler après 4 semaines de mesure).
create or replace view private.kpis_30j as
with e as (select * from private.events where created_at >= now() - interval '30 days'),
v as (select count(distinct visitor) filter (where event = 'landing_view') as visiteurs,
             count(distinct visitor) filter (where event = 'editor_start') as demarrages,
             count(*) filter (where event = 'invitation_created') as publications,
             count(*) filter (where event = 'invitation_created' and meta->>'src' = 'faire-part') as virales,
             count(distinct (slug, visitor)) filter (where event = 'invitation_viewed') as ouvertures,
             count(*) filter (where event = 'rsvp_submitted' and coalesce((meta->>'edit')::boolean, false) = false) as reponses,
             count(*) filter (where event = 'cta_create') as clics_cta,
             percentile_cont(0.5) within group (order by (meta->>'seconds')::numeric)
               filter (where event = 'rsvp_submitted' and coalesce((meta->>'edit')::boolean, false) = false and meta ? 'seconds') as duree_mediane_s
      from e),
c as (select count(*) as comptes from auth.users where created_at >= now() - interval '30 days'),
r as (select count(*) filter (where premier is not null and premier <= i.created_at + interval '7 days') as avec_rsvp_7j, count(*) as eligibles
      from public.invitations i
      left join lateral (select min(created_at) as premier from public.rsvps r where r.slug = i.slug) x on true
      where i.created_at <= now() - interval '7 days'),
a as (select count(*) as actifs from public.invitations i where (select count(distinct coalesce(nullif(data->>'rid', ''), lower(data->>'name'))) from public.rsvps r where r.slug = i.slug) >= 10)
select
  v.visiteurs                                                             as visiteurs_uniques,
  round(100.0 * v.demarrages / nullif(v.visiteurs, 0), 1)                 as demarrage_pct,            -- (25 %)
  round(100.0 * c.comptes / nullif(v.demarrages, 0), 1)                   as compte_cree_pct,          -- (50 %)
  round(100.0 * v.publications / nullif(c.comptes, 0), 1)                 as publication_pct,          -- (80 %)
  round(100.0 * r.avec_rsvp_7j / nullif(r.eligibles, 0), 1)               as premier_rsvp_7j_pct,      -- (70 %)
  a.actifs                                                                as faire_part_actifs,        -- North Star (≥ 10 réponses)
  round(100.0 * v.reponses / nullif(v.ouvertures, 0), 1)                  as taux_reponse_pct,         -- (60 %)
  v.duree_mediane_s                                                       as duree_reponse_mediane_s,  -- (< 60 s)
  round(100.0 * v.clics_cta / nullif(v.reponses, 0), 1)                   as clics_creez_le_votre_pct, -- (3 %)
  round(v.virales::numeric / nullif(v.publications, 0), 2)                as coefficient_viral_k,      -- (0,3 à 12 mois)
  v.publications, v.reponses, c.comptes
from v, c, r, a;

revoke all on private.funnel_semaine, private.kpis_30j from public, anon, authenticated;

commit;

-- 20/11/2026 : aperçu de lien personnalisé (Worker Cloudflare). Prénoms, date et palette seulement ; ne journalise
-- rien, pour ne pas compter les robots d'aperçu comme des ouvertures. Appliqué en production (migration
-- get_invitation_preview).
create or replace function public.get_invitation_preview(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'p1', left(coalesce(config->>'partner1', ''), 40),
    'p2', left(coalesce(config->>'partner2', ''), 40),
    'date', case when config->>'date' ~ '^\d{4}-\d{2}-\d{2}$' then config->>'date' else '' end,
    'theme', left(coalesce(config->>'theme', ''), 20))
  from invitations where slug = p_slug;
$$;
revoke execute on function public.get_invitation_preview(text) from public, authenticated;
grant execute on function public.get_invitation_preview(text) to anon;

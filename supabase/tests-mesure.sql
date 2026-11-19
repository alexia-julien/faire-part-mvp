-- Tests de la mesure du funnel, à exécuter après supabase/mesure.sql.
-- Tout s'exécute dans une transaction TOUJOURS annulée : aucune donnée de test ne reste.
-- Le résultat s'affiche dans un message d'erreur volontaire « RESULTATS » : une ligne PASS ou FAIL par vérification.
do $$
declare
  r text := ''; v jsonb; n int; n0 bigint;
  v_s text := 'qa-mesure-' || substr(md5(random()::text), 1, 8);
  v_u uuid := gen_random_uuid(); v_u2 uuid := gen_random_uuid();
begin
  select coalesce(max(id), 0) into n0 from private.events;
  perform set_config('request.headers', '{"x-real-ip":"203.0.113.9"}', true);
  insert into auth.users(id, instance_id, aud, role, email) values
    (v_u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v_s || '@example.com'),
    (v_u2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v_s || '-2@example.com');

  -- Publication par un compte venu d'un faire-part
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_u, 'role', 'authenticated')::text, true);
  perform public.account_create_invitation(v_s, '{"partner1":"Mesure","partner2":"Test","theme":"sauge","meta":{"src":"faire-part","durationSec":42}}'::jsonb);
  perform set_config('request.jwt.claims', json_build_object('sub', v_u2, 'role', 'authenticated')::text, true);
  perform public.account_create_invitation(v_s || '-b', '{"partner1":"Sans","partner2":"Source","meta":{"src":"<script>"}}'::jsonb);
  reset role;
  r := r || case when (select meta->>'src' from private.events where id > n0 and event = 'invitation_created' and slug = v_s) = 'faire-part'
      and (select meta->>'src' from private.events where id > n0 and event = 'invitation_created' and slug = v_s || '-b') = 'inconnue'
    then E'PASS publication : provenance journalisée, valeur inconnue neutralisée\n' else E'FAIL provenance de la publication\n' end;

  -- Événements du navigateur (visiteur non connecté)
  set local role anon;
  perform public.track('landing_view', null, '{"src":"seo","ip":"1.2.3.4","channel":"pirate"}'::jsonb);
  perform public.track('drop_table', null, '{}'::jsonb);
  perform public.track('cta_create', v_s, '{}'::jsonb);
  perform public.track('share', 'slug-inexistant-zz', '{"channel":"whatsapp"}'::jsonb);
  perform public.track('editor_start', null, '[1,2]'::jsonb);
  perform public.track(null, null, null);
  reset role;
  r := r || case when (select meta from private.events where id > n0 and event = 'landing_view') = '{"src":"seo"}'::jsonb
    then E'PASS track : métadonnées filtrées (source gardée, le reste écarté)\n' else E'FAIL filtrage des métadonnées\n' end;
  r := r || case when not exists (select 1 from private.events where id > n0 and event = 'drop_table') and not exists (select 1 from private.events where id > n0 and event is null)
    then E'PASS track : événement hors liste blanche ignoré, sans erreur\n' else E'FAIL liste blanche\n' end;
  r := r || case when (select slug from private.events where id > n0 and event = 'cta_create') = v_s
      and (select slug from private.events where id > n0 and event = 'share') is null
      and (select meta from private.events where id > n0 and event = 'share') = '{"channel":"whatsapp"}'::jsonb
    then E'PASS track : faire-part existant rattaché, identifiant inconnu écarté\n' else E'FAIL rattachement au faire-part\n' end;
  r := r || case when (select visitor from private.events where id > n0 and event = 'landing_view') = encode(extensions.digest('203.0.113.9', 'sha256'), 'hex')
      and not exists (select 1 from private.events where id > n0 and (visitor like '%203.0.113%' or meta::text like '%203.0.113%'))
    then E'PASS visiteur = empreinte de l''IP, jamais l''IP en clair\n' else E'FAIL empreinte du visiteur\n' end;

  -- Réponses d'invités : durée, correction, rien de plus dans les données des mariés
  set local role anon;
  perform public.submit_rsvp(v_s, '{"name":"Ana","attendance":"yes","guests":2,"rid":"abcdefghijkl1234","elapsed":37}'::jsonb);
  perform public.submit_rsvp(v_s, '{"name":"Ana","attendance":"no","rid":"abcdefghijkl1234","elapsed":999999}'::jsonb);
  perform public.submit_rsvp(v_s, '{"name":"Bob","attendance":"yes","elapsed":"vite"}'::jsonb);
  reset role;
  v := (select jsonb_agg(meta order by id) from private.events where id > n0 and event = 'rsvp_submitted');
  r := r || case when v->0 = '{"attendance":"yes","edit":false,"seconds":37}'::jsonb and (v->1->>'edit')::boolean and not (v->1 ? 'seconds')
      and v->2 = '{"attendance":"yes","edit":false}'::jsonb
    then E'PASS réponse journalisée : présence, durée bornée, correction repérée\n' else 'FAIL journal des réponses : ' || coalesce(v::text, 'null') || E'\n' end;
  r := r || case when not exists (select 1 from public.rsvps where slug = v_s and data ? 'elapsed') and (select count(*) from public.rsvps where slug = v_s) = 3
    then E'PASS la durée n''est pas stockée dans les réponses vues par les mariés\n' else E'FAIL donnée de mesure stockée dans la réponse\n' end;

  -- Ouverture
  set local role anon;
  perform public.get_invitation(v_s);
  reset role;
  r := r || case when exists (select 1 from private.events where id > n0 and event = 'invitation_viewed' and slug = v_s)
    then E'PASS ouverture du faire-part journalisée\n' else E'FAIL ouverture\n' end;

  -- Limitation : 600 événements / heure / IP, au-delà ignorés sans erreur
  set local role anon;
  for n in 1..610 loop perform public.track('qr_download', v_s, '{}'::jsonb); end loop;
  reset role;
  select count(*) into n from private.events where id > n0 and event = 'qr_download';
  r := r || case when n between 590 and 600 then E'PASS track limité à 600 par heure et par IP, sans erreur\n' else 'FAIL limitation : ' || n || E'\n' end;

  -- Accès
  set local role anon;
  begin perform 1 from private.events limit 1; r := r || E'FAIL visiteur : journal lisible\n';
  exception when insufficient_privilege then r := r || E'PASS visiteur : journal illisible\n'; end;
  begin perform 1 from private.kpis_30j; r := r || E'FAIL visiteur : KPIs lisibles\n';
  exception when insufficient_privilege then r := r || E'PASS visiteur : KPIs illisibles\n'; end;
  reset role;
  set local role authenticated;
  begin perform 1 from private.funnel_semaine; r := r || E'FAIL connecté : funnel lisible\n';
  exception when insufficient_privilege then r := r || E'PASS connecté : funnel illisible\n'; end;
  reset role;

  -- Lecture des indicateurs
  r := r || case when (select publications >= 2 and reponses >= 2 from private.kpis_30j)
      and (select publications_virales >= 1 and corrections >= 1 from private.funnel_semaine where semaine = date_trunc('week', now())::date)
    then E'PASS vues KPIs et funnel calculées\n' else E'FAIL vues\n' end;

  raise exception E'RESULTATS\n%', r;
end $$;

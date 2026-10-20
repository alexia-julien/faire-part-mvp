-- Tests de la base, à exécuter dans Supabase > SQL Editor (ou via le connecteur) après chaque changement de schema.sql.
-- Tout s'exécute dans une transaction qui est TOUJOURS annulée à la fin : aucune donnée de test ne reste.
-- Le résultat s'affiche dans un message d'erreur volontaire « RESULTATS » : une ligne PASS ou FAIL par vérification.
-- Les tests se placent dans la peau du rôle « anon » (le navigateur d'un visiteur), pas du propriétaire de la base.

do $$
declare
  r text := '';
  v jsonb; ok boolean; n int; i int; succ int := 0; first_fail int := 0;
  v_slug text := 'qa-test-' || substr(md5(random()::text), 1, 8);
  v_key  text := 'abcdefghijklmnopqrstuvwx';
  v_bad  text := 'zzzzzzzzzzzzzzzzzzzzzzzz';
  v_id bigint;
begin
  perform set_config('request.headers', '{}', true);
  set local role anon;

  -- Accès direct interdit
  begin perform 1 from public.invitations limit 1; r := r || E'FAIL lecture directe de invitations autorisée\n';
  exception when insufficient_privilege then r := r || E'PASS lecture directe de invitations refusée\n'; end;
  begin perform 1 from public.rsvps limit 1; r := r || E'FAIL lecture directe de rsvps autorisée\n';
  exception when insufficient_privilege then r := r || E'PASS lecture directe de rsvps refusée\n'; end;
  begin insert into public.rsvps(slug, data) values ('x', '{}'); r := r || E'FAIL insertion directe autorisée\n';
  exception when insufficient_privilege then r := r || E'PASS insertion directe refusée\n'; end;
  begin delete from public.rsvps; r := r || E'FAIL suppression directe autorisée\n';
  exception when insufficient_privilege then r := r || E'PASS suppression directe refusée\n'; end;
  begin perform private.rate_limit('x', 1); r := r || E'FAIL schéma private accessible\n';
  exception when insufficient_privilege then r := r || E'PASS schéma private inaccessible\n'; end;

  -- Création et validations
  perform public.create_invitation(v_slug, v_key, '{"partner1":"A","partner2":"B","date":"2027-08-07"}'::jsonb);
  r := r || E'PASS création d''un faire-part\n';
  begin perform public.create_invitation(v_slug || 'x', 'court', '{}'::jsonb); r := r || E'FAIL clé trop courte acceptée\n';
  exception when others then r := r || case when sqlerrm = 'invalid key' then E'PASS clé trop courte refusée\n' else 'FAIL clé courte : ' || sqlerrm || E'\n' end; end;
  begin perform public.create_invitation(v_slug, v_key, '{}'::jsonb); r := r || E'FAIL slug en double accepté\n';
  exception when unique_violation then r := r || E'PASS slug en double refusé\n'; end;
  begin perform public.create_invitation('qa-bad-photos', v_key, '{"photos":["a","b","c","d"]}'::jsonb); r := r || E'FAIL 4 photos acceptées\n';
  exception when others then r := r || case when sqlerrm = 'invalid photos' then E'PASS 4 photos refusées\n' else 'FAIL 4 photos : ' || sqlerrm || E'\n' end; end;
  begin perform public.create_invitation('qa-bad-cfg', v_key, '[1,2]'::jsonb); r := r || E'FAIL config non objet acceptée\n';
  exception when others then r := r || case when sqlerrm = 'invalid config' then E'PASS config non objet refusée\n' else 'FAIL config : ' || sqlerrm || E'\n' end; end;
  begin perform public.create_invitation('A', v_key, '{}'::jsonb); r := r || E'FAIL slug invalide accepté\n';
  exception when check_violation then r := r || E'PASS slug invalide refusé\n'; end;

  -- Lecture publique
  v := public.get_invitation(v_slug);
  r := r || case when v->>'partner1' = 'A' then E'PASS lecture publique du faire-part\n' else E'FAIL lecture publique\n' end;
  r := r || case when public.get_invitation('inexistant-0000') is null then E'PASS faire-part inconnu = null\n' else E'FAIL faire-part inconnu\n' end;

  -- Modification
  ok := public.update_invitation(v_slug, v_bad, '{"partner1":"HACK"}'::jsonb);
  r := r || case when ok = false and (public.get_invitation(v_slug)->>'partner1') = 'A' then E'PASS modification avec mauvaise clé refusée\n' else E'FAIL modification avec mauvaise clé\n' end;
  ok := public.update_invitation(v_slug, v_key, '{"partner1":"Alexia","partner2":"B","tz":"Europe/Paris"}'::jsonb);
  r := r || case when ok and (public.get_invitation(v_slug)->>'partner1') = 'Alexia' then E'PASS modification avec la bonne clé\n' else E'FAIL modification avec la bonne clé\n' end;

  -- Réponses : contenu hostile reconstruit champ par champ
  perform public.submit_rsvp(v_slug, '{"name":"  Marie  ","attendance":"yes","guests":"99","rid":"abcdefghijkl1234","diet":"vegan","brunch":"maybe","message":"hello","evil":"<script>x</script>","__proto__":{"a":1}}'::jsonb);
  v := public.list_rsvps(v_slug, v_key);
  r := r || case when jsonb_array_length(v) = 1 then E'PASS réponse enregistrée\n' else E'FAIL réponse non enregistrée\n' end;
  r := r || case when v->0->'data' ? 'evil' or v->0->'data' ? '__proto__' then E'FAIL champs inconnus conservés\n' else E'PASS champs inconnus supprimés\n' end;
  r := r || case when (v->0->'data'->>'guests') = '20' then E'PASS nombre de personnes plafonné à 20\n' else 'FAIL guests = ' || (v->0->'data'->>'guests') || E'\n' end;
  r := r || case when (v->0->'data'->>'brunch') = '' then E'PASS brunch invalide neutralisé\n' else E'FAIL brunch invalide conservé\n' end;
  r := r || case when (v->0->'data'->>'name') = 'Marie' then E'PASS nom nettoyé\n' else E'FAIL nom non nettoyé\n' end;
  r := r || case when (v->0->'data'->>'rid') = 'abcdefghijkl1234' then E'PASS identifiant anti-doublon (rid) conservé\n' else E'FAIL rid perdu\n' end;
  perform public.submit_rsvp(v_slug, '{"name":"Paul","attendance":"no","guests":5}'::jsonb);
  perform public.submit_rsvp(v_slug, '{"name":"Zoé","attendance":"yes","guests":"abc","rid":"<script>"}'::jsonb);
  v := public.list_rsvps(v_slug, v_key);
  r := r || case when (v->1->'data'->>'guests') = '0' then E'PASS « absent » force 0 personne\n' else E'FAIL absent : guests\n' end;
  r := r || case when (v->2->'data'->>'guests') = '1' and (v->2->'data'->>'rid') = '' then E'PASS guests invalide = 1, rid invalide vidé\n' else E'FAIL guests/rid invalides\n' end;
  begin perform public.submit_rsvp(v_slug, '{"name":"X","attendance":"peut-être"}'::jsonb); r := r || E'FAIL présence invalide acceptée\n';
  exception when others then r := r || case when sqlerrm = 'invalid attendance' then E'PASS présence invalide refusée\n' else 'FAIL présence : ' || sqlerrm || E'\n' end; end;
  begin perform public.submit_rsvp(v_slug, '{"name":"   ","attendance":"yes"}'::jsonb); r := r || E'FAIL nom vide accepté\n';
  exception when others then r := r || case when sqlerrm = 'name required' then E'PASS nom vide refusé\n' else 'FAIL nom vide : ' || sqlerrm || E'\n' end; end;
  begin perform public.submit_rsvp('inexistant-0000', '{"name":"X","attendance":"yes"}'::jsonb); r := r || E'FAIL réponse sur faire-part inconnu acceptée\n';
  exception when others then r := r || case when sqlerrm = 'not found' then E'PASS réponse sur faire-part inconnu refusée\n' else 'FAIL inconnu : ' || sqlerrm || E'\n' end; end;
  begin perform public.submit_rsvp(v_slug, ('{"name":"X","attendance":"yes","message":"' || repeat('a', 9000) || '"}')::jsonb); r := r || E'FAIL réponse géante acceptée\n';
  exception when others then r := r || case when sqlerrm = 'too large' then E'PASS réponse géante refusée\n' else 'FAIL géante : ' || sqlerrm || E'\n' end; end;

  -- Lecture / suppression protégées par la clé privée
  r := r || case when public.list_rsvps(v_slug, v_bad) is null then E'PASS lecture des réponses avec mauvaise clé = null\n' else E'FAIL lecture avec mauvaise clé\n' end;
  v_id := (public.list_rsvps(v_slug, v_key)->0->>'id')::bigint;
  ok := public.delete_rsvp(v_slug, v_bad, v_id);
  v := public.list_rsvps(v_slug, v_key);
  r := r || case when ok = false and jsonb_array_length(v) = 3 then E'PASS suppression avec mauvaise clé refusée\n' else E'FAIL suppression avec mauvaise clé\n' end;
  ok := public.delete_rsvp(v_slug, v_key, v_id);
  v := public.list_rsvps(v_slug, v_key);
  r := r || case when ok and jsonb_array_length(v) = 2 then E'PASS suppression avec la bonne clé\n' else E'FAIL suppression avec la bonne clé\n' end;

  -- Limitation de débit : 10 créations par heure et par IP
  perform set_config('request.headers', '{"cf-connecting-ip":"203.0.113.7"}', true);
  for i in 1..12 loop
    begin
      perform public.create_invitation('qa-rl-' || i, v_key, '{}'::jsonb); succ := succ + 1;
    exception when sqlstate '54000' then
      if first_fail = 0 then first_fail := i; end if;
    end;
  end loop;
  r := r || case when succ = 10 and first_fail = 11 then E'PASS limite de 10 créations/heure/IP appliquée (11e refusée)\n' else 'FAIL limitation : ' || succ || ' réussies, premier refus n°' || first_fail || E'\n' end;
  perform set_config('request.headers', '{"cf-connecting-ip":"198.51.100.9"}', true);
  begin perform public.create_invitation('qa-rl-other', v_key, '{}'::jsonb); r := r || E'PASS une autre IP n''est pas bloquée\n';
  exception when others then r := r || E'FAIL une autre IP est bloquée\n'; end;

  reset role;
  r := r || case when exists (select 1 from private.rate_limits where ip_hash = '203.0.113.7') then E'FAIL IP stockée en clair\n' else E'PASS IP stockée uniquement sous forme de hash\n' end;

  raise exception E'RESULTATS\n%', r;
end $$;

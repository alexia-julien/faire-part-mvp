-- Tests de la base côté invités, à exécuter dans Supabase > SQL Editor (ou via le connecteur) après chaque changement de schema.sql.
-- Les comptes sont testés par tests-comptes.sql, la mesure par tests-mesure.sql.
-- Tout s'exécute dans une transaction qui est TOUJOURS annulée à la fin : aucune donnée de test ne reste.
-- Le résultat s'affiche dans un message d'erreur volontaire « RESULTATS » : une ligne PASS ou FAIL par vérification.
-- Les tests se placent dans la peau du rôle « anon » (le navigateur d'un invité), pas du propriétaire de la base.

do $$
declare
  r text := ''; v jsonb; n int; i int; succ int := 0; first_fail int := 0;
  v_slug text := 'qa-test-' || substr(md5(random()::text), 1, 8);
  v_u uuid := gen_random_uuid();
begin
  perform set_config('request.headers', '{}', true);
  -- Faire-part de test, créé comme le propriétaire de la base (le parcours compte est testé ailleurs).
  insert into auth.users(id, instance_id, aud, role, email)
    values (v_u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v_slug || '@example.com');
  insert into public.invitations(slug, config, owner) values (v_slug, '{"partner1":"Alexia","partner2":"B","date":"2027-08-07"}', v_u);
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
  begin perform public.account_rsvps(); r := r || E'FAIL fonctions de compte appelables par un invité\n';
  exception when insufficient_privilege then r := r || E'PASS fonctions de compte fermées aux invités\n'; end;

  -- Lecture publique et aperçu de lien
  v := public.get_invitation(v_slug);
  r := r || case when v->>'partner1' = 'Alexia' then E'PASS lecture publique du faire-part\n' else E'FAIL lecture publique\n' end;
  r := r || case when public.get_invitation('inexistant-0000') is null then E'PASS faire-part inconnu = null\n' else E'FAIL faire-part inconnu\n' end;
  v := public.get_invitation_preview(v_slug);
  r := r || case when v->>'p1' = 'Alexia' and v->>'date' = '2027-08-07' and not (v ? 'venue') then E'PASS aperçu de lien : prénoms et date seulement\n' else 'FAIL aperçu : ' || coalesce(v::text, 'null') || E'\n' end;

  -- Réponses : contenu hostile reconstruit champ par champ
  perform public.submit_rsvp(v_slug, '{"name":"  Marie  ","attendance":"yes","guests":"99","rid":"abcdefghijkl1234","diet":"vegan","brunch":"maybe","message":"hello","evil":"<script>x</script>","__proto__":{"a":1}}'::jsonb);
  perform public.submit_rsvp(v_slug, '{"name":"Paul","attendance":"no","guests":5}'::jsonb);
  perform public.submit_rsvp(v_slug, '{"name":"Zoé","attendance":"yes","guests":"abc","rid":"<script>"}'::jsonb);
  perform public.submit_rsvp(v_slug, '{"name":"Léa","attendance":"yes","guests":2,"children":"3","companions":"  Tom Martin  ","email":"lea@example.fr","phone":"+33 6 12 34 56 78","address":"1 rue de la Paix\n75002 Paris","custom":"Dancing Queen","diet":"sans gluten"}'::jsonb);
  perform public.submit_rsvp(v_slug, '{"name":"Max","attendance":"no","children":2,"companions":"X","diet":"vegan","brunch":"yes","email":"max@example.com"}'::jsonb);
  perform public.submit_rsvp(v_slug, '{"name":"Kid","attendance":"yes","children":"99"}'::jsonb);
  perform public.submit_rsvp(v_slug, ('{"name":"Long","attendance":"yes","address":"' || repeat('b', 900) || '","custom":"' || repeat('c', 900) || '","companions":"' || repeat('d', 900) || '"}')::jsonb);

  begin perform public.submit_rsvp(v_slug, '{"name":"X","attendance":"peut-être"}'::jsonb); r := r || E'FAIL présence invalide acceptée\n';
  exception when others then r := r || case when sqlerrm = 'invalid attendance' then E'PASS présence invalide refusée\n' else 'FAIL présence : ' || sqlerrm || E'\n' end; end;
  begin perform public.submit_rsvp(v_slug, '{"name":"   ","attendance":"yes"}'::jsonb); r := r || E'FAIL nom vide accepté\n';
  exception when others then r := r || case when sqlerrm = 'name required' then E'PASS nom vide refusé\n' else 'FAIL nom vide : ' || sqlerrm || E'\n' end; end;
  begin perform public.submit_rsvp('inexistant-0000', '{"name":"X","attendance":"yes"}'::jsonb); r := r || E'FAIL réponse sur faire-part inconnu acceptée\n';
  exception when others then r := r || case when sqlerrm = 'not found' then E'PASS réponse sur faire-part inconnu refusée\n' else 'FAIL inconnu : ' || sqlerrm || E'\n' end; end;
  begin perform public.submit_rsvp(v_slug, ('{"name":"X","attendance":"yes","message":"' || repeat('a', 13000) || '"}')::jsonb); r := r || E'FAIL réponse géante acceptée\n';
  exception when others then r := r || case when sqlerrm = 'too large' then E'PASS réponse géante refusée\n' else 'FAIL géante : ' || sqlerrm || E'\n' end; end;
  begin perform public.submit_rsvp(v_slug, '{"name":"X","attendance":"yes","email":"pas-un-email"}'::jsonb); r := r || E'FAIL email invalide accepté\n';
  exception when others then r := r || case when sqlerrm = 'invalid email' then E'PASS email invalide refusé\n' else 'FAIL email : ' || sqlerrm || E'\n' end; end;
  begin perform public.submit_rsvp(v_slug, '{"name":"X","attendance":"yes","email":"a@b.c<script>"}'::jsonb); r := r || E'FAIL email piégé accepté\n';
  exception when others then r := r || case when sqlerrm = 'invalid email' then E'PASS email piégé refusé\n' else 'FAIL email piégé : ' || sqlerrm || E'\n' end; end;
  begin perform public.submit_rsvp(v_slug, '{"name":"X","attendance":"yes","phone":"<script>alert(1)</script>"}'::jsonb); r := r || E'FAIL téléphone invalide accepté\n';
  exception when others then r := r || case when sqlerrm = 'invalid phone' then E'PASS téléphone invalide refusé\n' else 'FAIL téléphone : ' || sqlerrm || E'\n' end; end;

  -- Limitation de débit : 100 réponses par heure, par IP et par faire-part
  perform set_config('request.headers', '{"cf-connecting-ip":"203.0.113.7"}', true);
  for i in 1..102 loop
    begin
      perform public.submit_rsvp(v_slug, '{"name":"RL","attendance":"no"}'::jsonb); succ := succ + 1;
    exception when sqlstate '54000' then
      if first_fail = 0 then first_fail := i; end if;
    end;
  end loop;
  r := r || case when succ = 100 and first_fail = 101 then E'PASS limite de 100 réponses/heure/IP appliquée (101e refusée)\n' else 'FAIL limitation : ' || succ || ' réussies, premier refus n°' || first_fail || E'\n' end;
  perform set_config('request.headers', '{"cf-connecting-ip":"198.51.100.9"}', true);
  begin perform public.submit_rsvp(v_slug, '{"name":"Autre IP","attendance":"no"}'::jsonb); r := r || E'PASS une autre IP n''est pas bloquée\n';
  exception when others then r := r || E'FAIL une autre IP est bloquée\n'; end;

  -- Contrôle du contenu enregistré (lecture en propriétaire de la base)
  reset role;
  select data into v from public.rsvps where slug = v_slug and data->>'name' = 'Marie';
  r := r || case when v ? 'evil' or v ? '__proto__' then E'FAIL champs inconnus conservés\n' else E'PASS champs inconnus supprimés\n' end;
  r := r || case when (v->>'guests') = '20' then E'PASS nombre de personnes plafonné à 20\n' else 'FAIL guests = ' || coalesce(v->>'guests', 'null') || E'\n' end;
  r := r || case when (v->>'brunch') = '' then E'PASS brunch invalide neutralisé\n' else E'FAIL brunch invalide conservé\n' end;
  r := r || case when (v->>'rid') = 'abcdefghijkl1234' then E'PASS nom nettoyé et identifiant anti-doublon (rid) conservé\n' else E'FAIL nom ou rid\n' end;
  select data into v from public.rsvps where slug = v_slug and data->>'name' = 'Paul';
  r := r || case when (v->>'guests') = '0' then E'PASS « absent » force 0 personne\n' else E'FAIL absent : guests\n' end;
  select data into v from public.rsvps where slug = v_slug and data->>'name' = 'Zoé';
  r := r || case when (v->>'guests') = '1' and (v->>'rid') = '' then E'PASS guests invalide = 1, rid invalide vidé\n' else E'FAIL guests/rid invalides\n' end;
  select data into v from public.rsvps where slug = v_slug and data->>'name' = 'Léa';
  r := r || case when (v->>'children') = '3' and (v->>'companions') = 'Tom Martin' then E'PASS enfants et accompagnants enregistrés\n' else E'FAIL enfants/accompagnants\n' end;
  r := r || case when (v->>'email') = 'lea@example.fr' and (v->>'phone') = '+33 6 12 34 56 78' and (v->>'address') like '1 rue de la Paix%' and (v->>'custom') = 'Dancing Queen'
    then E'PASS coordonnées et question personnalisée enregistrées\n' else E'FAIL coordonnées\n' end;
  select data into v from public.rsvps where slug = v_slug and data->>'name' = 'Max';
  r := r || case when (v->>'children') = '0' and (v->>'companions') = '' and (v->>'diet') = '' and (v->>'brunch') = '' and (v->>'email') = 'max@example.com'
    then E'PASS absent : enfants, accompagnants, régime et brunch vidés, email conservé\n' else E'FAIL absent : champs non vidés\n' end;
  select data into v from public.rsvps where slug = v_slug and data->>'name' = 'Kid';
  r := r || case when (v->>'children') = '20' then E'PASS nombre d''enfants plafonné à 20\n' else E'FAIL plafond enfants\n' end;
  select data into v from public.rsvps where slug = v_slug and data->>'name' = 'Long';
  r := r || case when length(v->>'address') = 300 and length(v->>'custom') = 500 and length(v->>'companions') = 300 then E'PASS champs longs tronqués (300/500/300)\n' else E'FAIL troncature\n' end;
  r := r || case when exists (select 1 from private.rate_limits where ip_hash = '203.0.113.7') then E'FAIL IP stockée en clair\n' else E'PASS IP stockée uniquement sous forme de hash\n' end;

  -- Suppression du compte propriétaire : le faire-part et ses réponses suivent (on delete cascade)
  delete from auth.users where id = v_u;
  select count(*) into n from public.rsvps where slug = v_slug;
  r := r || case when n = 0 and not exists (select 1 from public.invitations where slug = v_slug) then E'PASS compte supprimé : faire-part et réponses supprimés\n' else E'FAIL cascade\n' end;

  raise exception E'RESULTATS\n%', r;
end $$;

-- Recette SQL des retours utilisateurs (note /10 et signalements). À exécuter dans le SQL Editor (recette d'abord).
-- Tout est annulé à la fin : le bloc se termine volontairement par l'erreur « ALL_OK (rollback) ».
do $t$
declare uid uuid; r jsonb; n int;
begin
  select id into uid from auth.users limit 1;
  -- Visiteur anonyme : signalement accepté, contexte filtré (liste blanche)
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('request.headers', '{"cf-connecting-ip":"203.0.113.9","user-agent":"Mozilla/5.0 (iPhone) Mobile"}', true);
  perform public.submit_feedback('bug', null, '  Le bouton ne marche pas  ', 'Test@Example.com',
    '{"page":"/creer/","step":"venue","vw":390,"vh":844,"errors":["TypeError: x"],"evil":"<script>"}'::jsonb);
  begin perform public.submit_feedback('rating', 8); raise exception 'FAIL note sans compte'; exception when sqlstate '42501' then null; end;
  begin perform public.submit_feedback('idea', null, ' a '); raise exception 'FAIL message vide'; exception when sqlstate '22023' then null; end;
  begin perform public.submit_feedback('idea', null, 'super idée', 'pas-un-mail'); raise exception 'FAIL e-mail'; exception when sqlstate '22023' then null; end;
  begin perform public.submit_feedback('hack', null, 'xxx'); raise exception 'FAIL type'; exception when sqlstate '22023' then null; end;
  perform public.submit_feedback('bug', null, 'robot spam', null, '{}', 'http://spam'); -- champ piège : ignoré
  begin perform public.admin_feedback(current_date - 1, current_date); raise exception 'FAIL admin anonyme';
  exception when sqlstate '42501' then null; end;
  -- Compte connecté : une note par compte, modifiable
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('request.headers', '{"cf-connecting-ip":"203.0.113.10","user-agent":"Mozilla/5.0 (Macintosh)"}', true);
  perform public.submit_feedback('rating', 7, 'Un peu long');
  perform public.submit_feedback('rating', 9, 'Finalement top');
  r := public.account_rating();
  if (r->>'score')::int <> 9 then raise exception 'FAIL modification de la note %', r; end if;
  begin perform public.submit_feedback('rating', 11); raise exception 'FAIL note > 10'; exception when sqlstate '22023' then null; end;
  perform set_config('role', 'postgres', true);
  delete from private.admins where user_id = uid; -- annulé à la fin
  perform set_config('role', 'authenticated', true);
  begin perform public.admin_feedback(current_date - 1, current_date); raise exception 'FAIL admin non admin'; exception when sqlstate '42501' then null; end;
  -- Limite : 5 envois par heure et par réseau
  begin
    for i in 1..6 loop perform public.submit_feedback('idea', null, 'idée ' || i); end loop;
    raise exception 'FAIL limite';
  exception when sqlstate '54000' then null; end;
  -- Administrateur
  perform set_config('role', 'postgres', true);
  insert into private.admins(user_id) values (uid) on conflict do nothing;
  perform set_config('role', 'authenticated', true);
  r := public.admin_feedback(current_date - 1, current_date, false);
  if jsonb_array_length(r->'items') < 2 or (r->'notes'->>'nombre')::int < 1 then raise exception 'FAIL lecture admin %', r - 'items'; end if;
  if exists (select 1 from jsonb_array_elements(r->'items') i where i->'context' ? 'evil' or i->>'excluded' is null) then raise exception 'FAIL contexte'; end if;
  perform public.admin_set_feedback_status((r->'items'->-1->>'id')::bigint, 'done');
  begin perform public.admin_set_feedback_status(1, 'hack'); raise exception 'FAIL statut'; exception when sqlstate '22023' then null; end;
  perform set_config('role', 'postgres', true);
  select count(*) into n from private.feedback where message = 'robot spam';
  if n <> 0 then raise exception 'FAIL champ piège'; end if;
  raise exception 'ALL_OK (rollback)';
end $t$;

-- Tests de la protection des données (corbeille, historique des réponses, versions, sonde health).
-- À exécuter dans le SQL Editor (recette d'abord) après chaque changement de supabase/schema.sql.
-- Tout s'exécute dans une transaction TOUJOURS annulée : aucune donnée de test ne reste.
-- Le résultat s'affiche dans un message d'erreur volontaire « RESULTATS » : une ligne PASS ou FAIL par vérification.
do $$
declare
  r text := ''; v jsonb; ok boolean; n int; v_id bigint; v_t bigint;
  v_s text := 'qa-prot-' || substr(md5(random()::text), 1, 8);
  v_u1 uuid := gen_random_uuid(); v_u2 uuid := gen_random_uuid();
begin
  perform set_config('request.headers', '{}', true);
  insert into auth.users(id, instance_id, aud, role, email) values
    (v_u1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v_s || '-1@example.com'),
    (v_u2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v_s || '-2@example.com');

  -- Sonde publique : répond sans compte, ne renvoie aucune donnée utilisateur
  set local role anon;
  v := public.health();
  r := r || case when (v->>'ok')::boolean and (select count(*) from jsonb_object_keys(v)) = 2
    then E'PASS health() répond à un visiteur, 2 champs seulement\n' else 'FAIL health : ' || v::text || E'\n' end;
  begin perform 1 from private.trash limit 1; r := r || E'FAIL visiteur : corbeille lisible\n';
  exception when insufficient_privilege then r := r || E'PASS visiteur : corbeille et historiques inaccessibles\n'; end;

  -- Compte 1 : faire-part + 2 réponses
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_u1, 'role', 'authenticated')::text, true);
  perform public.account_create_invitation(v_s, '{"partner1":"Prot","partner2":"Un","date":"2027-08-07","theme":"sauge"}'::jsonb);
  set local role anon;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform public.submit_rsvp(v_s, '{"name":"Invitée A","attendance":"yes","guests":2}'::jsonb);
  perform public.submit_rsvp(v_s, '{"name":"Invité B","attendance":"no"}'::jsonb);
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_u1, 'role', 'authenticated')::text, true);

  -- Versions : 7 modifications → 5 versions gardées, une modification identique n'en crée pas
  for i in 1..7 loop
    perform public.account_update_invitation(('{"partner1":"Prot' || i || '","partner2":"Un","date":"2027-08-07","theme":"sauge"}')::jsonb);
  end loop;
  perform public.account_update_invitation('{"partner1":"Prot7","partner2":"Un","date":"2027-08-07","theme":"sauge"}'::jsonb);
  reset role;
  select count(*) into n from private.invitation_versions where slug = v_s;
  r := r || case when n = 5 then E'PASS 5 versions précédentes gardées (pas de doublon)\n' else 'FAIL versions : ' || n || E'\n' end;
  select id into v_id from private.invitation_versions where slug = v_s and config->>'partner1' = 'Prot5';
  perform private.restore_version(v_id);
  r := r || case when (select config->>'partner1' from public.invitations where slug = v_s) = 'Prot5'
    then E'PASS restauration d''une version précédente\n' else E'FAIL restore_version\n' end;

  -- Suppression d'une réponse par les mariés → restaurable
  r := r || case when (select count(*) from private.rsvps_history where slug = v_s and op = 'INSERT') = 2
    then E'PASS chaque nouvelle réponse est historisée\n' else E'FAIL historique INSERT\n' end;
  select id into v_id from public.rsvps where slug = v_s and data->>'name' = 'Invité B';
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_u1, 'role', 'authenticated')::text, true);
  ok := public.account_delete_rsvp(v_id);
  reset role;
  select id into v_t from private.rsvps_history where rsvp_id = v_id and op = 'DELETE';
  perform private.restore_rsvp(v_t);
  r := r || case when exists (select 1 from public.rsvps where id = v_id and data->>'name' = 'Invité B')
    then E'PASS réponse supprimée restaurée (même identifiant)\n' else E'FAIL restore_rsvp\n' end;
  begin perform private.restore_rsvp(v_t); r := r || E'FAIL double restauration acceptée\n';
  exception when others then r := r || E'PASS double restauration refusée\n'; end;

  -- Suppression du faire-part → corbeille avec ses réponses
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_u1, 'role', 'authenticated')::text, true);
  ok := public.account_delete_invitation();
  reset role;
  select id into v_t from private.trash where slug = v_s;
  r := r || case when ok and v_t is not null and (select owner_email from private.trash where id = v_t) = v_s || '-1@example.com'
      and not exists (select 1 from public.invitations where slug = v_s)
    then E'PASS faire-part supprimé : en corbeille avec l''e-mail du propriétaire\n' else E'FAIL corbeille\n' end;
  v := private.restore_invitation(v_t);
  r := r || case when (v->>'reponses_restaurees')::int = 2
      and (select owner from public.invitations where slug = v_s) = v_u1
      and (select config->>'partner1' from public.invitations where slug = v_s) = 'Prot5'
    then E'PASS faire-part et ses 2 réponses restaurés, au bon compte\n' else 'FAIL restore_invitation : ' || coalesce(v::text, 'null') || E'\n' end;

  -- Suppression du compte entier → restaurable vers un autre compte
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_u1, 'role', 'authenticated')::text, true);
  ok := public.delete_account();
  reset role;
  select id into v_t from private.trash where slug = v_s and restored_at is null;
  begin perform private.restore_invitation(v_t); r := r || E'FAIL restauration vers un compte disparu\n';
  exception when others then r := r || E'PASS compte supprimé : restauration exige un e-mail de destination\n'; end;
  v := private.restore_invitation(v_t, v_s || '-2@example.com');
  r := r || case when (v->>'reponses_restaurees')::int = 2 and (select owner from public.invitations where slug = v_s) = v_u2
    then E'PASS suppression de compte : faire-part + réponses rendus à un autre compte\n' else 'FAIL restauration après suppression de compte : ' || coalesce(v::text, 'null') || E'\n' end;

  -- Suppression depuis le tableau de bord (cascade auth.users) → toujours en corbeille
  delete from auth.users where id = v_u2;
  r := r || case when (select count(*) from private.trash where slug = v_s and restored_at is null) = 1
      and (select count(*) from private.rsvps_history where slug = v_s and op = 'DELETE' and restored_at is null) = 2
    then E'PASS suppression en cascade (tableau de bord) : faire-part et réponses récupérables\n' else E'FAIL cascade\n' end;

  -- Purge : rien de récent n'est effacé
  perform private.purge_protection();
  r := r || case when exists (select 1 from private.trash where slug = v_s)
    then E'PASS purge : la corbeille récente est conservée\n' else E'FAIL purge trop agressive\n' end;

  -- Droits
  r := r || case when not has_function_privilege('anon', 'private.restore_invitation(bigint, text)', 'execute')
      and not has_function_privilege('authenticated', 'private.restore_invitation(bigint, text)', 'execute')
      and not has_function_privilege('authenticated', 'private.restore_version(bigint)', 'execute')
      and not has_function_privilege('authenticated', 'private.purge_protection()', 'execute')
    then E'PASS restaurations réservées à l''administrateur (SQL Editor)\n' else E'FAIL droits de restauration\n' end;

  raise exception E'RESULTATS\n%', r;
end $$;

-- Tests des comptes (30 vérifications), à exécuter après supabase/comptes.sql (avant ou après bascule.sql).
-- Tout s'exécute dans une transaction TOUJOURS annulée : aucune donnée de test ne reste.
-- Le résultat s'affiche dans un message d'erreur volontaire « RESULTATS » : une ligne PASS ou FAIL par vérification.
do $$
declare
  r text := ''; v jsonb; ok boolean; n int;
  v_s text := 'qa-compte-' || substr(md5(random()::text), 1, 8);
  v_u1 uuid := gen_random_uuid(); v_u2 uuid := gen_random_uuid(); v_id bigint;
begin
  perform set_config('request.headers', '{}', true);
  insert into auth.users(id, instance_id, aud, role, email) values
    (v_u1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v_s || '-1@example.com'),
    (v_u2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v_s || '-2@example.com');

  -- Visiteur non connecté
  set local role anon;
  begin perform public.account_invitation(); r := r || E'FAIL visiteur : account_invitation ouverte\n';
  exception when insufficient_privilege then r := r || E'PASS visiteur : lecture du compte refusée\n'; end;
  begin perform public.account_create_invitation(v_s, '{}'::jsonb); r := r || E'FAIL visiteur : création ouverte\n';
  exception when insufficient_privilege then r := r || E'PASS visiteur : création refusée sans compte\n'; end;
  begin perform public.account_update_invitation('{}'::jsonb); r := r || E'FAIL visiteur : modification ouverte\n';
  exception when insufficient_privilege then r := r || E'PASS visiteur : modification refusée\n'; end;
  begin perform public.account_rsvps(); r := r || E'FAIL visiteur : réponses ouvertes\n';
  exception when insufficient_privilege then r := r || E'PASS visiteur : réponses refusées\n'; end;
  begin perform public.account_delete_rsvp(1); r := r || E'FAIL visiteur : suppression de réponse ouverte\n';
  exception when insufficient_privilege then r := r || E'PASS visiteur : suppression de réponse refusée\n'; end;
  begin perform public.account_delete_invitation(); r := r || E'FAIL visiteur : suppression ouverte\n';
  exception when insufficient_privilege then r := r || E'PASS visiteur : suppression du faire-part refusée\n'; end;
  begin perform public.delete_account(); r := r || E'FAIL visiteur : suppression de compte ouverte\n';
  exception when insufficient_privilege then r := r || E'PASS visiteur : suppression de compte refusée\n'; end;

  -- Compte 1
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_u1, 'role', 'authenticated')::text, true);
  begin perform 1 from public.invitations limit 1; r := r || E'FAIL connecté : lecture directe des tables autorisée\n';
  exception when insufficient_privilege then r := r || E'PASS connecté : lecture directe des tables refusée\n'; end;
  begin perform private.account_id(); r := r || E'FAIL connecté : schéma private accessible\n';
  exception when insufficient_privilege then r := r || E'PASS connecté : schéma private inaccessible\n'; end;
  r := r || case when public.account_invitation() is null and public.account_rsvps() is null and not public.account_update_invitation('{"partner1":"X"}'::jsonb)
      and not public.account_delete_invitation() and not public.account_delete_rsvp(1)
    then E'PASS compte neuf : aucun faire-part, rien à modifier ni supprimer\n' else E'FAIL compte neuf\n' end;
  begin perform public.account_create_invitation(v_s, '[1]'::jsonb); r := r || E'FAIL config non objet acceptée\n';
  exception when others then r := r || case when sqlerrm = 'invalid config' then E'PASS config non objet refusée\n' else 'FAIL config : ' || sqlerrm || E'\n' end; end;
  begin perform public.account_create_invitation(v_s, '{"photos":["a","b","c","d"]}'::jsonb); r := r || E'FAIL 4 photos acceptées\n';
  exception when others then r := r || case when sqlerrm = 'invalid photos' then E'PASS 4 photos refusées\n' else 'FAIL photos : ' || sqlerrm || E'\n' end; end;
  begin perform public.account_create_invitation('A', '{}'::jsonb); r := r || E'FAIL identifiant invalide accepté\n';
  exception when check_violation then r := r || E'PASS identifiant invalide refusé\n'; end;
  perform public.account_create_invitation(v_s, '{"partner1":"Compte","partner2":"Un","date":"2027-08-07","theme":"sauge"}'::jsonb);
  v := public.account_invitation();
  r := r || case when v->>'slug' = v_s and v->'config'->>'partner1' = 'Compte' and (v->>'responses')::int = 0
    then E'PASS création : le faire-part appartient au compte\n' else 'FAIL création : ' || coalesce(v::text, 'null') || E'\n' end;
  begin perform public.account_create_invitation(v_s || '-2', '{}'::jsonb); r := r || E'FAIL second faire-part accepté\n';
  exception when others then r := r || case when sqlerrm = 'one per account' then E'PASS un seul faire-part par compte\n' else 'FAIL second faire-part : ' || sqlerrm || E'\n' end; end;
  r := r || case when public.account_update_invitation('{"partner1":"Compte","partner2":"Deux"}'::jsonb) and public.account_invitation()->'config'->>'partner2' = 'Deux'
    then E'PASS modification par le propriétaire\n' else E'FAIL modification\n' end;
  r := r || case when public.get_invitation(v_s)->>'partner2' = 'Deux' then E'PASS connecté : ouverture d''un faire-part (comme un invité)\n' else E'FAIL lecture connectée\n' end;
  perform public.submit_rsvp(v_s, '{"name":"Invitée","attendance":"yes","guests":2}'::jsonb);
  v := public.account_rsvps(); v_id := (v->0->>'id')::bigint;
  r := r || case when jsonb_array_length(v) = 1 and v->0->'data'->>'name' = 'Invitée' and (public.account_invitation()->>'responses')::int = 1
    then E'PASS réponses visibles par le propriétaire\n' else E'FAIL réponses\n' end;

  -- Invité non connecté
  set local role anon; perform set_config('request.jwt.claims', '', true);
  r := r || case when public.get_invitation(v_s)->>'partner1' = 'Compte' then E'PASS invité : le faire-part s''ouvre sans compte\n' else E'FAIL lecture invité\n' end;
  perform public.submit_rsvp(v_s, '{"name":"Invité 2","attendance":"no"}'::jsonb);
  r := r || E'PASS invité : réponse envoyée sans compte\n';

  -- Compte 2 : aucun accès au faire-part du compte 1
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_u2, 'role', 'authenticated')::text, true);
  r := r || case when public.account_invitation() is null and public.account_rsvps() is null and not public.account_delete_rsvp(v_id)
      and not public.account_update_invitation('{"partner1":"HACK"}'::jsonb) and not public.account_delete_invitation()
    then E'PASS autre compte : ne voit ni ne modifie rien du faire-part d''autrui\n' else E'FAIL isolation entre comptes\n' end;
  begin perform public.account_create_invitation(v_s, '{}'::jsonb); r := r || E'FAIL identifiant déjà pris accepté\n';
  exception when unique_violation then r := r || E'PASS identifiant déjà pris refusé (erreur 23505)\n';
            when others then r := r || 'FAIL identifiant pris : ' || sqlerrm || E'\n'; end;
  perform public.account_create_invitation(v_s || '-b', '{"partner1":"Autre"}'::jsonb);
  perform public.submit_rsvp(v_s || '-b', '{"name":"Chez B","attendance":"yes"}'::jsonb);
  r := r || case when jsonb_array_length(public.account_rsvps()) = 1 then E'PASS chaque compte ne voit que ses réponses\n' else E'FAIL cloisonnement des réponses\n' end;

  -- Session anonyme (si elles étaient activées) : pas un compte
  perform set_config('request.jwt.claims', json_build_object('sub', v_u1, 'role', 'authenticated', 'is_anonymous', true)::text, true);
  begin perform public.account_invitation(); r := r || E'FAIL session anonyme traitée comme un compte\n';
  exception when insufficient_privilege then r := r || E'PASS une session anonyme n''est pas un compte\n'; end;

  -- Compte 1 : suppression d'une réponse, du faire-part, puis du compte
  perform set_config('request.jwt.claims', json_build_object('sub', v_u1, 'role', 'authenticated')::text, true);
  r := r || case when jsonb_array_length(public.account_rsvps()) = 2 and public.account_delete_rsvp(v_id) and not public.account_delete_rsvp(v_id)
      and jsonb_array_length(public.account_rsvps()) = 1 then E'PASS suppression d''une réponse par le propriétaire\n' else E'FAIL suppression de réponse\n' end;
  r := r || case when public.account_delete_invitation() and public.account_invitation() is null and public.get_invitation(v_s) is null
    then E'PASS suppression du faire-part (le lien public ne répond plus)\n' else E'FAIL suppression du faire-part\n' end;
  perform public.account_create_invitation(v_s, '{"partner1":"Bis"}'::jsonb);
  r := r || E'PASS après suppression, le compte peut recréer un faire-part\n';
  perform public.submit_rsvp(v_s, '{"name":"Z","attendance":"yes"}'::jsonb);
  ok := public.delete_account();
  reset role;
  select count(*) into n from public.rsvps where slug = v_s;
  r := r || case when ok and not exists (select 1 from auth.users where id = v_u1) and not exists (select 1 from public.invitations where slug = v_s) and n = 0
      and exists (select 1 from auth.users where id = v_u2) and exists (select 1 from public.invitations where slug = v_s || '-b')
    then E'PASS suppression du compte : compte, faire-part et réponses effacés, rien d''autre\n' else E'FAIL suppression du compte\n' end;
  delete from auth.users where id = v_u2;
  r := r || case when not exists (select 1 from public.invitations where slug = v_s || '-b') then E'PASS un compte supprimé depuis le tableau de bord emporte son faire-part\n' else E'FAIL cascade\n' end;
  r := r || case when not exists (select 1 from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
      where ns.nspname = 'public' and p.proname like 'account%' and has_function_privilege('anon', p.oid, 'execute'))
      and not has_function_privilege('anon', 'public.delete_account()', 'execute')
    then E'PASS aucune fonction de compte n''est exécutable par un visiteur non connecté\n' else E'FAIL droits des fonctions de compte\n' end;

  raise exception E'RESULTATS\n%', r;
end $$;

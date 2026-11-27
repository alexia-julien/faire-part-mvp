-- Tests du brouillon gardé sur le compte (27/11/2026), à exécuter après chaque changement de supabase/schema.sql.
-- Tout s'exécute dans une transaction TOUJOURS annulée : aucune donnée de test ne reste.
-- Le résultat s'affiche dans un message d'erreur volontaire « RESULTATS » : une ligne PASS ou FAIL par vérification.
do $$
declare
  r text := ''; v jsonb; ok boolean;
  v_s text := 'qa-brouillon-' || substr(md5(random()::text), 1, 8);
  v_u1 uuid := gen_random_uuid(); v_u2 uuid := gen_random_uuid();
  v_d jsonb := '{"state":{"partner1":"Chloé","partner2":"Hugo","photos":[]},"step":3,"activeMs":60000,"at":1764200000000}';
begin
  perform set_config('request.headers', '{}', true);
  insert into auth.users(id, instance_id, aud, role, email) values
    (v_u1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v_s || '-1@example.com'),
    (v_u2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v_s || '-2@example.com');

  -- Visiteur non connecté
  set local role anon;
  begin perform public.account_draft(); r := r || E'FAIL visiteur : lecture du brouillon ouverte\n';
  exception when insufficient_privilege then r := r || E'PASS visiteur : lecture du brouillon refusée\n'; end;
  begin perform public.account_save_draft(v_d); r := r || E'FAIL visiteur : enregistrement ouvert\n';
  exception when insufficient_privilege then r := r || E'PASS visiteur : enregistrement refusé\n'; end;
  begin perform public.account_delete_draft(); r := r || E'FAIL visiteur : suppression ouverte\n';
  exception when insufficient_privilege then r := r || E'PASS visiteur : suppression refusée\n'; end;

  -- Compte 1
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_u1, 'role', 'authenticated')::text, true);
  begin perform 1 from private.drafts limit 1; r := r || E'FAIL connecté : table des brouillons lisible\n';
  exception when insufficient_privilege then r := r || E'PASS connecté : table des brouillons inaccessible en direct\n'; end;
  r := r || case when public.account_draft() is null then E'PASS compte neuf : aucun brouillon\n' else E'FAIL compte neuf\n' end;
  ok := public.account_save_draft(v_d); v := public.account_draft();
  r := r || case when ok and v->'data'->'state'->>'partner1' = 'Chloé' and (v->'data'->>'step')::int = 3 and v ? 'updated_at'
    then E'PASS enregistrement puis relecture du brouillon\n' else E'FAIL enregistrement : ' || coalesce(v::text, 'null') || E'\n' end;
  ok := public.account_save_draft(jsonb_set(v_d, '{state,partner2}', '"Léo"')); v := public.account_draft();
  r := r || case when ok and v->'data'->'state'->>'partner2' = 'Léo' then E'PASS un seul brouillon par compte, écrasé à chaque enregistrement\n' else E'FAIL écrasement\n' end;
  begin perform public.account_save_draft('{"step":1}'::jsonb); r := r || E'FAIL brouillon sans state accepté\n';
  exception when others then r := r || E'PASS brouillon mal formé refusé\n'; end;
  begin perform public.account_save_draft(jsonb_build_object('state', jsonb_build_object('x', repeat('a', 3200000)))); r := r || E'FAIL brouillon trop lourd accepté\n';
  exception when others then r := r || case when sqlerrm ~ 'too large' then E'PASS brouillon trop lourd refusé\n' else E'FAIL trop lourd : ' || sqlerrm || E'\n' end; end;

  -- Compte 2 : ne voit pas le brouillon du compte 1
  perform set_config('request.jwt.claims', json_build_object('sub', v_u2, 'role', 'authenticated')::text, true);
  r := r || case when public.account_draft() is null and not public.account_delete_draft() then E'PASS un compte ne voit ni ne supprime le brouillon d''un autre\n' else E'FAIL isolation\n' end;

  -- Compte 1 : publication → brouillon supprimé, et plus d'enregistrement possible
  perform set_config('request.jwt.claims', json_build_object('sub', v_u1, 'role', 'authenticated')::text, true);
  perform public.account_create_invitation(v_s, '{"partner1":"Chloé","partner2":"Léo"}'::jsonb);
  reset role;
  r := r || case when not exists (select 1 from private.drafts where owner = v_u1) then E'PASS publication : brouillon supprimé automatiquement\n' else E'FAIL déclencheur de publication\n' end;
  set local role authenticated;
  r := r || case when public.account_draft() is null and not public.account_save_draft(v_d) then E'PASS faire-part publié : aucun brouillon lu ni enregistré\n' else E'FAIL après publication\n' end;
  reset role;
  r := r || case when not exists (select 1 from private.drafts where owner = v_u1) then E'PASS faire-part publié : rien n''a été gardé\n' else E'FAIL brouillon gardé après publication\n' end;

  -- Compte 2 : « Recommencer à zéro », puis suppression du compte
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_u2, 'role', 'authenticated')::text, true);
  perform public.account_save_draft(v_d);
  ok := public.account_delete_draft();
  r := r || case when ok and public.account_draft() is null then E'PASS « Recommencer à zéro » supprime le brouillon du compte\n' else E'FAIL suppression du brouillon\n' end;
  perform public.account_save_draft(v_d);
  perform public.delete_account();
  reset role;
  r := r || case when not exists (select 1 from private.drafts where owner = v_u2) then E'PASS suppression du compte : brouillon effacé (RGPD)\n' else E'FAIL brouillon après suppression du compte\n' end;
  r := r || case when not has_function_privilege('anon', 'public.account_draft()', 'execute') and not has_function_privilege('anon', 'public.account_save_draft(jsonb)', 'execute')
      and not has_function_privilege('anon', 'public.account_delete_draft()', 'execute')
    then E'PASS fonctions de brouillon fermées aux visiteurs non connectés\n' else E'FAIL droits des fonctions de brouillon\n' end;

  raise exception E'RESULTATS\n%', r;
end $$;

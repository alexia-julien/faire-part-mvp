# Maison Meli — sauvegardes et restauration

Mis en place le 27/11/2026. Tout est gratuit : Supabase (offre gratuite), GitHub (dépôt privé), Cloudflare (Worker + KV).

## Les 4 filets de sécurité
| Filet | Protège contre | Où | Délai |
|---|---|---|---|
| Historique des réponses (`private.rsvps_history`) | réponse supprimée ou modifiée par erreur | base de prod | 30 jours |
| Corbeille (`private.trash`) | faire-part ou compte supprimé (utilisateur, tableau de bord, requête ratée) | base de prod | 30 jours |
| Versions (`private.invitation_versions`) | modification qui casse un faire-part | base de prod | 5 dernières, 30 jours |
| Sauvegarde nocturne chiffrée | perte ou corruption de toute la base, compte Supabase perdu | dépôt privé `alexia-julien/maison-meli-backups` (releases) | 35 jours |

La **sentinelle** (Worker `faire-part-mvp`, toutes les 5 min) vérifie le site, la base et l'âge de la dernière sauvegarde,
et envoie un e-mail à Julien en cas de problème. Son appel régulier empêche aussi la mise en pause de l'offre gratuite.

## Mise en place (une fois, par Julien)
1. GitHub : créer le dépôt **privé** `maison-meli-backups` (vide) et y copier `.github/workflows/sauvegarde.yml` de ce dossier.
2. Supabase > projet faire-part-mvp > **Connect** > « Session pooler » : copier la chaîne de connexion (avec le mot de passe de la base).
3. Dépôt privé > Settings > Secrets and variables > Actions : `SUPABASE_DB_URL` (chaîne ci-dessus) et `BACKUP_PASSPHRASE`
   (phrase longue, **aussi rangée dans le gestionnaire de mots de passe** : sans elle, aucune sauvegarde ne se déchiffre).
4. Onglet Actions > « Sauvegarde nocturne » > Run workflow : vérifier que le premier passage est vert.
5. Cloudflare > Workers > faire-part-mvp > Settings > Variables and secrets : secret `RESEND_API_KEY` (les alertes partent vers contact@maison-meli.com, réglé dans `wrangler.jsonc`).
6. GitHub > Settings > Notifications > Actions : laisser « Notify on failed workflows » activé (e-mail).

## Restaurer une réponse supprimée (SQL Editor de la prod)
```sql
select id, at, data->>'name' as nom from private.rsvps_history
where slug = '<slug>' and op = 'DELETE' and restored_at is null order by at desc;
select private.restore_rsvp(<id>);
```

## Restaurer un faire-part supprimé (et toutes ses réponses)
```sql
select id, slug, owner_email, deleted_at from private.trash where restored_at is null order by deleted_at desc;
select private.restore_invitation(<id>);                          -- au même compte
select private.restore_invitation(<id>, 'adresse@du-compte.fr');  -- compte supprimé : la personne recrée un compte d'abord
```

## Annuler une modification de faire-part
```sql
select id, saved_at, config->>'partner1', config->>'partner2' from private.invitation_versions
where slug = '<slug>' order by saved_at desc;
select private.restore_version(<id>);
```

## Restaurer toute la base depuis une sauvegarde nocturne
À faire **d'abord sur la base de recette** (staging) pour vérifier, puis en prod si besoin.
1. Télécharger l'archive voulue : dépôt privé > Releases (`maison-meli-AAAA-MM-JJ.tar.gz.gpg`).
2. Déchiffrer : `gpg -d maison-meli-AAAA-MM-JJ.tar.gz.gpg | tar -xz` → `metier.dump`, `comptes.dump`, `comptes-rendus.json`.
3. Projet cible : soit le projet existant, soit un **nouveau projet Supabase gratuit** (Francfort) si l'ancien est perdu.
   Dans ce dernier cas, rejouer d'abord `supabase/schema.sql` (fonctions, droits, cron), puis vider les tables métier.
4. Comptes : `pg_restore -d "$URL" --data-only --no-owner --disable-triggers comptes.dump`
5. Données : `pg_restore -d "$URL" --data-only --no-owner --disable-triggers -n public -n private metier.dump`
6. Contrôler les nombres avec `comptes-rendus.json` (comptes, faire-part, réponses).
7. Nouveau projet : mettre la nouvelle URL et la clé anon dans `web/lib/config.ts` et `wrangler.jsonc`, redéployer ;
   refaire les réglages Auth (Site URL, SMTP Resend, modèles d'e-mail, Google) — voir `claude/staging-passation.md`.
Temps estimé : 1 h (projet existant) à 2 h (nouveau projet).

## Routine
- Chaque nuit : la sauvegarde **se teste toute seule** (restauration dans un Postgres vierge + comparaison des nombres).
- Le 1er de chaque mois : restauration complète d'une sauvegarde sur la base de recette (étapes ci-dessus), noter le résultat
  dans la checklist (section D).

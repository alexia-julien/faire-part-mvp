# Maison Meli — règles de travail (à lire avant toute modification)

## Tests : décision de Julien (26/11/2026, rappelée le 27/11/2026)

**Pendant un dev, on ne lance JAMAIS la recette complète.** Elle est lente (plusieurs dizaines de minutes) et réservée à la mise en prod (MEP).

### Pendant un dev (cas normal : toute demande de fonctionnalité, de correction ou de modification)
INTERDIT, même « pour vérifier que rien n'est cassé » :
- `python3 tests/e2e.py`, `python3 tests/e2e_mobile.py`, `python3 tests/e2e_*.py` (toute la suite)
- `npm run test:seo`
- les recettes SQL complètes (`supabase/tests*.sql`) — sauf la partie qui teste la fonction SQL modifiée
- déclencher ou attendre la CI GitHub (workflow « Recette »)

À FAIRE, et seulement ça (test ciblé, quelques minutes) :
1. Le build passe (`cd web && npm run build:local` ou `build:staging`).
2. La fonctionnalité modifiée marche : vérification ciblée sur ce dev uniquement (petit script Playwright jetable ou navigateur), **sur mobile (390 px) et sur ordinateur**, sans erreur console.
3. Push sur `staging` → vérifier la fonctionnalité sur https://staging.maison-meli.com.
4. Ajouter les lignes de contrôle du dev dans `tests/CHECKLIST.md` (marquées `(+JJ/MM)`). On peut aussi écrire de nouveaux tests automatiques, **mais sans lancer la suite** : ils tourneront pour la première fois à la MEP.

### À la mise en prod (seulement quand Julien demande « mets en prod », « MEP », « lance en prod »…)
1. Lancer la recette complète : la CI GitHub sur `staging` (workflow « Recette », déclenchement manuel : `POST /repos/alexia-julien/faire-part-mvp/actions/workflows/tests.yml/dispatches` avec `{"ref":"staging"}`), recettes SQL sur la base staging, parcours de `tests/CHECKLIST.md` touchés par la release.
2. Tout vert → `git checkout dev && git merge staging && cd web && npm run deploy`, commit, push sur `dev`.
3. Contrôle léger en prod (section C de `tests/CHECKLIST.md`), ligne dans l'historique (section D).

Détail complet : `tests/CHECKLIST.md`. Copie dans le projet Claude : `claude/checklist-non-regression.md` (le dépôt fait foi).

## Branches
- `staging` → https://staging.maison-meli.com (base Supabase de recette). Tout dev se fait ici.
- `dev` = production (https://maison-meli.com). On n'y touche qu'à la MEP.

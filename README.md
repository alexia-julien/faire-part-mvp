# Maison Meli — faire-part de mariage digital

Un couple compose son faire-part en quelques minutes, le partage par un lien, et suit les réponses de ses invités au même endroit. Gratuit. Le compte (code par email ou Google) n'est demandé qu'au moment de publier.

Références : [PRD](https://claude.ai/artifact/4SKbVCw7TaBdXzTuxMgASG) (prime en cas de conflit), [brief design de la refonte](https://claude.ai/artifact/GEhfh15n2WDKyHyeHLBrc1) et [brief SEO/GEO](https://claude.ai/artifact/Tts6rpBbM4ZZYBpXykSUdR).

## Organisation du dépôt (depuis la refonte du 20/11/2026)

| Dossier | Contenu |
| --- | --- |
| `web/` | **Le code source** : Next.js (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui + Magic UI + composants façon Aceternity + Motion, en **export statique**. |
| racine | **Le site publié** (généré par `npm run deploy`, ne pas modifier à la main) : `index.html`, `creer/`, `mon-faire-part/`, `invitation.html`, `_next/`… Le Worker Cloudflare la sert depuis la branche `dev`, redéployée à chaque push. La liste des fichiers publiés est dans `.deploy-manifest`. |
| `supabase/` | `schema.sql` : toute la base telle qu'elle tourne en production (rejouable) ; `tests*.sql` : recettes SQL. |
| `tests/e2e.py` | Recette de bout en bout (Playwright). |
| `tests/seo.py` | Recette SEO/GEO de l'export (title, description, canonical, JSON-LD, liens, plan du site, noindex…). |

### Adresses (depuis le brief SEO/GEO du 20/11/2026)
Adresses propres avec barre finale (`trailingSlash: true`). **`/invitation.html?f=<id>` ne change jamais** (liens déjà envoyés aux invités). Les anciennes adresses redirigent : `creer.html` → `/creer/`, `admin.html` → `/mon-faire-part/`, `confidentialite.html` → `/confidentialite/`, `conditions.html` → `/conditions/` (vraies 301 via `web/public/_redirects`).

Pages publiques ajoutées (registre unique : `web/lib/site.ts`, `lib/ambiances.ts`, `lib/guides.ts`) : `/ambiances/` et une page par ambiance, `/rsvp-mariage-en-ligne/`, `/faire-part-mariage-whatsapp/`, `/exemples/camille-et-thomas/` (faire-part fictif testable), `/tarifs/`, `/a-propos/`, `/mentions-legales/`, `/guide/` (3 piliers), `/comparatif/…` (2), `/outils/` (générateur de texte, rétroplanning). Plan du site, `robots.txt`, images Open Graph (`/og/*.png`) et logo (`/logo.png`) générés au build.

**Guides et comparatifs** : les 6 premiers (3 piliers, 2 comparatifs, « Quand envoyer ») sont relus par Julien et indexés depuis le 21/11/2026. Un nouvel article naît en `index: false` (noindex, hors plan du site) ; une fois relu : `index: true` et `updated` dans `web/lib/guides.ts`, puis déploiement et `npm run indexnow`. Un article par semaine au maximum (brief, section 8).

### Pages
- `/` : page d'accueil (SEO/GEO : données structurées, FAQ, `llms.txt`, `sitemap.xml`), héros vivant (un vrai faire-part dans un téléphone, prénoms écrits en direct), carrousel des 9 ambiances, récit « Ce que vivent vos invités ».
- `/creer/` : éditeur en 8 écrans, une question par écran (prénoms → date → lieu → ambiance → photos et style → textes → réponses → aperçu), aperçu en direct (60 % de l'écran sur ordinateur, panneau plein écran sur mobile), sauvegarde automatique. À la publication : compte dans un panneau (code à 6 chiffres ou Google), puis rituel de mise sous pli (enveloppe, cachet de cire, confettis or et ivoire), lien, partage et QR code.
- `/invitation.html?f=<id>` : le faire-part invité. Ouverture d'enveloppe en 3D (cachet qui se fend, rabat, carte qui devient la page), prénoms qui s'écrivent, dorure qui suit l'inclinaison du téléphone ; une mécanique, neuf matières (kraft, coton poudré, vergé ivoire, laque noire, velours…). Réponse une question à la fois, correction possible (US-13), « Créez le vôtre » après la réponse (US-14).
- `/mon-faire-part/` : « Mon faire-part » (compteurs animés, réponses, recherche, filtres, tri, régimes pour le traiteur, CSV, emails, partage, suppressions).
- `/confidentialite/`, `/conditions/`, `/404.html`, et `/composants` (référence des composants restylés, non indexée).

### Où est quoi dans `web/`
- `lib/invitation.ts` : modèle d'un faire-part (catalogue de styles, validation stricte de la config, dates et fuseaux, agenda .ics). Port fidèle de l'ancien `js/render.js` : même format en base.
- `lib/api.ts`, `lib/auth.ts`, `lib/track.ts`, `lib/share.ts`, `lib/qr.ts` : accès Supabase (RPC), comptes, mesure du funnel sans cookie, partage, encodeur de QR code.
- `components/invitation/` : le faire-part (`invitation-body`), l'ouverture (`envelope`), la réponse (`rsvp-flow`), les ornements.
- `components/editor/`, `components/site/` : éditeur, tableau de suivi, connexion, partage, îlots de la page d'accueil.
- `components/ui/` (shadcn/ui), `components/magic/` (Magic UI), `components/aceternity/` (réécrits : le catalogue Aceternity n'est pas en code ouvert et son style par défaut est sombre).
- `styles/invitation.css` : rendu des faire-part (palettes, polices, ornements, dorure, papier, matières d'enveloppe). `app/globals.css` : tokens de la direction artistique.

## Travailler

```bash
cd web
npm ci
npm run dev            # http://localhost:3000 (production Supabase : attention aux vraies données)
npm run build:local    # export en mode local (données dans le navigateur, code de connexion 123456) pour les tests
npm run build          # export de production + CSP stricte (scripts/postbuild.mjs)
npm run deploy         # build de production puis copie de web/out à la racine du dépôt
```

### Préproduction (recette) : https://staging.maison-meli.com — depuis le 26/11/2026
Pour modifier sereinement sans toucher aux vrais utilisateurs ni fausser les chiffres :

1. Travailler sur la branche **`staging`** (jamais directement sur `dev`) : modifier `web/`, commit, push. Workers Builds construit le site (`cd web && npm ci && npm run build:staging`) et le déploie sur le Worker `maison-meli-staging` (`npx wrangler deploy --env staging`, voir `wrangler.jsonc`). Rien n'est publié à la racine du dépôt sur cette branche.
2. La recette parle à une **base Supabase séparée** (projet `maison-meli-staging`, `pcppyluqhsbhkjzmjpzk`, gratuit) : comptes, faire-part, réponses et mesures de test y restent. Une modification de la base se teste d'abord là (rejouer `supabase/schema.sql`), puis en production.
3. La recette n'est jamais indexée (`robots.txt` interdit tout + en-tête `X-Robots-Tag: noindex` sur toutes les pages).
4. Une fois validé : `git checkout dev && git merge staging`, puis `cd web && npm run deploy`, commit et push sur `dev` (= production).

**Tableau de bord `/admin/`** : uniquement sur https://staging.maison-meli.com/admin/ (retiré de la production le 26/11/2026), mais il lit **les statistiques de production** (`PROD_SUPABASE` dans `web/lib/config.ts`, session séparée `fp:session:prod`, CSP de cette page ouverte à la base de production seulement).

Mise en ligne (production) : `cd web && npm run deploy`, puis commit et push sur `dev`. Après chaque mise en ligne : `npm run indexnow` (prévient Bing et Copilot).

### Hébergement Cloudflare (Worker avec fichiers statiques)
Le Worker `faire-part-mvp` est relié au dépôt (branche `dev`) : chaque push redéploie le site. `wrangler.jsonc` (racine) sert le site déjà publié à la racine par `npm run deploy` ; `.assetsignore` exclut les sources ; `_redirects` fait les vraies 301 et `_headers` les en-têtes (X-Robots-Tag, cache).

**Aperçu WhatsApp personnalisé** : `worker/index.js` ne tourne que pour `/invitation.html` ; pour les robots d'aperçu de lien seulement, il remplace le titre et l'image par « Prénom & Prénom se marient le … » et l'image de la palette (`/og/invitation-<palette>.png`). Lecture via la fonction SQL `get_invitation_preview` (prénoms, date, palette ; ne compte pas d'ouverture). Les invités reçoivent la page statique telle quelle.

Domaine : zone `maison-meli.com` sur Cloudflare (DNS chez Cloudflare, e-mails toujours chez OVH : MX, SPF, DMARC, DKIM Resend), `www` redirigé vers la racine, HTTPS forcé, robots IA autorisés. GitHub Pages n'est plus utilisé.

### Retours utilisateurs (depuis le 26/11/2026)
- **Note de la création** (0 à 10, « Comment s’est passée la création ? ») + avis libre dont la question dépend de la note : sur l'écran de succès après publication, puis un seul rappel dans « Mon faire-part » si la carte a été ignorée. Une note par compte, modifiable (« Votre note de la création : 8/10 · Modifier »).
- **« Un souci ? »** (bug, mécontentement, idée), avec ou sans compte : en-tête de l'éditeur, en-tête de « Mon faire-part », pied de page du site. Jamais sur le faire-part invité. Contexte joint : page, étape de l'éditeur, taille d'écran, appareil, navigateur, 5 dernières erreurs JS.
- Code : `web/components/site/feedback.tsx`, `web/lib/feedback.ts` ; base : `private.feedback`, `submit_feedback`, `account_rating`, `admin_feedback`, `admin_set_feedback_status` (section « Retours utilisateurs » de `supabase/schema.sql`, recette `supabase/tests-retours.sql`).
- Chaque retour envoie un e-mail aux comptes de `private.admins` (Resend, clé `resend_api_key` du coffre ; sans clé, rien n'est envoyé). Lecture et suivi (Nouveau / En cours / Réglé) : section « Retours » de `/admin/`.

## Tests

`cd web && npm run build:local && npm run test:seo` : recette SEO/GEO de l'export (2 400+ contrôles).

```bash
cd web && npm ci && npm run build:local && cd ..
pip install playwright pillow opencv-python && python3 tests/e2e.py
```
230 vérifications au 21/11/2026 (dont pages SEO/GEO, générateur, rétroplanning, exemple) : page d'accueil (SEO, données structurées, accroche, mesure, Do Not Track), éditeur (validations, brouillon, photos, ambiances et réglages, ouverture dans l'aperçu, sections, réponses), publication (compte par code ou Google, rituel, lien, partage, QR relu par OpenCV), modification et règle « un faire-part par compte », faire-part invité (ouverture, mouvement réduit, monogramme, fuseau de l'agenda, liens filtrés), réponse pas à pas et correction, tableau de suivi (doublons, recherche, filtres, tri, CSV sans formule, emails, suppressions), accessibilité (axe-core, WCAG 2.2 AA), absence de débordement à 375/390/430/1440 px, CSP sans violation, aucune erreur JavaScript, XSS. Captures dans `tests/out/`.

La base se teste avec `supabase/tests.sql` (invités), `tests-comptes.sql` et `tests-mesure.sql` dans le SQL Editor (tout est annulé à la fin).

## Sécurité et performance
- **CSP stricte** posée dans chaque page par `scripts/postbuild.mjs` (ses empreintes dépendent de chaque page) : scripts autorisés par empreinte SHA-256, jamais `unsafe-inline` ; Google Identity Services seulement sur `/creer/` et `/mon-faire-part/`. Polices auto-hébergées (plus aucun appel à Google Fonts).
- Toute donnée venant de la base est revalidée (`sanitizeConfig`) ; liens Maps et liens libres en liste blanche ; anti-clickjacking ; champ piège anti-robots. Voir [SECURITY.md](SECURITY.md).
- Lighthouse mobile mesuré le 20/11/2026 : faire-part invité 97–98 (LCP 0,9 s), page d'accueil 91–95 (LCP 1,1 s, CLS 0) ; ouverture de l'enveloppe ≈ 57–59 images/s avec un processeur ralenti 4×. Animations chargées après l'affichage (`LazyMotion`), sections hors écran non calculées (`content-visibility`).

## Marque (audit du 21/11/2026)
Logo « le cachet » : cachet de cire encre, M doré en Cormorant Garamond. Tracés dans `web/lib/brand.ts`, composant `BrandMark` (en-tête, pied de page, éditeur, tableau, images Open Graph, pied de chaque faire-part). Icônes statiques dans `web/public/` : `favicon.ico` (16/32/48), `icon.svg`, `apple-touch-icon.png`, `icon-192/512.png`, `icon-maskable-512.png`, `site.webmanifest`, `logo.png` (JSON-LD). Contact public : contact@maison-meli.com.

## Supabase
Projet `pmtwhrqfdvbxbgrzcytl` (Francfort). `supabase/schema.sql` décrit toute la base (comptes uniquement, mesure, aperçu de lien) ; toute modification se fait dans ce fichier puis se rejoue dans le SQL Editor. Si l'URL du projet change : `web/lib/config.ts`, `SUPA` dans `web/scripts/postbuild.mjs` et `vars` dans `wrangler.jsonc`. Mesure : `select * from private.kpis_30j;` et `select * from private.funnel_semaine;`.

### Récapitulatif e-mail des réponses (US-17)
Tâche pg_cron `rsvp-digest` (7 h 30 UTC) → `private.send_rsvp_digests()` → API Resend via pg_net, au plus un e-mail par jour et par couple, désactivable dans « Mon faire-part ». **Inactive tant que la clé Resend n'est pas dans le coffre** : `select vault.create_secret('re_…', 'resend_api_key');` (SQL Editor). Expéditeur : `notifications@maison-meli.com`, réponse : `contact@maison-meli.com`.

### Fausse porte Premium et réponses manuelles
Bouton « Passer en Premium » (écran final de l'éditeur, tableau) : clic mesuré (`premium_click`), e-mails dans `private.premium_waitlist`. Le couple peut ajouter une réponse reçue par téléphone (`account_add_rsvp`, marquée « ajoutée par vous »). Suivi : colonnes `clics_premium`, `emails_premium`, `reponses_manuelles` de `private.funnel_semaine`.

## Limites connues
- Photos stockées en base (JPEG 1600 px, 3 max).
- Mentions légales : SIREN à compléter.
- Email de notification des réponses (US-17) : phase « Acquérir » de la roadmap.

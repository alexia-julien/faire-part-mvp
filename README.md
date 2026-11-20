# Maison Meli — faire-part de mariage digital

Un couple compose son faire-part en quelques minutes, le partage par un lien, et suit les réponses de ses invités au même endroit. Gratuit. Le compte (code par email ou Google) n'est demandé qu'au moment de publier.

Références : [PRD](https://claude.ai/artifact/4SKbVCw7TaBdXzTuxMgASG) (prime en cas de conflit), [brief design de la refonte](https://claude.ai/artifact/GEhfh15n2WDKyHyeHLBrc1) et [brief SEO/GEO](https://claude.ai/artifact/Tts6rpBbM4ZZYBpXykSUdR).

## Organisation du dépôt (depuis la refonte du 20/11/2026)

| Dossier | Contenu |
| --- | --- |
| `web/` | **Le code source** : Next.js (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui + Magic UI + composants façon Aceternity + Motion, en **export statique**. |
| racine | **Le site publié** (généré par `npm run deploy`, ne pas modifier à la main) : `index.html`, `creer/`, `mon-faire-part/`, `invitation.html`, `_next/`… GitHub Pages sert la branche `dev` depuis la racine. La liste des fichiers publiés est dans `.deploy-manifest`. |
| `supabase/` | Schéma, migrations et tests SQL de la base (inchangés par la refonte). |
| `tests/e2e.py` | Recette de bout en bout (Playwright). |
| `tests/seo.py` | Recette SEO/GEO de l'export (title, description, canonical, JSON-LD, liens, plan du site, noindex…). |

### Adresses (depuis le brief SEO/GEO du 20/11/2026)
Adresses propres avec barre finale (`trailingSlash: true`). **`/invitation.html?f=<id>` ne change jamais** (liens déjà envoyés aux invités). Les anciennes adresses redirigent : `creer.html` → `/creer/`, `admin.html` → `/mon-faire-part/`, `confidentialite.html` → `/confidentialite/`, `conditions.html` → `/conditions/` (vraies 301 via `web/public/_redirects` sur Cloudflare Pages ou Netlify ; pages de redirection générées par `scripts/publish.mjs` tant que le site est sur GitHub Pages).

Pages publiques ajoutées (registre unique : `web/lib/site.ts`, `lib/ambiances.ts`, `lib/guides.ts`) : `/ambiances/` et une page par ambiance, `/rsvp-mariage-en-ligne/`, `/faire-part-mariage-whatsapp/`, `/exemples/camille-et-thomas/` (faire-part fictif testable), `/tarifs/`, `/a-propos/`, `/mentions-legales/`, `/guide/` (3 piliers), `/comparatif/…` (2), `/outils/` (générateur de texte, rétroplanning). Plan du site, `robots.txt`, images Open Graph (`/og/*.png`) et logo (`/logo.png`) générés au build.

**Guides et comparatifs** : en `noindex` (hors plan du site) tant que Julien ne les a pas relus. Pour publier un article relu : `index: true` et `updated` dans `web/lib/guides.ts`, puis déploiement et `npm run indexnow`. Un article par semaine au maximum (brief, section 8).

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

Mise en ligne : `cd web && npm run deploy`, puis commit et push sur `dev`. Après chaque mise en ligne : `npm run indexnow` (prévient Bing et Copilot).

### Changer d'hébergeur (recommandé : Cloudflare Pages)
GitHub Pages ne fait ni 301 ni en-têtes HTTP. Le code est prêt pour Cloudflare Pages ou Netlify (`web/public/_redirects`, `web/public/_headers`) :
1. Créer le projet en le reliant au dépôt `alexia-julien/faire-part-mvp`, branche `dev` ; répertoire racine `web`, commande `npm ci && npm run build`, sortie `out` ; variable `NODE_VERSION=22`.
2. **Avant de toucher au DNS**, tester sur l'adresse provisoire : un vrai lien `invitation.html?f=…`, `/creer.html#p1=A&s=gatsby` (doit arriver sur `/creer/`), `/robots.txt`, `/sitemap.xml`.
3. Cloudflare : laisser **autorisés** les robots IA (Security → Bots / AI Crawl Control : ne pas bloquer la recherche ni l'entraînement), sinon le travail GEO est perdu.
4. Brancher `maison-meli.com` (et rediriger `www` vers la racine en 301), puis désactiver GitHub Pages.

## Tests

`cd web && npm run build:local && npm run test:seo` : recette SEO/GEO de l'export (2 400+ contrôles).

```bash
cd web && npm ci && npm run build:local && cd ..
pip install playwright pillow opencv-python && python3 tests/e2e.py
```
220 vérifications au 20/11/2026 (dont pages SEO/GEO, générateur, rétroplanning, exemple) : page d'accueil (SEO, données structurées, accroche, mesure, Do Not Track), éditeur (validations, brouillon, photos, ambiances et réglages, ouverture dans l'aperçu, sections, réponses), publication (compte par code ou Google, rituel, lien, partage, QR relu par OpenCV), modification et règle « un faire-part par compte », faire-part invité (ouverture, mouvement réduit, monogramme, fuseau de l'agenda, liens filtrés), réponse pas à pas et correction, tableau de suivi (doublons, recherche, filtres, tri, CSV sans formule, emails, suppressions), accessibilité (axe-core, WCAG 2.2 AA), absence de débordement à 375/390/430/1440 px, CSP sans violation, aucune erreur JavaScript, XSS. Captures dans `tests/out/`.

La base se teste avec `supabase/tests*.sql` dans le SQL Editor (tout est annulé à la fin).

## Sécurité et performance
- **CSP stricte** posée dans chaque page par `scripts/postbuild.mjs` (GitHub Pages n'envoie pas d'en-têtes) : scripts autorisés par empreinte SHA-256, jamais `unsafe-inline` ; Google Identity Services seulement sur `/creer/` et `/mon-faire-part/`. Polices auto-hébergées (plus aucun appel à Google Fonts).
- Toute donnée venant de la base est revalidée (`sanitizeConfig`) ; liens Maps et liens libres en liste blanche ; anti-clickjacking ; champ piège anti-robots. Voir [SECURITY.md](SECURITY.md).
- Lighthouse mobile mesuré le 20/11/2026 : faire-part invité 97–98 (LCP 0,9 s), page d'accueil 91–95 (LCP 1,1 s, CLS 0) ; ouverture de l'enveloppe ≈ 57–59 images/s avec un processeur ralenti 4×. Animations chargées après l'affichage (`LazyMotion`), sections hors écran non calculées (`content-visibility`).

## Supabase
Projet `pmtwhrqfdvbxbgrzcytl` (Francfort). La refonte ne change rien côté base. Si l'URL du projet change : `web/lib/config.ts` et `SUPA` dans `web/scripts/postbuild.mjs`. Mesure : `select * from private.kpis_30j;` et `select * from private.funnel_semaine;`.

## Limites connues
- Aperçu WhatsApp générique (`/img/og-invitation.png`) : les prénoms et la date demanderaient un rendu côté serveur (fonction edge ou autre hébergement). Ils sont dans le texte du message de partage.
- Photos stockées en base (JPEG 1600 px, 3 max).
- Mentions légales : reportées (décision du 20/11/2026).
- Email de notification des réponses (US-17) : phase « Acquérir » de la roadmap.

# Maison Meli — faire-part de mariage digital

Un couple compose son faire-part en quelques minutes, le partage par un lien, et suit les réponses de ses invités au même endroit. Gratuit. Le compte (code par email ou Google) n'est demandé qu'au moment de publier.

Références : [PRD](https://claude.ai/artifact/4SKbVCw7TaBdXzTuxMgASG) (prime en cas de conflit) et [brief design de la refonte](https://claude.ai/artifact/GEhfh15n2WDKyHyeHLBrc1).

## Organisation du dépôt (depuis la refonte du 20/11/2026)

| Dossier | Contenu |
| --- | --- |
| `web/` | **Le code source** : Next.js (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui + Magic UI + composants façon Aceternity + Motion, en **export statique**. |
| racine | **Le site publié** (généré par `npm run deploy`, ne pas modifier à la main) : `index.html`, `creer.html`, `admin.html`, `invitation.html`, `_next/`… GitHub Pages sert la branche `dev` depuis la racine. La liste des fichiers publiés est dans `.deploy-manifest`. |
| `supabase/` | Schéma, migrations et tests SQL de la base (inchangés par la refonte). |
| `tests/e2e.py` | Recette de bout en bout (Playwright). |

### Pages (les adresses n'ont pas changé : les liens déjà envoyés fonctionnent)
- `/` : page d'accueil (SEO/GEO : données structurées, FAQ, `llms.txt`, `sitemap.xml`), héros vivant (un vrai faire-part dans un téléphone, prénoms écrits en direct), carrousel des 9 ambiances, récit « Ce que vivent vos invités ».
- `/creer.html` : éditeur en 8 écrans, une question par écran (prénoms → date → lieu → ambiance → photos et style → textes → réponses → aperçu), aperçu en direct (60 % de l'écran sur ordinateur, panneau plein écran sur mobile), sauvegarde automatique. À la publication : compte dans un panneau (code à 6 chiffres ou Google), puis rituel de mise sous pli (enveloppe, cachet de cire, confettis or et ivoire), lien, partage et QR code.
- `/invitation.html?f=<id>` : le faire-part invité. Ouverture d'enveloppe en 3D (cachet qui se fend, rabat, carte qui devient la page), prénoms qui s'écrivent, dorure qui suit l'inclinaison du téléphone ; une mécanique, neuf matières (kraft, coton poudré, vergé ivoire, laque noire, velours…). Réponse une question à la fois, correction possible (US-13), « Créez le vôtre » après la réponse (US-14).
- `/admin.html` : « Mon faire-part » (compteurs animés, réponses, recherche, filtres, tri, régimes pour le traiteur, CSV, emails, partage, suppressions).
- `/confidentialite.html`, `/conditions.html`, `/404.html`, et `/composants` (référence des composants restylés, non indexée).

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

Mise en ligne : `cd web && npm run deploy`, puis commit et push sur `dev`.

## Tests

```bash
cd web && npm ci && npm run build:local && cd ..
pip install playwright pillow opencv-python && python3 tests/e2e.py
```
205 vérifications au 20/11/2026 : page d'accueil (SEO, données structurées, accroche, mesure, Do Not Track), éditeur (validations, brouillon, photos, ambiances et réglages, ouverture dans l'aperçu, sections, réponses), publication (compte par code ou Google, rituel, lien, partage, QR relu par OpenCV), modification et règle « un faire-part par compte », faire-part invité (ouverture, mouvement réduit, monogramme, fuseau de l'agenda, liens filtrés), réponse pas à pas et correction, tableau de suivi (doublons, recherche, filtres, tri, CSV sans formule, emails, suppressions), accessibilité (axe-core, WCAG 2.2 AA), absence de débordement à 375/390/430/1440 px, CSP sans violation, aucune erreur JavaScript, XSS. Captures dans `tests/out/`.

La base se teste avec `supabase/tests*.sql` dans le SQL Editor (tout est annulé à la fin).

## Sécurité et performance
- **CSP stricte** posée dans chaque page par `scripts/postbuild.mjs` (GitHub Pages n'envoie pas d'en-têtes) : scripts autorisés par empreinte SHA-256, jamais `unsafe-inline` ; Google Identity Services seulement sur `creer.html` et `admin.html`. Polices auto-hébergées (plus aucun appel à Google Fonts).
- Toute donnée venant de la base est revalidée (`sanitizeConfig`) ; liens Maps et liens libres en liste blanche ; anti-clickjacking ; champ piège anti-robots. Voir [SECURITY.md](SECURITY.md).
- Lighthouse mobile mesuré le 20/11/2026 : faire-part invité 97–98 (LCP 0,9 s), page d'accueil 91–95 (LCP 1,1 s, CLS 0) ; ouverture de l'enveloppe ≈ 57–59 images/s avec un processeur ralenti 4×. Animations chargées après l'affichage (`LazyMotion`), sections hors écran non calculées (`content-visibility`).

## Supabase
Projet `pmtwhrqfdvbxbgrzcytl` (Francfort). La refonte ne change rien côté base. Si l'URL du projet change : `web/lib/config.ts` et `SUPA` dans `web/scripts/postbuild.mjs`. Mesure : `select * from private.kpis_30j;` et `select * from private.funnel_semaine;`.

## Limites connues
- Aperçu WhatsApp générique (`/img/og-invitation.png`) : les prénoms et la date demanderaient un rendu côté serveur (fonction edge ou autre hébergement). Ils sont dans le texte du message de partage.
- Photos stockées en base (JPEG 1600 px, 3 max).
- Mentions légales : reportées (décision du 20/11/2026).
- Email de notification des réponses (US-17) : phase « Acquérir » de la roadmap.

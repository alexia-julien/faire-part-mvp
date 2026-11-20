# Sécurité

## Modèle de menace
Le dépôt est public et la clé Supabase `anon` est visible par tous : c'est voulu. La sécurité ne repose sur aucun secret côté navigateur, mais sur :
1. des **tables verrouillées** (RLS sans policy, aucun droit direct pour `anon` ni `authenticated`) ;
2. des **fonctions SQL** seules appelables depuis le navigateur, qui valident tout ce qui entre (`supabase/schema.sql`) :
   - invités (`anon`) : `get_invitation`, `submit_rsvp`, `track` ; Worker Cloudflare : `get_invitation_preview` ;
   - compte connecté (`authenticated`) : `account_*` et `delete_account`, qui agissent sur LE faire-part du compte, déduit du jeton vérifié par Supabase ;
3. des **comptes Supabase Auth** sans mot de passe (code à usage unique par email, ou Google).

**Ne jamais mettre la clé `service_role` dans ce dépôt** (elle contourne toute la protection). Si elle fuite : la régénérer dans Supabase > Project Settings > API.

## Contrôles en place
| Risque | Protection |
|---|---|
| XSS (champs du faire-part, réponses des invités) | Tout texte est échappé ; le contenu venant de la base passe par une liste blanche (`sanitizeConfig`) ; photos limitées aux data-URI JPEG/PNG/WebP ; CSP stricte sans script inline non hashé |
| Pollution de prototype (JSON forgé avec `__proto__`) | Reconstruction champ par champ des données externes, côté navigateur et côté base |
| Liens libres (cagnotte, hébergements) | https uniquement, sans identifiants dans l'URL, `rel="noopener nofollow"`, domaine affiché à côté du bouton |
| Phishing via le bouton « Ouvrir dans Maps » | Seuls Google Maps, Apple Plans, OpenStreetMap et Waze sont acceptés (domaines exacts) |
| Accès au faire-part ou aux réponses d'un autre couple | Impossible : aucune fonction ne prend d'identifiant de gestion, tout passe par le compte connecté (testé dans `supabase/tests-comptes.sql`) |
| Devinette des liens publics | Suffixe aléatoire de 8 caractères (~10^12) |
| Données invalides ou hostiles en base | Validation serveur : forme, taille, 3 photos max, réponses reconstruites et tronquées champ par champ |
| Spam / remplissage de la base | Limitation par IP (hashée) : 10 créations/h, 30 modifications/h, 100 réponses/h/faire-part ; 1 000 réponses max par faire-part ; un faire-part par compte (index unique) |
| Injection de formule dans le CSV (Excel) | Les cellules commençant par `= + - @` sont neutralisées |
| Clickjacking | `X-Frame-Options: DENY` (en-têtes Cloudflare, `_headers`) et, en plus, les pages sensibles se vident si elles sont dans une iframe |
| Fuite d'infos par les messages d'erreur | Messages génériques côté utilisateur (`userError`) |
| Exfiltration de données | CSP `connect-src` limité au site et à l'URL exacte du projet Supabase |

## Comptes
- La CSP est posée par `web/scripts/postbuild.mjs` dans chaque page exportée. Les scripts en ligne d'amorçage de Next.js sont autorisés **par empreinte SHA-256** (jamais `unsafe-inline` ni `unsafe-eval`) ; le script de Google n'est autorisé que sur `/creer/` et `/mon-faire-part/` (d'où les liens `<a>` classiques entre pages : une navigation côté client garderait la CSP de la page de départ). Les styles en ligne restent autorisés (`style-src 'unsafe-inline'`) : le moteur d'animation et le bouton officiel de Google en ont besoin. Polices servies par le site (`font-src 'self'`). Les confettis de publication tournent sans « worker » pour ne pas ouvrir `blob:` aux scripts.
- La session (jeton d'accès et jeton de renouvellement) est gardée dans le stockage du navigateur, comme le fait la bibliothèque officielle. Un script malveillant exécuté sur la page pourrait la lire : la protection est la CSP stricte et l'échappement systématique des contenus.
- Les limites d'envoi de codes et de tentatives sont celles de Supabase Auth ; activer le CAPTCHA de Supabase si des inscriptions automatisées apparaissent.
- Le retour de connexion par redirection dépose les jetons dans le fragment de l'adresse : `web/lib/auth.ts` les range puis nettoie l'adresse immédiatement. **Les redirections autorisées doivent rester limitées à `https://maison-meli.com/**` dans Supabase** (aucune adresse de test ou d'ancien hébergeur).

## Page d'accueil et parcours grand public
- La page d'accueil n'appelle la base que pour la mesure (`track`) ; les pages de texte n'exécutent que l'amorçage de Next.js.
- Prénoms et ambiance passent de l'accueil à l'éditeur dans le fragment d'URL : rien n'est envoyé au serveur, les valeurs sont tronquées (40 caractères), l'ambiance doit exister dans le catalogue, et tout est échappé à l'affichage (testé avec une charge XSS).
- La règle « un faire-part par compte » est vérifiée par la base (index unique), pas seulement par le navigateur.

## Aperçu de lien (Worker Cloudflare)
- `worker/index.js` ne tourne que pour `/invitation.html` et `/invitation`, et ne modifie la page que pour les robots d'aperçu de lien : titre « Prénom & Prénom se marient le … » et image de la palette. Jamais le lieu ni l'adresse.
- `get_invitation_preview` ne renvoie que prénoms (40 caractères), date (format strict) et palette ; elle ne journalise rien. L'image est choisie dans une liste fermée de palettes.

## Mesure du funnel
- `public.track` est appelable sans compte : liste blanche de 6 événements, métadonnées filtrées (source et canal dans des listes fermées), identifiant de faire-part retenu seulement s'il existe, 600 appels / heure / IP, aucune erreur renvoyée. Le pire abus possible est de fausser les statistiques, sans toucher aux données des couples.
- Le journal `private.events` et les vues `private.funnel_semaine` et `private.kpis_30j` ne sont pas exposés par l'API (schéma `private`, droits retirés à `anon` et `authenticated`, testé).
- Aucune IP en clair (empreinte SHA-256), aucun cookie, aucune adresse de page d'origine ; purge des entrées de plus de 13 mois.
- La durée de réponse (`elapsed`) envoyée par le navigateur sert seulement au journal : elle n'est pas stockée dans la réponse vue par les mariés (testé).

## Alertes du « Security Advisor » de Supabase : lesquelles sont normales
- **« RLS Enabled No Policy »** : voulu. Aucune policy = aucun accès direct ; tout passe par les fonctions.
- **« Public Can Execute SECURITY DEFINER Function »** : voulu pour les fonctions listées plus haut, qui sont l'API de l'app et valident leurs entrées.

## Tests de la base
`supabase/tests.sql` (invités, 31 vérifications), `supabase/tests-comptes.sql` (comptes) et `supabase/tests-mesure.sql` (mesure) se collent dans le SQL Editor. Ils vérifient les accès directs interdits, la validation des entrées, l'isolement entre comptes et la limitation de débit, puis annulent tout : aucune donnée de test ne reste. À rejouer après chaque changement de `schema.sql`.

## Limites connues
- **Limitation par IP** : repose sur l'en-tête `cf-connecting-ip` / `x-real-ip`. Si Supabase ne le fournit pas, la limitation est désactivée (jamais de blocage à tort). Une attaque distribuée (nombreuses IP) reste possible.
- **Hébergement de contenu tiers** : n'importe qui avec un compte peut publier un faire-part avec du texte libre. Prévoir un moyen de signalement et de suppression avant d'ouvrir largement.
- **Données personnelles** (noms, régimes alimentaires = données potentiellement sensibles) : politique de confidentialité publiée (`/confidentialite/`) ; journal de mesure purgé à 13 mois ; les faire-part et réponses restent jusqu'à leur suppression par le couple.

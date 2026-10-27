# Sécurité

## Modèle de menace
Le repo est public et la clé Supabase `anon` est visible par tous : c'est voulu. La sécurité ne repose sur aucun secret côté navigateur, mais sur :
1. des **tables verrouillées** (RLS sans policy, aucun droit direct pour `anon`) ;
2. **10 fonctions SQL** seules appelables depuis le navigateur, qui valident tout ce qui entre ;
3. une **clé privée par faire-part** (24 caractères aléatoires, ~120 bits), stockée hashée (bcrypt), qui seule donne accès aux réponses et à la modification ;
4. pour les testeurs, un **jeton d'espace** (32 caractères, ~160 bits) qui équivaut aux clés de tous ses faire-part : stocké hashé (SHA-256), il chiffre les clés rattachées (`pgp_sym_encrypt`). Une copie de la base seule ne permet pas de les relire.

**Ne jamais mettre la clé `service_role` dans ce repo** (elle contourne toute la protection). Si elle fuite : la régénérer dans Supabase > Project Settings > API.

## Contrôles en place
| Risque | Protection |
|---|---|
| XSS (champs du faire-part, réponses des invités) | Tout texte est échappé ; le contenu venant de la base passe par une liste blanche (`FP.sanitizeConfig`) ; photos limitées aux data-URI JPEG/PNG/WebP ; CSP sans script ni style inline |
| Pollution de prototype (JSON forgé avec `__proto__`) | Plus d'`Object.assign` sur des données externes : reconstruction champ par champ |
| Liens libres (cagnotte, hébergements) | https uniquement, sans identifiants dans l'URL, `rel="noopener nofollow"`, domaine affiché à côté du bouton |
| Coordonnées des invités (email, téléphone) | Validées côté navigateur ET serveur (formats stricts) ; visibles uniquement avec la clé privée |
| Phishing via le bouton « Ouvrir dans Maps » | Seuls Google Maps, Apple Plans, OpenStreetMap et Waze sont acceptés (domaines exacts) |
| Accès aux réponses / modification / suppression par un tiers | Clé privée requise, dans le fragment d'URL (`#k=`) donc jamais envoyée au serveur ni dans le `Referer` |
| Devinette des liens publics | Suffixe aléatoire de 8 caractères (~10^12) |
| Données invalides ou hostiles en base | Validation serveur : forme, taille, 3 photos max, réponses reconstruites champ par champ |
| Spam / remplissage de la base | Limitation par IP (hashée) : 10 créations/h, 30 modifications/h, 100 réponses/h/faire-part ; 1000 réponses max par faire-part |
| Injection de formule dans le CSV (Excel) | Les cellules commençant par `= + - @` sont neutralisées |
| Clickjacking | Les pages sensibles se vident si elles sont dans une iframe |
| Fuite d'infos par les messages d'erreur | Messages génériques côté utilisateur |
| Fuite d'un lien testeur | Jeton dans le fragment (`#t=`), jamais dans l'URL envoyée au serveur ; désactivable en SQL (`disabled = true`) ; « Quitter l'espace sur cet appareil » pour les ordinateurs partagés ; création de testeurs impossible depuis le navigateur |
| Exfiltration de données | CSP `connect-src` limité à l'URL exacte du projet Supabase |

## Alertes du « Security Advisor » de Supabase : lesquelles sont normales
- **« RLS Enabled No Policy »** (info, 3 tables) : voulu. Aucune policy = aucun accès direct ; tout passe par les fonctions.
- **« Public Can Execute SECURITY DEFINER Function »** (10 fonctions) : voulu. Ces fonctions sont l'API publique de l'app ; chacune valide ses entrées et exige la clé privée quand c'est nécessaire (testé dans `supabase/tests.sql`).
- **« Function Search Path Mutable »** sur `private.check_config` : corrigé dans `schema.sql` (rejouer le fichier pour l'appliquer).

## Tests de la base
`supabase/tests.sql` (62 vérifications) se colle dans le SQL Editor. Il agit comme un visiteur anonyme (rôle `anon`), vérifie les accès directs interdits, la validation des entrées, la protection par clé privée et la limitation de débit, puis annule tout : aucune donnée de test ne reste. À rejouer après chaque changement de `schema.sql`.

## Limites connues
- **Pas d'en-têtes HTTP sur GitHub Pages** : pas de `X-Frame-Options` ni de `frame-ancestors` (la protection anti-iframe est faite en JavaScript). Un hébergeur comme Netlify ou Cloudflare Pages permettrait de les ajouter.
- **Polices Google** : chargées depuis les serveurs de Google, donc l'IP des visiteurs leur est transmise. À héberger soi-même avant une vraie mise en production (RGPD).
- **Limitation par IP** : repose sur l'en-tête `cf-connecting-ip` / `x-real-ip`. Si Supabase ne le fournit pas, la limitation est désactivée (jamais de blocage à tort). Une attaque distribuée (nombreuses IP) reste possible.
- **Hébergement de contenu tiers** : n'importe qui peut publier un faire-part avec du texte libre. Prévoir un moyen de signalement et de suppression avant d'ouvrir largement.
- **Lien privé perdu = accès perdu** (pas de compte, pas d'email), sauf pour un faire-part rattaché à un espace testeur. Un **lien testeur perdu** ne se retrouve pas non plus (il n'est stocké que hashé) : on en crée un nouveau. Il est aussi mémorisé dans le `localStorage` du navigateur du créateur : à éviter sur un ordinateur partagé.
- **Données personnelles** (noms, régimes alimentaires = données potentiellement sensibles) : prévoir une politique de confidentialité et une durée de conservation avant d'ouvrir au public.
- La limitation par IP a été testée sur la vraie base avec une IP simulée ; le journal Supabase confirme que l'en-tête `cf-connecting-ip` accompagne bien les requêtes réelles. À surveiller malgré tout lors des premiers vrais tests à plusieurs.

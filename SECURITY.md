# Sécurité

## Modèle de menace
Le repo est public et la clé Supabase `anon` est visible par tous : c'est voulu. La sécurité ne repose sur aucun secret côté navigateur, mais sur :
1. des **tables verrouillées** (RLS sans policy, aucun droit direct pour `anon`) ;
2. **6 fonctions SQL** seules appelables depuis le navigateur, qui valident tout ce qui entre ;
3. une **clé privée par faire-part** (24 caractères aléatoires, ~120 bits), stockée hashée (bcrypt), qui seule donne accès aux réponses et à la modification.

**Ne jamais mettre la clé `service_role` dans ce repo** (elle contourne toute la protection). Si elle fuite : la régénérer dans Supabase > Project Settings > API.

## Contrôles en place
| Risque | Protection |
|---|---|
| XSS (champs du faire-part, réponses des invités) | Tout texte est échappé ; le contenu venant de la base passe par une liste blanche (`FP.sanitizeConfig`) ; photos limitées aux data-URI JPEG/PNG/WebP ; CSP sans script ni style inline |
| Pollution de prototype (JSON forgé avec `__proto__`) | Plus d'`Object.assign` sur des données externes : reconstruction champ par champ |
| Phishing via le bouton « Ouvrir dans Maps » | Seuls Google Maps, Apple Plans, OpenStreetMap et Waze sont acceptés (domaines exacts) |
| Accès aux réponses / modification / suppression par un tiers | Clé privée requise, dans le fragment d'URL (`#k=`) donc jamais envoyée au serveur ni dans le `Referer` |
| Devinette des liens publics | Suffixe aléatoire de 8 caractères (~10^12) |
| Données invalides ou hostiles en base | Validation serveur : forme, taille, 3 photos max, réponses reconstruites champ par champ |
| Spam / remplissage de la base | Limitation par IP (hashée) : 10 créations/h, 30 modifications/h, 100 réponses/h/faire-part ; 1000 réponses max par faire-part |
| Injection de formule dans le CSV (Excel) | Les cellules commençant par `= + - @` sont neutralisées |
| Clickjacking | Les pages sensibles se vident si elles sont dans une iframe |
| Fuite d'infos par les messages d'erreur | Messages génériques côté utilisateur |
| Exfiltration de données | CSP `connect-src` limité à l'URL exacte du projet Supabase |

## Limites connues
- **Pas d'en-têtes HTTP sur GitHub Pages** : pas de `X-Frame-Options` ni de `frame-ancestors` (la protection anti-iframe est faite en JavaScript). Un hébergeur comme Netlify ou Cloudflare Pages permettrait de les ajouter.
- **Polices Google** : chargées depuis les serveurs de Google, donc l'IP des visiteurs leur est transmise. À héberger soi-même avant une vraie mise en production (RGPD).
- **Limitation par IP** : repose sur l'en-tête `cf-connecting-ip` / `x-real-ip`. Si Supabase ne le fournit pas, la limitation est désactivée (jamais de blocage à tort). Une attaque distribuée (nombreuses IP) reste possible.
- **Hébergement de contenu tiers** : n'importe qui peut publier un faire-part avec du texte libre. Prévoir un moyen de signalement et de suppression avant d'ouvrir largement.
- **Lien privé perdu = accès perdu** (pas de compte, pas d'email). Il est aussi mémorisé dans le `localStorage` du navigateur du créateur : à éviter sur un ordinateur partagé.
- **Données personnelles** (noms, régimes alimentaires = données potentiellement sensibles) : prévoir une politique de confidentialité et une durée de conservation avant d'ouvrir au public.
- La fonction de limitation et les fonctions SQL n'ont pas été exécutées sur un Postgres en test automatisé (voir README) : valider en réel après chaque changement du schéma.

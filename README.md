# Faire-part digital — MVP

Générateur de faire-part digital avec RSVP intégré. Objectif : un couple publie un faire-part de qualité en moins de 3 minutes, **sans créer de compte**.

Projet indépendant du site du mariage d'Alexia & Julien (aucun lien avec ce repo ni ses branches `main` / `test`).

## Parcours
1. `index.html` : onboarding en 4 étapes (mariés + date, lieu, photos + textes + ambiance, questions RSVP) avec aperçu en direct.
2. À la publication : un **lien public** pour les invités (`invitation.html?f=<id>`) et un **lien privé** (`admin.html?f=<id>#k=<clé>`) pour suivre les réponses, exporter en CSV et modifier le faire-part.
3. Les invités répondent via le formulaire RSVP intégré (nom, présence, nombre de personnes, brunch, régime, message : selon ce que le couple a activé).

La clé privée est dans le fragment d'URL (`#k=…`), donc jamais envoyée au serveur. Elle est stockée hashée (bcrypt) côté base.

## Lancer en local
Site 100 % statique :

```bash
python3 -m http.server 8080
# puis ouvrir http://localhost:8080
```

Sans configuration, l'app tourne en **mode local** (données dans le `localStorage` du navigateur) : pratique pour développer, mais un faire-part n'est visible que depuis le navigateur qui l'a créé.

## Brancher Supabase (pour de vrais tests avec des amis)
1. Créer un projet Supabase (plan gratuit).
2. Exécuter `supabase/schema.sql` dans le SQL Editor.
3. Renseigner `supabaseUrl` et `supabaseKey` (clé `anon`) dans `js/config.js`.
4. Déployer le dossier tel quel sur GitHub Pages (ou n'importe quel hébergeur statique).

`schema.sql` est idempotent et transactionnel : pour appliquer une mise à jour du schéma, rejouer le fichier en entier dans le SQL Editor.

Si l'URL du projet Supabase change, mettre à jour **aussi** la CSP (`connect-src`) dans `index.html`, `invitation.html` et `admin.html`.

Sécurité : voir [SECURITY.md](SECURITY.md) (modèle de menace, protections, limites connues).

## Limites connues du MVP
- Photos stockées en base (JPEG 1600 px, ~150–300 Ko chacune, 3 max). À migrer vers Supabase Storage si le volume grandit.
- Pas d'aperçu riche (Open Graph) quand le lien est partagé sur WhatsApp : nécessite un rendu côté serveur.
- Pas d'envoi d'email : le couple doit conserver son lien privé.
- Protection anti-spam minimale (champ piège + plafond de 1000 réponses par faire-part).
- RGPD : avant d'ouvrir à des inconnus, ajouter une mention de confidentialité et une durée de suppression des réponses.
- `meta.durationSec` est enregistré dans la config de chaque faire-part : c'est le temps de création réel, utile pour mesurer l'objectif des 3 minutes.

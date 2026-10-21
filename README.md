# Faire-part digital — MVP

Générateur de faire-part digital avec RSVP intégré. Objectif : un couple publie un faire-part de qualité en moins de 3 minutes, **sans créer de compte**.

Projet indépendant du site du mariage d'Alexia & Julien (aucun lien avec ce repo ni ses branches `main` / `test`).

## Parcours
1. `index.html` : onboarding en 5 étapes avec aperçu en direct. **Seules les étapes 1 et 2 sont obligatoires** (prénoms, date, lieu) : tout le reste a des réglages par défaut, on peut publier en cliquant « Continuer ».
   - **Les mariés** (heure de la cérémonie facultative ; année plafonnée à 2050), **Le lieu**
   - L'aperçu se bascule entre **Mobile** et **Ordinateur** (rendu réel en 1280 px, réduit pour tenir à l'écran).
   - **Photos et style** : 5 ambiances prêtes en un clic (Champêtre, Romantique, Élégance, Bohème, Minimaliste), puis, repliées sous « Personnaliser le style » : introduction (enveloppe à ouvrir, monogramme, aucune), 8 palettes, 4 polices, forme de la photo (arrondie, arche, cercle), compte à rebours.
   - **Textes et sections** : message d'accueil + sections facultatives pré-remplies (Notre histoire, Programme en frise, Dress code, Hébergement, Infos pratiques, Liste de mariage avec lien).
   - **Réponses** : questions à poser (personnes, enfants, noms des accompagnants, régime, brunch, email, téléphone, adresse, message, question personnalisée) et date limite de réponse.
2. À la publication : un **lien public** pour les invités (`invitation.html?f=<id>`) et un **lien privé** (`admin.html?f=<id>#k=<clé>`) pour suivre les réponses, exporter en CSV et modifier le faire-part.
3. Les invités ouvrent l'enveloppe (ou voient le monogramme), puis répondent via le formulaire intégré, limité aux questions activées par le couple.
4. Le back-office (`admin.html`) ouvre sur **« Mes faire-part »** : la liste des faire-part créés ou ouverts depuis ce navigateur (prénoms, date, nombre de réponses), un faire-part s'ajoute aussi en collant son lien privé. Chaque carte mène à la vue des réponses : totaux (adultes, enfants, absents, brunch), liste des régimes pour le traiteur, recherche, filtres présents/absents, tri, colonnes selon les questions posées, copie des emails (champ Cci), export CSV, suppression, affichage en cartes sur mobile.

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

La liste « Mes faire-part » n'a besoin d'aucune fonction supplémentaire : le nombre de réponses est calculé dans le navigateur à partir de `get_invitation` et `list_rsvps` (clé vérifiée côté serveur). `summarize_invitations` reste dans `schema.sql` mais n'est plus appelée par le site ; elle pourra servir plus tard si le nombre de faire-part par utilisateur devient grand.

Si l'URL du projet Supabase change, mettre à jour **aussi** la CSP (`connect-src`) dans `index.html`, `invitation.html` et `admin.html`.

Sécurité : voir [SECURITY.md](SECURITY.md) (modèle de menace, protections, limites connues).

## Tests
`python3 tests/e2e.py` (prérequis : `pip install playwright pillow`) rejoue 182 vérifications dans un navigateur headless, en mode local : parcours complet, validations, brouillon, photos, ambiances et réglages de style, intros (enveloppe, monogramme, mouvement réduit), sections, RSVP enrichi, suivi (filtres, tri, recherche, régimes, copie des emails, CSV, cartes mobiles), modification, anciens faire-part, agenda (fuseaux horaires), sécurité (XSS, config forgée, clickjacking), mobile et contrastes des 8 palettes. Captures dans `tests/out/`.

`supabase/tests.sql` teste la base elle-même (47 vérifications, tout est annulé à la fin) : à coller dans le SQL Editor après chaque changement du schéma.

## Comportements à connaître
- **Brouillon** : la saisie est sauvegardée dans le navigateur ; un rechargement ne fait rien perdre.
- **Fuseau horaire** : la date/heure affichée est celle du lieu ; le compte à rebours et l'agenda sont justes pour un invité à l'étranger.
- **Réponse modifiée** : si un invité répond deux fois (même navigateur ou même nom), seule la dernière compte ; l'ancienne apparaît barrée dans le suivi.
- **Suppression** d'une réponse (test, spam) depuis la page de suivi, en deux clics.

## Limites connues du MVP
- Photos stockées en base (JPEG 1600 px, ~150–300 Ko chacune, 3 max). À migrer vers Supabase Storage si le volume grandit.
- Pas d'aperçu riche (Open Graph) quand le lien est partagé sur WhatsApp : nécessite un rendu côté serveur.
- Pas d'envoi d'email : le couple doit conserver son lien privé (bouton « M'envoyer ce lien par email » à la publication).
- Polices Google chargées depuis les serveurs de Google (seule la police choisie sur la page publique).
- Protection anti-spam minimale (champ piège + plafond de 1000 réponses par faire-part).
- RGPD : le formulaire peut collecter email, téléphone et adresse. Une mention courte est affichée, mais avant d'ouvrir à des inconnus il faut une vraie politique de confidentialité et une durée de conservation (suppression automatique après le mariage).
- `meta.durationSec` est enregistré dans la config de chaque faire-part : c'est le temps de création réel, utile pour mesurer l'objectif des 3 minutes.

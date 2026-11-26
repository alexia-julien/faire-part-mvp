# Maison Meli — process de livraison & checklist de non-régression

Créée le 26/11/2026. **Document vivant : il s'enrichit à chaque release** (voir « Règles d'incrémentation »).
Ce fichier est la référence ; une copie est tenue à jour dans le projet Claude (`claude/checklist-non-regression.md`).

**Le mobile est le canal principal** (création depuis le téléphone, faire-part ouvert depuis WhatsApp). Il a sa propre section (M) et chaque parcours B se fait d'abord sur mobile.

## Le process (décision de Julien, 26/11/2026)

| Moment | Ce qu'on teste | Où |
|---|---|---|
| **Chaque nouveau dev** | Test ciblé de la fonctionnalité, **sur mobile (390 px) et sur ordinateur**, + contrôle de base : le build passe, l'accueil s'affiche, 0 erreur console | staging.maison-meli.com |
| **Mise en prod (release)** | Tests automatiques (A, dont mobile) verts sur le dernier push `staging` + parcours B touchés par la release. Feu vert seulement si tout est vert. | CI GitHub + staging |
| **Après la mise en prod** | Contrôle léger en lecture seule (section C) | maison-meli.com |

Règles :
- **La batterie complète tourne sur staging, avant** `git merge staging` dans `dev`. Un échec → correction sur `staging` → on relance **toute** la batterie, pas seulement le test en échec.
- **Releases courtes : 2 à 4 devs maximum**, pour retrouver vite le dev fautif si un test casse.
- **Changement de base** : le SQL passe toujours d'abord par le projet Supabase staging, testé **dès le dev** (pas seulement à la release), puis en prod via `supabase/schema.sql`.
- **Hotfix urgent** : test ciblé + section C, puis la batterie complète à la release suivante.
- Avant toute release, lister les devs inclus (section D).

## Règles d'incrémentation
1. Chaque dev livré ajoute ses lignes de contrôle dans la bonne section (M ou B), marquées `(+JJ/MM)`. **Un dev qui touche une page ajoute toujours au moins une ligne mobile.**
2. Chaque bug trouvé en prod ou en recette ajoute une ligne qui l'aurait détecté, marquée `(bug JJ/MM)`.
3. Chaque fois que c'est possible, la ligne manuelle devient un test automatique (`tests/e2e.py`, `tests/seo.py`, SQL) et passe en section A.
4. Une ligne devenue obsolète (fonctionnalité retirée) est supprimée, avec une mention dans la section D.

---

## A. Tests automatiques (local, `cd web && npm run build:local`)
**Lancés automatiquement par GitHub à chaque push sur `staging`** (onglet « Actions » du dépôt, workflow « Recette », captures en artefacts). Une release ne part que si le dernier passage est vert.
- [ ] `python3 tests/e2e.py` : 100 % (262/262 au 26/11)
- [ ] `python3 tests/e2e_mobile.py --strict` : 100 % (261/261 au 26/11) — **Safari iOS (WebKit) en iPhone SE 320 px et iPhone 15**, **Chrome Android en Pixel 7 et Galaxy S24 360 px**, écran tactile
  Couvre, au doigt, sur chaque appareil : accueil → éditeur complet → photo de téléphone → connexion par code → publication → partage / QR ; faire-part invité → agenda → réponse ; Mon faire-part ; zones tactiles ≥ 44 px et non recouvertes ; champs ≥ 16 px (zoom Safari) ; safe area iPhone ; claviers (e-mail, code `one-time-code`) ; geste retour (aperçu) ; double toucher (Envoyer) ; onglet rouvert (session, brouillon) ; paysage ; mode sombre ; texte agrandi 125 % ; réseau lent ; navigateur intégré WhatsApp.
  Ne couvre pas (reste en M-réel) : vrai clavier virtuel, feuille de partage native, Photos / agenda / Maps du téléphone, aperçu WhatsApp, connexion Google réelle.
  En local, WebKit ne s'installe que si le poste autorise le téléchargement de Playwright (`python3 -m playwright install webkit`) ; sinon les iPhone sont ignorés et la CI fait foi.
  Information affichée (non bloquante) : temps d'affichage du faire-part en 4G lente, aide pour Google dans WhatsApp.
- [ ] `npm run test:seo` : 100 % (3 127/3 127 au 26/11)
- [ ] axe-core (WCAG 2.2 AA, inclus dans e2e) : OK
- [ ] Aucun débordement horizontal à 320 / 375 / 390 / 430 px (inclus dans e2e)
- [ ] Recette SQL sur la base **staging** (SQL Editor, tout est annulé à la fin) : `supabase/tests.sql`, `tests-comptes.sql`, `tests-mesure.sql`, `tests-retours.sql` (+ tout nouveau fichier)
- [ ] `npm run build:staging` et `npm run build` sans erreur

## M. Mobile en profondeur
- **M-auto (CI, à chaque release, bloquant)** : `tests/e2e_mobile.py`, voir section A. Les lignes M marquées (auto) y sont vérifiées.
- **M-réel (vrais téléphones, non systématique — décision de Julien du 26/11)** : un iPhone (Safari), un Android (Chrome) et le navigateur intégré de WhatsApp. À faire **quand une release touche le clavier, le partage, les photos, l'agenda, la connexion ou l'aperçu WhatsApp**, et au moins de temps en temps. Risque accepté : ce que l'émulation ne voit pas (lignes « réel ») peut passer en prod sans être vu. Noter dans la section D si la passe a été faite.

### M1. Environnements
- [ ] Safari iOS, Chrome Android : parcours création → publication → faire-part invité → RSVP en entier (réel)
- [ ] Faire-part invité ouvert **depuis une conversation WhatsApp** (navigateur intégré iOS et Android) : rendu, RSVP, agenda, Maps (réel)
- [ ] Lien de code ouvert depuis l'app Gmail / Mail (navigateur intégré) (réel)
- [ ] Portrait **et** paysage : rien de cassé ni de masqué
- [ ] Mode sombre du système : rendu du site et du faire-part inchangé ou lisible
- [ ] Texte système agrandi (taille de police iOS / Android au maximum courant) : pas de texte coupé ni de bouton qui déborde
- [ ] Réseau lent (« Slow 4G » / 3G ralenti) : faire-part invité utilisable, pas de faux message d'erreur (auto) ; pas de double envoi de RSVP (auto, bug 26/11 : 2 réponses enregistrées) ni de double publication (corrigé 26/11)
- [ ] 320 px (iPhone SE) : écran de succès, Mon faire-part, boutons de suppression sans débordement (auto, bug 26/11)

### M2. Saisie & clavier
- [ ] Aucun zoom automatique d'iOS sur les champs (taille de police des champs ≥ 16 px) (auto ; bug 26/11 : lien du faire-part à 15 px)
- [ ] Le clavier ne masque ni le champ actif ni le bouton Suivant / Envoyer (éditeur, RSVP, connexion, « Un souci ? ») (réel)
- [ ] Bon clavier : e-mail, téléphone, chiffres pour le code ; le code à 6 chiffres est proposé automatiquement au-dessus du clavier (`autocomplete="one-time-code"`) (réel)
- [ ] Sélecteurs de date et d'heure natifs : saisie correcte, heure conservée (pas de décalage de fuseau)
- [ ] Collage d'un lien partagé depuis Plans (Apple) et Google Maps (bug 26/11 pour `maps.apple/p/…`) (réel)

### M3. Tactile & ergonomie
- [ ] Zones tactiles ≥ 44 px, pas deux boutons collés (auto pour les boutons clés ; bug 26/11 : fermer l'aperçu, « Un souci ? », supprimer une réponse étaient à 36 px)
- [ ] Rien ne dépend du survol (menus, infobulles, aperçus)
- [ ] Panneau d'aperçu de l'éditeur : ouverture / fermeture au geste ; pas de double défilement ; pas de défilement horizontal parasite
- [ ] Encoche et barre d'accueil iPhone : boutons flottants et bas de page jamais masqués ; barre d'adresse Safari qui se rétracte sans casser la mise en page (réel)
- [ ] Retour Android / geste retour iOS : ferme l'aperçu de l'éditeur (auto, corrigé 26/11), ne perd jamais le brouillon (auto) ; vérifier aussi sur vrai téléphone (réel)
- [ ] Retour sur l'onglet après plusieurs heures (ou appli fermée) : session et brouillon conservés (réel)
- [ ] En-tête de l'éditeur sur une ligne à 320 px (bug 26/11) ; « Ajouter à mon agenda » non coupé (bug 26/11) ; réponses en fiches sur téléphone (bug 26/11)

### M4. Fonctions natives (réel)
- [ ] Partage du lien : feuille de partage native → WhatsApp, SMS ; « Copier le lien » fonctionne
- [ ] QR : enregistrement dans Photos / Galerie, QR relu par l'appareil photo d'un autre téléphone
- [ ] Ajouter à l'agenda : Calendrier iOS (fichier .ics) et Google Agenda Android, date / heure / lieu justes
- [ ] Lien Maps du faire-part : ouvre Plans / Google Maps au bon endroit
- [ ] Photo : depuis la galerie **et** l'appareil photo ; photo iPhone HEIC ; photo lourde (> 10 Mo) ; portrait et paysage
- [ ] Connexion par code : aller-retour navigateur ↔ app Mail sans perte de session ni de brouillon
- [ ] Connexion Google depuis un navigateur intégré (WhatsApp, Instagram) : Google refuse souvent la connexion dans ces navigateurs → l'utilisateur doit être guidé vers le code e-mail ou « Ouvrir dans Safari / Chrome » (à vérifier au premier passage)

## B. Parcours fonctionnels sur staging
**Chaque parcours se fait d'abord à 390 px (tactile), puis à 320 px et à 1440 px.** Navigateur marqué `fp:admin` pour ne rien mesurer. 0 erreur console sur chaque page.

### B1. Site public
- [ ] Accueil visiteur non connecté : boutons « Créer mon faire-part » / « Se connecter », bouton flottant mobile
- [ ] Accueil compte connecté : en-tête = bouton plein « Mon faire-part » ; héros « Voir mon faire-part et les réponses » (plein) + « Créer » (contour) ; bouton flottant mobile → Mon faire-part (+26/11)
- [ ] Ambiances (/ambiances/ + 9 pages), RSVP, WhatsApp, exemple Camille & Thomas, tarifs, à propos, outils (générateur, rétroplanning)
- [ ] Pied de page : « Signaler un problème » présent (+26/11)
- [ ] staging : robots.txt `Disallow: /` et en-tête `noindex`
- [ ] Connu, non corrigé : pas de menu dans l'en-tête mobile ; tableau comparatif de l'accueil en défilement horizontal sur téléphone → vérifier que ça reste utilisable

### B2. Éditeur (/creer/)
- [ ] Toutes les étapes jusqu'à la publication
- [ ] Ordinateur : aperçu en direct visible à droite, pas sous l'écran (bug 26/11)
- [ ] Téléphone : bouton d'aperçu plein écran, aperçu fidèle à l'ambiance choisie
- [ ] Lien Maps : `maps.apple/p/…` accepté ; lien sans `https://` complété (bug 26/11)
- [ ] Générateur de texte : heure seule sans date, pas de doublon « cadeau » avec la cagnotte, articles corrects (« au Château », « à la Mairie ») (bug 26/11)
- [ ] Brouillon conservé après rechargement

### B3. Compte & connexion
- [ ] Code e-mail (6 chiffres) reçu et accepté
- [ ] Connexion Google
- [ ] Session conservée après rechargement / nouvel onglet
- [ ] Suppression de compte : compte supprimé, retours anonymisés (+26/11)

### B4. Publication & Mon faire-part
- [ ] Écran de succès : lien, QR lisible, partage ; carte de note 0–10 (+26/11)
- [ ] Note : question adaptée (0–6 / 7–8 / 9–10), modifiable depuis Mon faire-part (« X/10 · Modifier ») (+26/11)
- [ ] Rappel de note : une seule fois si la carte a été ignorée, jamais pendant la visite où la carte a été vue (+26/11)
- [ ] Liste des réponses : fiches sur téléphone, ombre de défilement sur ordinateur (bug 26/11)
- [ ] Modification d'un faire-part publié : changement visible côté invité

### B5. Faire-part invité (`/invitation.html?f=…`)
- [ ] Rendu correct (aussi avec une config proche d'un vrai faire-part, en local ; jamais en ouvrant un vrai faire-part en prod)
- [ ] RSVP : envoi, réponse visible dans Mon faire-part
- [ ] Coupure réseau → « n'a pas pu s'ouvrir » + Réessayer ; faire-part inexistant → lien vers l'accueil (bug 26/11)
- [ ] **Pas** de bouton « Un souci ? » (+26/11)
- [ ] Anciens liens `invitation.html?f=…` toujours valides

### B6. Retours utilisateurs (+26/11)
- [ ] « Un souci ? » dans l'éditeur (icône seule sur téléphone), Mon faire-part et pied de page ; types bug / ça ne me plaît pas / idée
- [ ] Envoi possible sans compte ; e-mail prérempli si connecté
- [ ] Ligne enregistrée en base staging avec son contexte (page, étape, écran, catégorie d'appareil, navigateur + 5 dernières erreurs JS pour un bug)
- [ ] Note réservée aux comptes

### B7. /admin/ (staging uniquement, lit la prod)
- [ ] Connexion code e-mail (sans création de compte) et Google
- [ ] Indicateurs du tunnel, cartes « Comptes créés » / « Faire-part créés » cliquables, Exclure / Réintégrer
- [ ] « Exclure mon activité » appliqué aux cartes et aux listes ; ouvertures hors réseaux du créateur
- [ ] Section « Retours » : moyenne, répartition, liste filtrable, changement de statut (+26/11)
- [ ] Aucune modification de données de prod hors statuts / exclusions

## C. Contrôle après mise en prod (lecture seule)
Navigateur marqué `fp:admin`. Ne pas ouvrir de vrai faire-part (ça compterait une ouverture), ne créer ni compte ni faire-part.
- [ ] Accueil, /creer/, /mon-faire-part/, exemple : 0 erreur console, **à 390 px et à 1440 px**
- [ ] maison-meli.com/admin/ → 404
- [ ] robots.txt de prod ouvert, sitemap.xml OK, pages en `index, follow`
- [ ] Aperçu du lien dans WhatsApp (prénoms + date + image, jamais le lieu) : coller le lien du faire-part fictif de test dans une conversation (réel)
- [ ] Migration SQL éventuelle appliquée en prod (fonctions identiques au schéma)
- [ ] Logs Supabase de prod sans nouvelle erreur
- [ ] Ce qui ne se teste pas en recette (pas de clé Resend dans la base staging) : e-mail de nouveau retour, récap RSVP → vérifier au premier envoi réel ou par un test explicitement validé par Julien

## D. Historique des releases
| Date | Commit prod | Devs inclus | Résultat | Mobile réel | Lignes ajoutées / retirées |
|---|---|---|---|---|---|
| 26/11/2026 | 129a6ba | Recette complète (9 corrections) | e2e 230/230, SEO OK | non (émulation seule) | Lignes « bug 26/11 » |
| 26/11/2026 | 9e5f0dd | Retours & signalement ; accueil compte connecté ; /admin/ ouvertures (fb6ea7d) | e2e 262/262, SEO OK, prod vérifiée | non (émulation seule) | Lignes « +26/11 » ; section M créée |
| 26/11/2026 | 8b9f34f | Recette mobile automatique + CI GitHub ; 7 corrections mobiles (double envoi RSVP, double publication, geste retour, zones 44 px, champ 15 px, débordements 320 px) | e2e 262/262, mobile 261/261 (Safari + Chrome Android, 2 passages), SEO OK ; prod vérifiée (C) à 390/1440 px, 0 erreur | non (décision : pas systématique) | Lignes « auto » et « bug 26/11 » de M ; M-réel devient non systématique |

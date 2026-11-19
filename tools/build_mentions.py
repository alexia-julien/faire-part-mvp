"""Génère mentions-legales.html (LCEN, art. 1-1 et 6).
Les informations sur l'éditeur sont lues dans tools/editeur.json, à remplir par l'éditeur lui-même.
Tant qu'un champ obligatoire manque, la page n'est PAS générée : on ne publie jamais de mentions inventées.

Exemple de tools/editeur.json :
{
  "nom": "Julien Meli",                  # personne physique, ou raison sociale d'une société
  "statut": "Particulier",               # ou « Entrepreneur individuel, SIRET 123 456 789 00012 », « SAS au capital de … »
  "adresse": "1 rue …, 94100 Saint-Maur-des-Fossés",
  "email": "contact@maison-meli.com",
  "directeur_publication": "Julien Meli"
}
Lancer : python3 tools/build_mentions.py
"""
import json, os, sys, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "tools", "editeur.json")
OUT = os.path.join(ROOT, "mentions-legales.html")
REQUIRED = ["nom", "statut", "adresse", "email", "directeur_publication"]
UPDATED = "19 novembre 2026"

if not os.path.exists(SRC):
    sys.exit("tools/editeur.json absent : informations de l'éditeur à fournir (voir l'en-tête de ce script).")
ed = json.load(open(SRC, encoding="utf-8"))
missing = [k for k in REQUIRED if not str(ed.get(k, "")).strip()]
if missing:
    sys.exit("Champs manquants dans tools/editeur.json : " + ", ".join(missing))
e = lambda s: html.escape(str(s).strip())

HEART = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 21s-7.05-4.35-9.5-8.5C.7 9 2.2 5 6.3 5c2 0 3.6 1.1 5.7 3.6C14.1 6.1 15.7 5 17.7 5c4.1 0 5.6 4 3.8 7.5C19.05 16.65 12 21 12 21z' fill='%235F6E4E'/%3E%3C/svg%3E"
page = f'''<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#F6F2EA">
<meta name="robots" content="index, follow">
<title>Mentions légales — Maison Meli</title>
<meta name="description" content="Éditeur, directeur de la publication et hébergeurs du site Maison Meli.">
<link rel="canonical" href="https://maison-meli.com/mentions-legales.html">
<link rel="icon" href="{HEART}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Mulish:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/landing.css">
</head>
<body>
<header class="top">
  <a class="logo" href="/" aria-label="Maison Meli, accueil">Maison Meli</a>
  <nav aria-label="Navigation principale"><a class="btn btn-small" href="/creer.html">Créer mon faire-part</a></nav>
</header>
<main class="doc">
<h1>Mentions légales</h1>
<p>Dernière mise à jour : {UPDATED}.</p>

<h2>Éditeur du site</h2>
<p>Le site maison-meli.com est édité par <strong>{e(ed["nom"])}</strong> ({e(ed["statut"])}).<br>
Adresse : {e(ed["adresse"])}<br>
Contact : <a href="mailto:{e(ed["email"])}">{e(ed["email"])}</a></p>
<p>Directeur de la publication : {e(ed["directeur_publication"])}.</p>

<h2>Hébergement</h2>
<ul>
  <li><strong>Pages du site</strong> : GitHub, Inc. (service GitHub Pages), 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis. Téléphone : +1 877 448 4820.</li>
  <li><strong>Base de données et comptes</strong> : Supabase Pte. Ltd., 65 Chulia Street #38-02/03, OCBC Centre, Singapour 049513. Données hébergées dans l’Union européenne (Francfort).</li>
</ul>

<h2>Données personnelles</h2>
<p>Ce que Maison Meli enregistre, pourquoi, et comment le supprimer est décrit dans la page <a href="/confidentialite.html">Confidentialité</a>. Les règles d’utilisation du service figurent dans les <a href="/conditions.html">Conditions d’utilisation</a>.</p>

<h2>Propriété intellectuelle</h2>
<p>La marque Maison Meli, les modèles de faire-part, les textes et le code du site appartiennent à leur éditeur. Les textes et photos publiés par les couples restent leur propriété.</p>
</main>
</body>
</html>
'''
open(OUT, "w", encoding="utf-8").write(page)
print("mentions-legales.html généré pour", ed["nom"])

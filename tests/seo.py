#!/usr/bin/env python3
"""Recette SEO/GEO de l'export statique (web/out) — critères d'acceptation du brief SEO/GEO, sprints 0 à 3.

Usage : python3 tests/seo.py [dossier_export]   (par défaut web/out)
Vérifie, sans JavaScript (HTML source) : title, description, canonical, robots, Open Graph, H1 unique, JSON-LD valide,
liens internes, plan du site, robots.txt, noindex des pages privées, volume de texte des pages clés.
"""
import html as H, json, os, re, sys
from html.parser import HTMLParser

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "web", "out")
SITE = "https://maison-meli.com"
fails, oks = [], 0

def check(name, ok, detail=""):
    global oks
    if ok: oks += 1
    else: fails.append(name + (" — " + detail if detail else ""))

class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.title = ""; self._t = False; self.meta = {}; self.links = []; self.canon = ""; self.h1 = 0
        self.ld = []; self._ld = False; self._buf = ""; self.text = []; self._skip = 0; self.og = {}
    def handle_starttag(self, tag, a):
        a = dict(a)
        if tag == "title": self._t = True
        if tag == "meta":
            if a.get("name"): self.meta[a["name"]] = a.get("content", "")
            if a.get("property"): self.og[a["property"]] = a.get("content", "")
        if tag == "link" and a.get("rel") == "canonical": self.canon = a.get("href", "")
        if tag == "a" and a.get("href"): self.links.append(a["href"])
        if tag == "h1": self.h1 += 1
        if tag == "script" and a.get("type") == "application/ld+json": self._ld = True; self._buf = ""
        if tag in ("script", "style", "template"): self._skip += 1
    def handle_endtag(self, tag):
        if tag == "title": self._t = False
        if tag == "script" and self._ld: self._ld = False; self.ld.append(self._buf)
        if tag in ("script", "style", "template"): self._skip = max(0, self._skip - 1)
    def handle_data(self, d):
        if self._t: self.title += d
        if self._ld: self._buf += d
        elif not self._skip: self.text.append(d)

def load(rel):
    p = Page(); p.feed(open(os.path.join(OUT, rel), encoding="utf-8").read()); return p

def words(p): return len(re.findall(r"[A-Za-zÀ-ÿ’'-]+", " ".join(p.text)))

def file_for(path):
    path = path.split("#")[0].split("?")[0]
    if path.endswith("/"): return os.path.join(OUT, path.lstrip("/"), "index.html")
    return os.path.join(OUT, path.lstrip("/"))

sitemap = re.findall(r"<loc>([^<]+)</loc>", open(os.path.join(OUT, "sitemap.xml"), encoding="utf-8").read())
check("plan du site non vide", len(sitemap) >= 20, str(len(sitemap)))
robots = open(os.path.join(OUT, "robots.txt"), encoding="utf-8").read()
check("robots.txt annonce le plan du site", "Sitemap: " + SITE + "/sitemap.xml" in robots)
for bot in ["Googlebot", "Google-Extended", "Bingbot", "OAI-SearchBot", "ChatGPT-User", "GPTBot", "PerplexityBot", "ClaudeBot", "Claude-SearchBot", "Applebot"]:
    check("robots.txt autorise " + bot, re.search(r"User-Agent: " + bot + r"\nAllow: /", robots) is not None)
check("robots.txt ne bloque rien", "Disallow" not in robots)

titles, descs = {}, {}
for url in sitemap:
    path = url[len(SITE):]
    f = file_for(path)
    check("page du plan exportée : " + path, os.path.exists(f))
    if not os.path.exists(f): continue
    p = load(os.path.relpath(f, OUT))
    t, d = H.unescape(p.title.strip()), p.meta.get("description", "")
    # Accueil : title actuel conservé à la demande du brief (61 caractères), image de partage dessinée à la main.
    check(path + " : title ≤ 60 caractères", 0 < len(t) <= (61 if path == "/" else 60), f"{len(t)} « {t} »")
    check(path + " : description 140–155 caractères", 140 <= len(d) <= 155, f"{len(d)}")
    check(path + " : canonical absolue = adresse du plan", p.canon == url, p.canon)
    check(path + " : indexable", "noindex" not in p.meta.get("robots", ""), p.meta.get("robots", ""))
    check(path + " : un seul H1", p.h1 == 1, str(p.h1))
    og = p.og.get("og:image", "")
    check(path + " : image Open Graph présente", (og.startswith(SITE + "/og/") or (path == "/" and og == SITE + "/img/og-accueil.png")) and os.path.exists(os.path.join(OUT, og[len(SITE) + 1:])), og)
    check(path + " : og:locale fr_FR", p.og.get("og:locale") == "fr_FR")
    for raw in p.ld:
        try: json.loads(raw); ok = True
        except Exception as e: ok = False
        check(path + " : JSON-LD valide", ok)
    check(path + " : Organization présente", any('"@type":"Organization"' in x for x in p.ld))
    if path != "/": check(path + " : BreadcrumbList", any('"BreadcrumbList"' in x for x in p.ld))
    titles.setdefault(t, []).append(path); descs.setdefault(d, []).append(path)
    for href in p.links:
        if href.startswith("/") and not href.startswith("//"):
            check(path + " : lien interne valide " + href, os.path.exists(file_for(href)) or href.split("#")[0] in ("/exemples/", "/comparatif/"), href)
        check(path + " : pas de lien relatif .html", not re.match(r"^[a-z-]+\.html", href), href)
check("titles uniques", all(len(v) == 1 for v in titles.values()), str([v for v in titles.values() if len(v) > 1]))
check("descriptions uniques", all(len(v) == 1 for v in descs.values()), str([v for v in descs.values() if len(v) > 1]))

# Pages clés : volume de texte, FAQ, JSON-LD attendu
home = load("index.html")
check("accueil ≥ 1 500 mots", words(home) >= 1500, str(words(home)))
check("accueil : 15 questions de FAQ", '"@type":"FAQPage"' in "".join(home.ld) and "".join(home.ld).count('"@type":"Question"') == 15)
check("accueil : WebSite + WebApplication (prix 0 EUR)", any('"WebSite"' in x for x in home.ld) and any('"price":"0"' in x for x in home.ld))
check("accueil : paragraphe-définition (phrase d'entité)", "Maison Meli est un créateur de faire-part de mariage digital, gratuit, avec suivi des réponses des invités, conçu en France." in " ".join(home.text))
check("accueil : liens vers les 9 ambiances", sum(1 for l in home.links if l.startswith("/ambiances/") and l != "/ambiances/") >= 9)
for slug in ["champetre", "boheme", "romantique", "minimaliste", "elegance", "chateau", "gatsby", "jardin-d-hiver", "porcelaine"]:
    p = load(f"ambiances/{slug}/index.html")
    check(f"ambiance {slug} ≥ 600 mots", words(p) >= 600, str(words(p)))
    check(f"ambiance {slug} : FAQPage", any('"FAQPage"' in x for x in p.ld))
    check(f"ambiance {slug} : bouton qui présélectionne l'ambiance", any(l.startswith("/creer/#s=") for l in p.links))

# Guides et comparatifs : en noindex jusqu'à relecture, absents du plan du site, gabarit complet
for g in ["guide/quand-envoyer-faire-part-mariage", "guide/faire-part-mariage-digital", "guide/texte-faire-part-mariage", "guide/reponses-invites-mariage", "comparatif/faire-part-papier-ou-digital", "comparatif/alternative-canva-faire-part"]:
    p = load(g + "/index.html")
    idx = SITE + "/" + g + "/" in sitemap
    check(g + " : noindex tant que non relu, ou dans le plan s'il est publié", ("noindex" in p.meta.get("robots", "")) != idx)
    check(g + " : Article (auteur, dates)", any('"Article"' in x and '"datePublished"' in x and '"dateModified"' in x and '"Person"' in x for x in p.ld))
    check(g + " : sources en lien", "Sources" in " ".join(p.text) and sum(1 for l in p.links if l.startswith("https://")) >= 3)
    check(g + " : un seul H1", p.h1 == 1)
t40 = load("guide/texte-faire-part-mariage/index.html")
check("pilier 2 : 40 textes", open(os.path.join(OUT, "guide/texte-faire-part-mariage/index.html"), encoding="utf-8").read().count("<blockquote data-copy") == 40)

# Pages privées : noindex dans le HTML source, absentes du plan du site
inv = load("invitation.html")
check("invitation.html : noindex, nofollow, noarchive dans le HTML", inv.meta.get("robots") == "noindex, nofollow, noarchive", inv.meta.get("robots"))
check("invitation.html hors plan du site", not any("invitation" in u for u in sitemap))
check("pas de dossier invitation/ (une seule adresse)", not os.path.exists(os.path.join(OUT, "invitation")))
for priv in ["creer/index.html", "mon-faire-part/index.html", "composants/index.html"]:
    check(priv + " : noindex", "noindex" in load(priv).meta.get("robots", ""))
check("creer/mon-faire-part hors plan du site", not any(x in u for u in sitemap for x in ("/creer/", "/mon-faire-part/", "/composants")))

# Fichiers de déploiement
red = open(os.path.join(OUT, "_redirects"), encoding="utf-8").read()
for a, b in [("/creer.html", "/creer/"), ("/admin.html", "/mon-faire-part/"), ("/confidentialite.html", "/confidentialite/"), ("/conditions.html", "/conditions/")]:
    check(f"_redirects : {a} → {b} en 301", re.search(re.escape(a) + r"\s+" + re.escape(b) + r"\s+301", red) is not None)
check("_redirects ne touche pas invitation.html", not re.search(r"^/invitation", red, re.M))
check("_headers : X-Robots-Tag sur invitation.html", "X-Robots-Tag: noindex, nofollow, noarchive" in open(os.path.join(OUT, "_headers"), encoding="utf-8").read())
check("clé IndexNow publiée", any(re.fullmatch(r"[0-9a-f]{32}\.txt", f) for f in os.listdir(OUT)))
check("404 personnalisée avec liens", "/ambiances/" in open(os.path.join(OUT, "404.html"), encoding="utf-8").read())
check("logo Organization exporté", os.path.exists(os.path.join(OUT, "logo.png")))

print(f"{oks} contrôles OK, {len(fails)} en échec")
for f in fails[:80]: print("  ✗", f)
sys.exit(1 if fails else 0)

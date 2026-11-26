"""Recette de bout en bout de Maison Meli (navigateur headless, mode local sans Supabase).
Prérequis : cd web && npm ci && npm run build:local   (export statique en mode local dans web/out)
Puis, depuis la racine du dépôt :  pip install playwright pillow opencv-python && python3 tests/e2e.py
Captures d'écran dans tests/out/. Code de sortie 1 si un test échoue. La base elle-même se teste avec supabase/tests.sql, tests-comptes.sql et tests-mesure.sql."""
import subprocess, time, json, re, os, sys, tempfile, base64, csv, io
from playwright.sync_api import sync_playwright
from PIL import Image
try:
    import cv2, numpy as np  # facultatif : relit les QR codes générés
except ImportError:
    cv2 = None

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "web", "out")
OUT = os.path.join(ROOT, "tests", "out"); os.makedirs(OUT, exist_ok=True)
AXE = os.path.join(ROOT, "web", "node_modules", "axe-core", "axe.min.js")
TMP = tempfile.mkdtemp()
BASE = "http://localhost:8099"
XSS = '<img src=x onerror=window.__xss=1><script>window.__xss=1</script>"\'>'
errors, results = [], []

def check(name, ok, detail=""):
    results.append((name, bool(ok)))
    print(("PASS " if ok else "FAIL ") + name + (" -> " + str(detail)[:300] if detail != "" and not ok else ""))

def watch(pg, tag):
    pg.on("pageerror", lambda e: errors.append(tag + " pageerror: %s" % e))
    pg.on("console", lambda m: errors.append(tag + " console: " + m.text) if m.type == "error" else None)
    pg.on("dialog", lambda d: (errors.append(tag + " DIALOG " + d.message), d.dismiss()))
    return pg

def wait_until(fn, timeout=8):
    t0 = time.time()
    while time.time() - t0 < timeout:
        try:
            if fn(): return True
        except Exception: pass
        time.sleep(0.1)
    return False

def db_get(pg): return json.loads(pg.evaluate("localStorage.getItem('fp:db')") or '{"inv":{},"rsvps":{}}')
def db_put(pg, db): pg.evaluate("(d)=>localStorage.setItem('fp:db', d)", json.dumps(db))
def uid(email): return 'local-' + re.sub(r'[^a-z0-9]+', '-', email.lower())
def sign_in(pg, email='alexia@example.com'):
    pg.evaluate("(s)=>localStorage.setItem('fp:session', s)", json.dumps({"access_token": "local." + uid(email), "refresh_token": "local", "expires_at": 4102444800, "user": {"id": uid(email), "email": email}}))
def events(pg): return json.loads(pg.evaluate("localStorage.getItem('fp:events')") or '[]')
def qr_text(png_bytes):
    if cv2 is None: return None
    img = cv2.imdecode(np.frombuffer(png_bytes, np.uint8), cv2.IMREAD_GRAYSCALE)
    # OpenCV 5 : marge blanche ajoutée autour, sinon le détecteur rate parfois un QR pourtant valide.
    img = cv2.copyMakeBorder(img, 40, 40, 40, 40, cv2.BORDER_CONSTANT, value=255)
    return cv2.QRCodeDetector().detectAndDecode(img)[0]
def overflow(pg): return pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
def axe(pg, ctx="document"):
    pg.evaluate(open(AXE).read())
    r = pg.evaluate("(c)=>axe.run(c==='document'?document:document.querySelector(c),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}).then(r=>r.violations.filter(v=>v.impact==='serious'||v.impact==='critical').map(v=>v.id+' '+v.nodes.length+' '+(v.nodes[0]&&v.nodes[0].target)))", ctx)
    return r

def invitation_cfg(**kw):
    c = {"v": 2, "partner1": "Camille", "partner2": "Hugo", "date": "2027-06-19", "time": "15:30", "tz": "Europe/Paris",
         "venueName": "Domaine des Tilleuls", "venueAddress": "Chemin des Vergers\n84220 Gordes", "theme": "sauge", "font": "classique",
         "intro": "enveloppe", "photoShape": "arrondi", "decor": "feuillage", "foil": "aucune", "texture": True,
         "sections": {"program": {"on": True, "items": [{"time": "15:30", "label": "Cérémonie"}, {"time": "17:00", "label": "Vin d’honneur"}]},
                      "lodging": {"on": True, "text": "Hôtels proches.", "url": "javascript:alert(1)"},
                      "gifts": {"on": True, "text": "Cagnotte.", "url": "https://www.leetchi.com/c/camille-hugo"}},
         "rsvp": {"guests": True, "children": True, "companions": True, "diet": True, "brunch": True, "message": True, "email": True, "deadline": "2027-05-01"}}
    c.update(kw); return c
def seed(pg, slug, cfg, owner="x", rsvps=None):
    db = db_get(pg); db["inv"][slug] = {"owner": owner, "config": cfg, "created_at": "2026-11-20T08:00:00Z", "updated_at": "2026-11-20T08:00:00Z"}
    db["rsvps"][slug] = rsvps or []; db_put(pg, db)

Image.new("RGB", (2400, 1600), (170, 150, 130)).save(TMP + "/ok.jpg")
Image.new("RGB", (900, 1600), (120, 140, 110)).save(TMP + "/portrait.jpg")
Image.new("RGB", (1200, 800), (40, 60, 200)).save(TMP + "/blue.jpg")
open(TMP + "/bad.jpg", "wb").write(b"not an image at all")

if not os.path.exists(os.path.join(SITE, "index.html")):
    sys.exit("Export absent : lancez d'abord `cd web && npm run build:local`.")
if "pmtwhrqfdvbxbgrzcytl" in open(os.path.join(SITE, "mon-faire-part", "index.html"), encoding="utf-8").read():
    sys.exit("web/out est l'export de production : lancez `cd web && npm run build:local` pour les tests.")

srv = subprocess.Popen(["python3", "-m", "http.server", "8099"], cwd=SITE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    def ctx(**kw):
        o = dict(viewport={"width": 1440, "height": 900}, timezone_id="Europe/Paris", locale="fr-FR", permissions=["clipboard-read", "clipboard-write"])
        o.update(kw); return b.new_context(**o)

    # ================================================================== Page d'accueil
    print("\n== Page d'accueil : SEO, GEO, accroche ==")
    c = ctx(); pg = watch(c.new_page(), "landing"); pg.goto(BASE + "/"); pg.wait_for_timeout(600)
    html = open(os.path.join(SITE, "index.html"), encoding="utf-8").read()
    check("titre SEO", pg.title() == "Faire-part mariage digital gratuit avec RSVP | Maison Meli", pg.title())
    check("meta description", "3 minutes" in (pg.get_attribute('meta[name=description]', 'content') or ""))
    check("URL canonique", pg.get_attribute("link[rel=canonical]", "href").rstrip("/") == "https://maison-meli.com")
    check("page indexable", "noindex" not in (pg.get_attribute('meta[name=robots]', 'content') or ""))
    check("image de partage (Open Graph)", pg.get_attribute('meta[property="og:image"]', 'content') == "https://maison-meli.com/img/og-accueil.png")
    lds = [json.loads(x) for x in pg.locator('script[type="application/ld+json"]').all_inner_texts()]
    check("Organization sur toutes les pages (fondateur, logo)", any(isinstance(x, dict) and x.get("@type") == "Organization" and x.get("founder") for x in lds))
    ld = next(x for x in lds if isinstance(x, list))
    check("données structurées : WebSite, WebApplication, HowTo, FAQPage", [x["@type"] for x in ld] == ["WebSite", "WebApplication", "HowTo", "FAQPage"])
    check("offre gratuite déclarée", ld[1]["offers"]["price"] == "0")
    faq_vis = pg.locator('#questions details summary').all_text_contents()
    check("FAQ visible = FAQ structurée (15 questions)", len(faq_vis) == 15 and [q.strip() for q in faq_vis] == [q["name"] for q in ld[3]["mainEntity"]])
    check("FAQ présente dans le HTML statique (sans JavaScript)", "Est-ce vraiment gratuit" in html and "Comment envoyer le faire-part" in html)
    check("un seul titre principal", pg.locator('h1').count() == 1)
    check("le H1 porte la requête « faire-part de mariage digital, gratuit »", "Faire-part de mariage digital, gratuit" in pg.text_content('h1'))
    check("pas de faux titres H2 dans la maquette du héros", pg.locator('#demo-phone h2').count() == 0 and pg.locator('#demo-phone .sh-title').count() > 0)
    check("logo : favicon.ico, SVG, icône iOS et manifest déclarés", pg.locator('link[rel=icon][href="/favicon.ico"]').count() == 1 and pg.locator('link[rel=icon][href="/icon.svg"]').count() == 1
          and pg.locator('link[rel=apple-touch-icon]').count() == 1 and pg.locator('link[rel=manifest]').count() == 1
          and all(os.path.exists(os.path.join(SITE, f)) for f in ["favicon.ico", "icon.svg", "apple-touch-icon.png", "site.webmanifest", "icon-512.png"]))
    check("logo : cachet dans l'en-tête", pg.locator('header nav a[href="/"] svg').count() == 1)
    check("titre principal pré-rendu (pas d'animation qui le masque)", 'id="h-hero"' in html and pg.evaluate("getComputedStyle(document.getElementById('h-hero')).opacity") == "1")
    check("llms.txt, robots.txt et sitemap publiés", all(os.path.exists(os.path.join(SITE, f)) for f in ["llms.txt", "robots.txt", "sitemap.xml"]))
    check("polices auto-hébergées (aucun appel à Google Fonts)", "fonts.googleapis" not in html and "fonts.gstatic" not in html)
    check("mesure : visite de l'accueil, provenance directe", any(e["event"] == "landing_view" and e["meta"].get("src") == "direct" for e in events(pg)))
    check("téléphone du héros : le vrai faire-part s'ouvre au chargement", wait_until(lambda: pg.locator('#demo-phone .fp-intro').count() == 0, 6) and pg.locator('#demo-phone .names').count() == 1)
    pg.fill('#p1', 'Alexia'); pg.fill('#p2', 'Julien'); pg.wait_for_timeout(300)
    check("prénoms écrits en direct sur le faire-part", "Alexia" in pg.inner_text('#demo-phone .names') and "Julien" in pg.inner_text('#demo-phone .names'))
    check("bouton principal : prénoms transmis à l'éditeur (fragment)", pg.get_attribute('#cta-hero', 'href') == "/creer/#p1=Alexia&p2=Julien")
    check("9 ambiances dans le sélecteur du héros", pg.locator('#demo-pills [role=radio]').count() == 9)
    pg.click('#demo-pills [aria-label="Gatsby"]'); pg.wait_for_timeout(300)
    check("une ambiance change l'aperçu du héros", pg.get_attribute('#demo-phone .fp-stage > div > .fp', 'data-theme') == 'noir' or pg.locator('#demo-phone .fp[data-theme=noir]').count() > 0)
    check("l'ambiance choisie part avec le lien", pg.get_attribute('#cta-hero', 'href').endswith("&s=gatsby"))
    check("carrousel : 9 ambiances, chacune ouvre l'éditeur dans son style", pg.locator('#ambiances a.style-card').count() == 9 and pg.get_attribute('#ambiances a.style-card[data-style=chateau]', 'href') == "/creer/#p1=Alexia&p2=Julien&s=chateau")
    check("carrousel : miniatures aux prénoms du couple", pg.locator('#ambiances .mini-names', has_text="Alexia").count() == 9)
    check("récit « Ce que vivent vos invités » en 3 temps", pg.locator('#invites h3').count() == 3)
    for w in [375, 390, 430, 1440]:
        pg.set_viewport_size({"width": w, "height": 844 if w < 800 else 900}); pg.wait_for_timeout(250)
        check(f"accueil : aucun débordement horizontal à {w} px", overflow(pg) <= 0, overflow(pg))
    pg.set_viewport_size({"width": 390, "height": 844}); pg.evaluate("window.scrollTo(0, 1600)"); pg.wait_for_timeout(700)
    check("mobile : « Créer mon faire-part » flottant en verre après le héros", pg.locator('a.glass[data-create]').count() == 1)
    pg.screenshot(path=OUT + "/accueil-mobile.png")
    pg.goto(BASE + "/?src=faire-part"); pg.wait_for_timeout(400)
    check("mesure : provenance « faire-part » (lien « Créez le vôtre »)", events(pg)[-1]["meta"].get("src") == "faire-part")
    sign_in(pg); pg.goto(BASE + "/"); pg.wait_for_timeout(400)
    check("visiteur connecté : « Mon faire-part » et lien de retour", pg.inner_text('#nav-mine') == "Mon faire-part" and pg.locator('#back-link').count() == 1)
    pg.set_viewport_size({"width": 1440, "height": 900})
    v = axe(pg); check("accessibilité de l'accueil (axe, WCAG 2.2 AA, aucune violation grave)", not v, v)
    c.close()
    c = ctx(extra_http_headers={"DNT": "1"}); pg = watch(c.new_page(), "dnt")
    pg.add_init_script("Object.defineProperty(navigator,'doNotTrack',{get:()=>'1'})"); pg.goto(BASE + "/"); pg.wait_for_timeout(400)
    check("« Do Not Track » : aucun événement envoyé", events(pg) == [])
    c.close()

    # ================================================================== Éditeur
    print("\n== Éditeur : une question par écran ==")
    c = ctx(); pg = watch(c.new_page(), "editeur"); pg.goto(BASE + "/creer/"); pg.wait_for_selector('#p1')
    check("page éditeur non indexée", "noindex" in (pg.get_attribute('meta[name=robots]', 'content') or ""))
    check("8 étapes, compteur annoncé", "1 / 8" in pg.inner_text('#wizard'))
    pg.click('#next'); check("prénoms manquants refusés", pg.inner_text('#step-msg') == 'Indiquez les deux prénoms.')
    pg.fill('#p1', 'Alexia'); pg.fill('#p2', 'Julien'); pg.wait_for_timeout(200)
    check("aperçu en direct à droite (60 %) : prénoms écrits", "Alexia" in pg.inner_text('#preview-pane .names'))
    pg.fill('#p1', 'Alexia '); pg.wait_for_timeout(100)
    check("mesure : début de création compté une seule fois", sum(1 for e in events(pg) if e["event"] == "editor_start") == 1)
    pg.fill('#p1', 'Alexia')
    pg.press('#p1', 'Enter'); pg.wait_for_selector('#date-input')
    check("Entrée passe à l'étape suivante", pg.locator('#date-input').count() == 1)
    check("calendrier limité : pas avant aujourd'hui, pas après 2050", pg.get_attribute('#date-input', 'max') == '2050-12-31' and re.fullmatch(r'\d{4}-\d{2}-\d{2}', pg.get_attribute('#date-input', 'min') or ''))
    pg.click('#next'); check("date manquante refusée", 'date' in pg.inner_text('#step-msg'))
    pg.fill('#date-input', '2020-01-01'); pg.click('#next'); check("date passée refusée", 'passée' in pg.inner_text('#step-msg'))
    pg.fill('#date-input', '2051-01-01'); pg.click('#next'); check("année au-delà de 2050 refusée", '2050' in pg.inner_text('#step-msg'))
    pg.fill('#date-input', '2027-08-07'); pg.wait_for_timeout(200)
    check("sans heure : jour seul sous la date", pg.inner_text('#preview-pane .date-sub').strip().upper() == 'SAMEDI', pg.inner_text('#preview-pane .date-sub'))
    pg.fill('#time-input', '16:00'); pg.wait_for_timeout(200)
    check("avec heure : jour et heure", pg.inner_text('#preview-pane .date-sub').strip().upper() == 'SAMEDI · 16H00')
    pg.click('#next'); pg.wait_for_selector('#venue')
    pg.click('#next'); check("lieu manquant refusé", pg.inner_text('#step-msg') == 'Indiquez le nom du lieu.')
    pg.fill('#venue', 'Domaine de Vauluisant'); pg.fill('#maps', 'https://evil.example.com/maps'); pg.click('#next')
    check("lien Maps non reconnu refusé", 'pas reconnu' in pg.inner_text('#step-msg'))
    pg.fill('#maps', 'https://maps.app.goo.gl/abc123')
    check("lieu dans le héros de l'aperçu", "Domaine de Vauluisant" in pg.inner_text('#preview-pane .hero-venue'))
    pg.reload(); pg.wait_for_selector('#venue')
    check("brouillon restauré après rechargement (même étape)", pg.input_value('#venue') == 'Domaine de Vauluisant' and pg.locator('#draft-note').count() == 1)
    pg.click('#next'); pg.wait_for_selector('.presets')
    check("9 ambiances, Champêtre par défaut", pg.locator('.preset').count() == 9 and pg.is_checked('input[name=preset][value=champetre]'))
    check("miniatures dessinées avec les prénoms du couple", pg.locator('.preset .mini-names', has_text="Alexia").count() == 9)
    pg.click('label.preset:has(input[value=elegance])'); pg.wait_for_timeout(400)
    prev = '#preview-pane .fp-stage > div > .fp'
    attrs = pg.evaluate("(s)=>{const e=document.querySelector(s);return ['data-theme','data-font','data-decor','data-foil','data-texture','data-shape'].map(a=>e.getAttribute(a))}", prev)
    check("ambiance Élégance : nuit, haute couture, cadre, dorure, sans texture", attrs == ['nuit', 'bodoni', 'cadre', 'or', 'lisse', 'arrondi'], attrs)
    check("choisir une ambiance rejoue l'ouverture dans l'aperçu", pg.locator('#preview-pane .fp-intro').count() == 1)
    check("contenu de l'aperçu inerte pendant l'ouverture", pg.evaluate("document.querySelector('#preview-pane .fp-stage > div').inert") is True)
    check("l'ouverture se termine seule", wait_until(lambda: pg.locator('#preview-pane .fp-intro').count() == 0, 5))
    check("dorure : prénoms peints en dégradé métallique", 'gradient' in pg.evaluate("(s)=>getComputedStyle(document.querySelector(s+' .names')).backgroundImage", prev))
    check("dégradés des ornements dorés : identifiants uniques", pg.evaluate("(()=>{const ids=[...document.querySelectorAll('linearGradient')].map(g=>g.id);return ids.length>0&&new Set(ids).size===ids.length})()"))
    pg.click('#next'); pg.wait_for_selector('#thumbs')
    check("12 palettes, 8 polices, 5 ornements, 4 finitions, 3 ouvertures", [pg.locator('[name=%s]' % n).count() for n in ['style-theme', 'style-font', 'style-decor', 'style-foil', 'style-intro']] == [12, 8, 5, 4, 3])
    pg.set_input_files('#photo-input', [TMP + "/bad.jpg", TMP + "/ok.jpg"]); wait_until(lambda: pg.locator('#thumbs .thumb').count() == 1)
    check("photo illisible signalée, la bonne ajoutée", pg.locator('#thumbs .thumb').count() == 1 and pg.inner_text('#photo-msg') != '')
    pg.set_input_files('#photo-input', [TMP + "/portrait.jpg", TMP + "/blue.jpg"]); wait_until(lambda: pg.locator('#thumbs .thumb').count() == 3)
    check("plafond de 3 photos", pg.locator('#thumbs .thumb').count() == 3 and pg.locator('#add-photo').count() == 0)
    srcs = pg.eval_on_selector_all('#thumbs img', "e=>e.map(x=>x.src)")
    pg.click('#thumbs .thumb:nth-child(2) .main-btn'); pg.wait_for_timeout(200)
    check("choix de la photo principale", pg.eval_on_selector('#thumbs img', "e=>e.src") == srcs[1])
    check("photo principale dans l'aperçu", pg.locator('#preview-pane .hero-photo').count() == 1)
    check("forme de la photo proposée (3 formes)", pg.locator('#shape-field .shape-card').count() == 3)
    pg.click('#shape-field .shape-card:has(input[value=arche])'); pg.wait_for_timeout(200)
    check("forme arche appliquée", pg.get_attribute(prev, 'data-shape') == 'arche')
    pg.click('#tab-colors'); pg.click('label:has(input[name=style-theme][value=bordeaux])'); pg.wait_for_timeout(200)
    check("palette Bordeaux appliquée, ambiance devenue personnalisée", pg.get_attribute(prev, 'data-theme') == 'bordeaux')
    pg.click('#tab-decor'); pg.click('label:has(input[name=style-decor][value=botanique])'); pg.wait_for_timeout(200)
    check("ornement botanique : deux branches dans les coins", pg.locator(prev + ' .dc-corner').count() == 2)
    pg.click('#tab-finish'); pg.click('label:has(input[name=style-foil][value=orrose])'); pg.wait_for_timeout(200)
    check("finition or rose", pg.get_attribute(prev, 'data-foil') == 'orrose')
    pg.click('#tab-font'); pg.click('label:has(input[name=style-font][value=romantique])'); pg.wait_for_timeout(1200)
    check("police romantique : prénoms en Great Vibes", 'Great Vibes' in pg.evaluate("(s)=>getComputedStyle(document.querySelector(s+' .names')).fontFamily", prev))
    check("police chargée depuis le site (auto-hébergée)", pg.evaluate("document.fonts.check('40px \"Great Vibes\"')"))
    pg.click('#tab-intro'); pg.click('label:has(input[name=style-intro][value=monogramme])'); pg.wait_for_timeout(300)
    check("ouverture « Monogramme » jouée dans l'aperçu", pg.locator('#preview-pane .fp-intro-monogramme').count() == 1)
    check("le monogramme s'ouvre seul", wait_until(lambda: pg.locator('#preview-pane .fp-intro').count() == 0, 5))
    pg.click('label:has(input[name=style-intro][value=aucune])'); pg.wait_for_timeout(200)
    check("ouverture « Aucune » : bouton Revoir masqué", pg.locator('#replay-intro').count() == 0)
    pg.click('label:has(input[name=style-intro][value=enveloppe])')
    pg.click('#next'); pg.wait_for_selector('#sw-program')
    check("aucune section active par défaut, compte à rebours activé", pg.locator('.sections [role=switch][aria-checked=true]').count() == 1 and pg.get_attribute('#sw-countdown', 'aria-checked') == 'true')
    pg.click('#sw-countdown'); pg.wait_for_timeout(150)
    check("compte à rebours désactivable", pg.locator(prev + ' .countdown').count() == 0)
    pg.click('#sw-countdown'); pg.click('#sw-program'); pg.wait_for_timeout(400)
    times = pg.eval_on_selector_all('#program-items input[type=time]', "e=>e.map(x=>x.value)")
    check("programme pré-rempli à partir de l'heure de la cérémonie", times == ['16:00', '17:30', '20:00', '23:00'], times)
    check("programme en frise dans l'aperçu", pg.locator(prev + ' .timeline li').count() == 4)
    pg.click('#program-add'); pg.fill('#program-items .prog-row:nth-child(5) input:not([type=time])', 'Brunch ' + XSS); pg.press('#program-items .prog-row:nth-child(5) input:not([type=time])', 'Enter')
    check("Entrée dans le programme ne change pas d'étape", pg.locator('#sw-program').count() == 1)
    check("texte de l'utilisateur jamais interprété (XSS)", pg.locator(prev + ' .timeline img').count() == 0 and pg.evaluate("window.__xss") is None)
    pg.click('#sw-story'); pg.wait_for_timeout(300)
    check("« Notre histoire » vide : texte d'exemple dans l'aperçu seulement", 'Votre texte apparaîtra ici' in pg.inner_text(prev + ' .sec-story'))
    for s in ['dress', 'lodging', 'practical', 'gifts']: pg.click('#sw-' + s)
    pg.wait_for_timeout(400)
    check("sections pré-remplies (dress code, hébergement, infos, liste)", all(pg.input_value('[data-sec="%s.text"]' % s) for s in ['dress', 'lodging', 'practical', 'gifts']))
    pg.fill('[data-sec="lodging.url"]', 'http://pas-sur.example'); pg.click('#next')
    check("lien d'hébergement invalide refusé", 'hébergements' in pg.inner_text('#step-msg'))
    pg.fill('[data-sec="lodging.url"]', ''); pg.fill('[data-sec="gifts.url"]', 'https://www.leetchi.com/c/alexia-julien'); pg.wait_for_timeout(200)
    check("bouton cagnotte avec le domaine affiché", 'leetchi.com' in pg.inner_text(prev + ' .sec-gifts .maps-btn'))
    pg.click('#sw-practical'); pg.wait_for_timeout(200)
    check("désactiver une section la retire", pg.locator(prev + ' .sec-practical').count() == 0)
    order = pg.eval_on_selector_all(prev + ' section', "e=>e.map(x=>x.className.split(' ')[0].replace('sec-',''))")
    check("ordre des sections", order == ['message', 'story', 'program', 'lieu', 'dress', 'lodging', 'gifts', 'rsvp'], order)
    alts = pg.eval_on_selector_all(prev + ' section', "e=>e.map(x=>x.classList.contains('alt'))")
    check("fonds alternés", all(alts[i] != alts[i + 1] for i in range(len(alts) - 1)))
    pg.click('#next'); pg.wait_for_selector('#rsvp-guests')
    pg.click('#rsvp-guests'); pg.click('#rsvp-children'); pg.wait_for_timeout(150) if pg.get_attribute('#rsvp-children', 'aria-checked') == 'false' else None
    if pg.get_attribute('#rsvp-children', 'aria-checked') == 'true': pg.click('#rsvp-children')
    check("accompagnants désactivés sans nombre de personnes ni d'enfants", pg.is_disabled('#rsvp-companions'))
    pg.click('#rsvp-guests'); pg.click('#rsvp-children'); pg.click('#rsvp-companions'); pg.click('#rsvp-brunch'); pg.click('#rsvp-email')
    pg.fill('#custom-q', 'Une chanson pour la soirée ? ' + XSS)
    pg.fill('#deadline-input', '2027-09-01'); pg.click('#next')
    check("date limite après le mariage refusée", 'précéder' in pg.inner_text('#step-msg'))
    pg.fill('#deadline-input', '2027-06-01'); pg.click('#next'); pg.wait_for_selector('#publish'); pg.wait_for_timeout(700)
    check("écran final : récapitulatif avant publication", "Alexia" in pg.inner_text('#wizard') and "Vauluisant" in pg.inner_text('#wizard'), pg.inner_text('#wizard')[:400])
    v = axe(pg); check("accessibilité de l'éditeur (axe, aucune violation grave)", not v, v)
    pg.click('#publish'); pg.wait_for_selector('#auth-email')
    check("publier demande le compte (panneau), le brouillon est gardé", pg.locator('#auth-step').count() == 1 and json.loads(pg.evaluate("localStorage.getItem('fp:draft')"))["state"]["partner1"].startswith("Alexia"))
    check("mesure : écran de connexion", any(e["event"] == "auth_gate" for e in events(pg)))
    pg.fill('#auth-email', 'pas-un-email'); pg.click('text=Recevoir mon code')
    check("email invalide refusé", 'valide' in pg.inner_text('.auth .form-msg'))
    pg.fill('#auth-email', 'alexia@example.com'); pg.click('text=Recevoir mon code'); pg.wait_for_selector('[data-input-otp]')
    check("code envoyé : 6 cases", "alexia@example.com" in pg.inner_text('.auth-sent'))
    pg.keyboard.type('654321'); pg.wait_for_timeout(500)
    check("mauvais code refusé", 'incorrect' in pg.inner_text('.auth .form-msg'))
    pg.keyboard.type('123456')
    check("rituel de publication (enveloppe scellée)", wait_until(lambda: pg.locator('.publish-ritual').count() == 1, 4))
    pg.screenshot(path=OUT + "/publication.png")
    check("le rituel se termine", wait_until(lambda: pg.locator('.publish-ritual').count() == 0, 6))
    db = db_get(pg); slug = next(iter(db["inv"])); cfg = db["inv"][slug]["config"]
    check("faire-part publié au nom du compte", db["inv"][slug]["owner"] == uid('alexia@example.com'))
    check("identifiant : prénoms + 8 caractères aléatoires", re.fullmatch(r'alexia-julien-[a-z2-9]{8}', slug), slug)
    check("contenu publié : prénoms, lieu, style, fuseau, provenance, durée", cfg["partner1"] == "Alexia" and cfg["theme"] == "bordeaux" and cfg["tz"] == "Europe/Paris" and cfg["meta"]["src"] == "direct" and isinstance(cfg["meta"]["durationSec"], int))
    check("étapes vides du programme non publiées, XSS stocké en texte", len(cfg["sections"]["program"]["items"]) == 5)
    check("brouillon effacé après publication", pg.evaluate("localStorage.getItem('fp:draft')") is None)
    pub = BASE + "/invitation.html?f=" + slug
    check("lien public affiché", pg.input_value('#public-link') == pub)
    wa = pg.get_attribute('.share-whatsapp', 'href')
    check("partage WhatsApp : prénoms, date et lien dans le message", "wa.me" in wa and "Alexia%20%26%20Julien" in wa and "7%20ao%C3%BBt%202027" in wa)
    check("partage SMS et email", pg.get_attribute('.share-sms', 'href').startswith('sms:') and pg.get_attribute('.share-email', 'href').startswith('mailto:?subject='))
    qr = base64.b64decode(pg.get_attribute('.qr-img', 'src').split(',')[1])
    check("QR code affiché, et il ouvre bien le faire-part", qr_text(qr) in (pub, None), qr_text(qr))
    with pg.expect_download() as dl: pg.click('.qr-download')
    big = Image.open(dl.value.path())
    check("QR code téléchargeable en PNG HD (≥ 1024 px)", big.width >= 1024 and dl.value.suggested_filename == "qr-faire-part-alexia-julien.png", (big.width, dl.value.suggested_filename))
    pg.click('[data-copy=public-link]'); pg.wait_for_timeout(300)
    check("lien copié, partage mesuré", pg.evaluate("navigator.clipboard.readText()") == pub and any(e["event"] == "share" and e["meta"].get("channel") == "copie" for e in events(pg)))
    check("mesure : téléchargement du QR", any(e["event"] == "qr_download" for e in events(pg)))
    pg.screenshot(path=OUT + "/publie.png", full_page=True)

    print("\n== Modification (un faire-part par compte) ==")
    pg.goto(BASE + "/creer/"); pg.wait_for_selector('#p1')
    check("compte connecté : son faire-part s'ouvre en modification", pg.input_value('#p1').startswith('Alexia') and "modifier mon faire-part" in pg.inner_text('#wizard').lower())
    pg.fill('#p2', 'Julien M.')
    for _ in range(7): pg.click('#next'); pg.wait_for_timeout(250)
    check("bouton « Enregistrer les modifications »", "Enregistrer" in pg.inner_text('#publish'))
    pg.click('#publish'); pg.wait_for_selector('#done')
    check("modifications enregistrées sur le même lien", db_get(pg)["inv"][slug]["config"]["partner2"] == "Julien M." and len(db_get(pg)["inv"]) == 1 and "modifications" in pg.inner_text('#done-title'))
    pg.goto(BASE + "/creer/#p1=Zoé&p2=Léo&s=gatsby"); pg.reload(); pg.wait_for_selector('#p1')
    check("le compte garde son faire-part (pas de second)", pg.input_value('#p2') == 'Julien M.')
    c.close()

    print("\n== Arrivée depuis l'accueil, brouillon d'un nouveau compte ==")
    c = ctx(viewport={"width": 390, "height": 844}); pg = watch(c.new_page(), "mobile-editeur")
    pg.goto(BASE + "/creer/#p1=Zoé&p2=Léo&s=gatsby"); pg.wait_for_selector('#p1')
    check("prénoms et ambiance repris de l'accueil", pg.input_value('#p1') == 'Zoé' and pg.input_value('#p2') == 'Léo')
    check("fragment nettoyé de l'adresse", "#" not in pg.url)
    check("mobile : bouton d'aperçu plein écran", pg.locator('#show-preview').count() == 1)
    pg.click('#show-preview'); pg.wait_for_timeout(700)
    check("mobile : aperçu en panneau (geste), à l'ambiance Gatsby", pg.locator('[role=dialog] .fp[data-theme=noir]').count() > 0)
    pg.click('#close-preview'); pg.wait_for_timeout(500)
    for w in [375, 390, 430]:
        pg.set_viewport_size({"width": w, "height": 844}); pg.wait_for_timeout(150)
        check(f"éditeur : aucun débordement horizontal à {w} px", overflow(pg) <= 0, overflow(pg))
    pg.click('#next'); pg.fill('#date-input', '2027-09-12'); pg.click('#next'); pg.fill('#venue', 'Moulin'); pg.click('#next'); pg.wait_for_timeout(300)
    for _ in range(4): pg.click('#next'); pg.wait_for_timeout(250)
    pg.click('#publish'); pg.wait_for_selector('#auth-email')
    pg.click('.auth-google'); pg.wait_for_selector('#done', timeout=15000)
    check("publication via « Continuer avec Google »", any(v["owner"] == uid('google.demo@example.com') for v in db_get(pg)["inv"].values()))
    c.close()

    # ================================================================== Faire-part invité
    print("\n== Faire-part invité : l'ouverture ==")
    c = ctx(viewport={"width": 390, "height": 844}); pg = watch(c.new_page(), "invite")
    pg.goto(BASE + "/invitation.html"); pg.wait_for_timeout(300)
    check("lien sans identifiant : message clair", "incomplet" in pg.inner_text('body'))
    pg.goto(BASE + "/invitation.html?f=inconnu-abcdefgh"); pg.wait_for_timeout(500)
    check("faire-part inconnu : message clair", "introuvable" in pg.inner_text('body'))
    seed(pg, "camille-hugo-abcdefgh", invitation_cfg(partner1="Camille" + XSS[:5], mapsUrl="https://evil.example/maps"))
    pg.goto(BASE + "/invitation.html?f=camille-hugo-abcdefgh"); pg.wait_for_selector('.fp-intro')
    html_inv = open(os.path.join(SITE, "invitation.html"), encoding="utf-8").read()
    check("faire-part jamais indexé", "noindex" in (pg.get_attribute('meta[name=robots]', 'content') or ""))
    check("aperçu du lien générique (enveloppe)", "og-invitation.png" in html_inv)
    check("enveloppe et cachet aux initiales", pg.locator('.env .env-seal').count() == 1 and "C" in pg.inner_text('.env-seal'))
    check("signature Maison Meli en pied de faire-part, sans lien commercial", pg.locator('.fp footer .fp-brand').count() == 1 and pg.locator('.fp footer .fp-brand a').count() == 0)
    check("matière de l'ambiance : kraft pour Champêtre", pg.evaluate("getComputedStyle(document.querySelector('.fp-intro')).getPropertyValue('--env').trim().toUpperCase()") == "#C8A97F")
    check("page bloquée et contenu inerte pendant l'ouverture", pg.evaluate("document.documentElement.classList.contains('fp-locked')") and pg.evaluate("document.querySelector('.fp-stage > div').inert") is True)
    pg.screenshot(path=OUT + "/invite-enveloppe.png")
    t0 = time.time(); pg.click('.env', force=True)
    check("ouverture chorégraphiée en moins de 2,5 s", wait_until(lambda: pg.locator('.fp-intro').count() == 0, 4) and time.time() - t0 < 2.9, round(time.time() - t0, 2))
    check("révélation des prénoms (écriture) après l'ouverture", pg.locator('.fp.fp-reveal .names').count() == 1)
    check("défilement rétabli", not pg.evaluate("document.documentElement.classList.contains('fp-locked')"))
    check("prénoms échappés (XSS)", pg.evaluate("window.__xss") is None and "<img" in pg.inner_text('.names'))
    check("papier assorti : fond de page et barre du navigateur", pg.get_attribute('meta[name=theme-color]', 'content').upper() == "#F6F2EA")
    check("compte à rebours", pg.locator('.countdown [data-cd=days]').count() == 1 and pg.inner_text('.countdown [data-cd=days]').isdigit())
    check("lien Maps douteux remplacé par une recherche", pg.get_attribute('.sec-lieu .maps-btn', 'href').startswith("https://www.google.com/maps/search/"))
    check("lien d'hébergement non https ignoré", pg.locator('.sec-lodging .maps-btn').count() == 0)
    with pg.expect_download() as dl: pg.click('[data-ics]')
    ics = open(dl.value.path(), encoding="utf-8").read()
    check("ajout à l'agenda : heure de Paris en UTC", "DTSTART:20270619T133000Z" in ics and "Domaine des Tilleuls" in ics, ics[:200])
    check("bouton « Répondre » flottant en verre", pg.locator('.fp-respond.glass').count() == 1)
    check("bouton discret pour rejouer l'ouverture", pg.locator('.fp-replay').count() == 1)
    pg.click('.fp-replay'); pg.wait_for_timeout(200)
    check("rejouer l'ouverture", pg.locator('.fp-intro').count() == 1)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(150); pg.keyboard.press('Escape')
    check("passable au clavier (Échap)", wait_until(lambda: pg.locator('.fp-intro').count() == 0, 3))
    for w in [375, 390, 430, 1440]:
        pg.set_viewport_size({"width": w, "height": 844 if w < 800 else 900}); pg.wait_for_timeout(150)
        check(f"faire-part : aucun débordement horizontal à {w} px", overflow(pg) <= 0, overflow(pg))
    pg.set_viewport_size({"width": 390, "height": 844})
    v = axe(pg); check("accessibilité du faire-part (axe, aucune violation grave)", not v, v)

    print("\n== Réponse de l'invité : une question à la fois ==")
    pg.click('.fp-respond'); pg.wait_for_timeout(600)
    check("« Répondre » mène au formulaire", pg.evaluate("document.querySelector('.sec-rsvp').getBoundingClientRect().top") < 300)
    check("date limite affichée", "1 mai 2027" in pg.inner_text('.deadline') or "1er mai 2027" in pg.inner_text('.deadline'))
    pg.click('.rq-nav .btn'); check("nom obligatoire", "nom" in pg.inner_text('.rsvp-flow .form-msg'))
    pg.fill('#f-name', 'Sophie Martin'); pg.press('#f-name', 'Enter'); pg.wait_for_timeout(400)
    check("Entrée passe à la question suivante", pg.locator('.rq-card').count() == 2)
    pg.click('.rq-card:has(input[value=yes])'); pg.wait_for_timeout(700)
    check("choisir « Oui » avance tout seul", pg.locator('#f-guests').count() == 1)
    pg.click('[aria-label^="Plus — Adultes"]'); pg.click('[aria-label^="Plus — Enfants"]')
    check("compteurs adultes / enfants", pg.input_value('#f-guests') == '2' and pg.input_value('#f-children') == '1')
    check("total de questions stable (parcours « Oui » compté dès le début)", "sur 8" in pg.inner_text('.rq-count').lower(), pg.inner_text('.rq-count'))
    check("accompagnants demandés seulement si on vient à plusieurs, sur le même écran", pg.locator('#f-companions').count() == 1)
    pg.fill('#f-companions', 'Paul Martin'); pg.click('.rq-nav .btn'); pg.wait_for_timeout(400)
    check("régimes en pastilles (8)", pg.locator('.rq-chip').count() == 8)
    pg.click('.rq-chip:has-text("Végétarien")'); pg.click('.rq-chip:has-text("Sans gluten")'); pg.fill('#f-diet', 'allergie aux noix')
    check("pastille sélectionnée annoncée", pg.get_attribute('.rq-chip:has-text("Végétarien")', 'aria-pressed') == 'true')
    pg.click('.rq-nav .btn'); pg.wait_for_timeout(400); pg.click('.rq-card:has(input[value=yes])'); pg.wait_for_timeout(700)
    check("brunch du lendemain", pg.locator('#f-email').count() == 1)
    pg.fill('#f-email', 'pas-un-email'); pg.click('.rq-nav .btn')
    check("email invalide refusé", "email" in pg.inner_text('.rsvp-flow .form-msg'))
    pg.fill('#f-email', 'sophie@example.fr'); pg.click('.rq-nav .btn'); pg.wait_for_timeout(400)
    pg.fill('#f-msg', 'Hâte !'); pg.click('.rq-nav .btn'); pg.wait_for_timeout(400)
    check("récapitulatif avant envoi", "Sophie Martin" in pg.inner_text('.rq-recap') and "Végétarien, Sans gluten, allergie aux noix" in pg.inner_text('.rq-recap'))
    check("récapitulatif complet : accompagnants, email et petit mot", all(t in pg.inner_text('.rq-recap') for t in ["Paul Martin", "sophie@example.fr", "Hâte !"]), pg.inner_text('.rq-recap'))
    pg.click('.rq-nav .btn:has-text("Envoyer")'); pg.wait_for_selector('.rsvp-thanks')
    check("remerciement personnalisé", "Merci Sophie" in pg.inner_text('.rsvp-thanks') and "ont bien reçu votre réponse" in pg.inner_text('.rsvp-thanks'))
    row = db_get(pg)["rsvps"]["camille-hugo-abcdefgh"][-1]["data"]
    check("réponse enregistrée (format inchangé pour le tableau)", row["name"] == "Sophie Martin" and row["attendance"] == "yes" and row["guests"] == 2 and row["children"] == 1 and row["companions"] == "Paul Martin" and row["diet"] == "Végétarien, Sans gluten, allergie aux noix" and row["brunch"] == "yes", row)
    check("identifiant anonyme et durée de réponse", re.fullmatch(r'[a-z2-9]{16}', row.get("rid", "")) and isinstance(row.get("elapsed"), int))
    check("« Créez le vôtre » seulement après la réponse (US-14)", pg.get_attribute('[data-made-with]', 'href') == BASE + "/?src=faire-part&utm_source=faire-part&utm_medium=referral&utm_campaign=cree-avec-maison-meli")
    pg.click('[data-made-with]'); pg.wait_for_timeout(500)
    pg.go_back(); pg.wait_for_selector('.fp-intro'); pg.click('.intro-skip')
    check("mesure : clic « Créez le vôtre » rattaché au faire-part", any(e["event"] == "cta_create" and e["slug"] == "camille-hugo-abcdefgh" for e in events(pg)))
    check("retour sur le faire-part : « Vous avez déjà répondu »", wait_until(lambda: "déjà répondu" in pg.inner_text('.rsvp-thanks'), 4))
    pg.click('.edit-rsvp'); pg.wait_for_timeout(400)
    check("modifier sa réponse : formulaire pré-rempli (US-13)", pg.input_value('#f-name') == 'Sophie Martin' and "remplacera" in pg.inner_text('.rsvp-flow'))
    pg.click('.rq-nav .btn'); pg.wait_for_timeout(400); pg.click('.rq-card:has(input[value=no])'); pg.wait_for_timeout(700)
    check("« Non » saute les questions de présence", pg.locator('#f-email').count() == 1)
    for _ in range(3):
        if pg.locator('.rq-nav .btn:has-text("Envoyer")').count(): break
        pg.click('.rq-nav .btn'); pg.wait_for_timeout(400)
    pg.click('.rq-nav .btn:has-text("Envoyer")'); pg.wait_for_selector('.rsvp-thanks')
    rs = db_get(pg)["rsvps"]["camille-hugo-abcdefgh"]
    check("la correction garde le même identifiant anonyme", len(rs) == 2 and rs[0]["data"]["rid"] == rs[1]["data"]["rid"] and rs[1]["data"]["guests"] == 0 and rs[1]["data"]["diet"] == "")
    pg.evaluate("localStorage.removeItem('fp:answered:camille-hugo-abcdefgh')"); pg.reload(); pg.click('.intro-skip')
    pg.evaluate("(()=>{const i=document.querySelector('input[name=website]');const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;s.call(i,'robot');i.dispatchEvent(new Event('input',{bubbles:true}))})()")
    pg.fill('#f-name', 'Robot'); pg.click('.rq-nav .btn'); pg.wait_for_timeout(300); pg.click('.rq-card:has(input[value=no])'); pg.wait_for_timeout(700)
    for _ in range(4):
        if pg.locator('.rq-nav .btn:has-text("Envoyer")').count(): break
        pg.click('.rq-nav .btn'); pg.wait_for_timeout(350)
    pg.click('.rq-nav .btn:has-text("Envoyer")'); pg.wait_for_timeout(500)
    check("champ piège anti-robots : rien n'est envoyé", len(db_get(pg)["rsvps"]["camille-hugo-abcdefgh"]) == 2)
    c.close()

    print("\n== Variantes d'ouverture et mouvement réduit ==")
    c = ctx(viewport={"width": 390, "height": 844}, reduced_motion="reduce"); pg = watch(c.new_page(), "reduit")
    pg.goto(BASE + "/"); seed(pg, "a-b-cdefghjk", invitation_cfg(theme="noir", font="artdeco", decor="artdeco", foil="or", texture=False))
    pg.goto(BASE + "/invitation.html?f=a-b-cdefghjk"); pg.wait_for_selector('.fp-intro'); t0 = time.time(); pg.click('.env', force=True)
    check("mouvement réduit : simple fondu (< 1 s)", wait_until(lambda: pg.locator('.fp-intro').count() == 0, 2) and time.time() - t0 < 1.2)
    check("mouvement réduit : pas d'écriture animée", pg.evaluate("getComputedStyle(document.querySelector('.names')).animationName") in ("none", ""))
    seed(pg, "c-d-cdefghjk", invitation_cfg(intro="aucune")); pg.goto(BASE + "/invitation.html?f=c-d-cdefghjk"); pg.wait_for_timeout(500)
    check("ouverture « Aucune » : faire-part direct", pg.locator('.fp-intro').count() == 0 and pg.locator('.names').count() == 1)
    seed(pg, "e-f-cdefghjk", {"partner1": "A", "partner2": "B", "date": "2027-01-01"}); pg.goto(BASE + "/invitation.html?f=e-f-cdefghjk"); pg.wait_for_timeout(500)
    check("ancien faire-part (sans intro) : affiché tel quel", pg.locator('.fp-intro').count() == 0)
    c.close()
    c = ctx(viewport={"width": 390, "height": 844}); pg = watch(c.new_page(), "mono")
    pg.goto(BASE + "/"); seed(pg, "g-h-cdefghjk", invitation_cfg(intro="monogramme", foil="or"))
    pg.goto(BASE + "/invitation.html?f=g-h-cdefghjk"); pg.wait_for_selector('.fp-intro-monogramme')
    check("monogramme aux initiales, ouverture automatique", "C" in pg.inner_text('.mono-letters') and wait_until(lambda: pg.locator('.fp-intro').count() == 0, 5))
    for pid, theme in [("romantique", "rose"), ("chateau", "ivoire"), ("elegance", "nuit"), ("emeraude", "emeraude"), ("boheme", "terracotta"), ("porcelaine", "porcelaine"), ("minimaliste", "riviera")]:
        seed(pg, "p-" + pid + "-abcdefgh", invitation_cfg(theme=theme)); pg.goto(BASE + "/invitation.html?f=p-" + pid + "-abcdefgh"); pg.wait_for_selector('.env')
        pg.screenshot(path=OUT + "/enveloppe-" + pid + ".png")
    check("9 matières d'enveloppe distinctes", len({pg.evaluate("(t)=>{const e=document.createElement('div');e.className='fp';e.dataset.theme=t;document.body.appendChild(e);const v=getComputedStyle(e).getPropertyValue('--env');e.remove();return v}", t) for t in ["sauge", "rose", "ivoire", "nuit", "noir", "emeraude", "terracotta", "porcelaine", "riviera"]}) == 9)
    c.close()

    # ================================================================== Tableau de suivi
    print("\n== Tableau de suivi du couple ==")
    c = ctx(); pg = watch(c.new_page(), "suivi"); pg.goto(BASE + "/mon-faire-part/"); pg.wait_for_selector('#auth-email')
    check("non connecté : connexion demandée", pg.locator('#signin').count() == 1)
    pg.fill('#auth-email', 'camille@example.com'); pg.click('text=Recevoir mon code'); pg.wait_for_selector('[data-input-otp]'); pg.keyboard.type('123456')
    pg.wait_for_selector('#none'); check("connecté sans faire-part : création proposée", pg.get_attribute('#none a', 'href') == '/creer/')
    rid = "aaaaaaaaaaaaaaaa"
    seed(pg, "camille-hugo-zzzzzzzz", invitation_cfg(), owner=uid('camille@example.com'), rsvps=[
        {"id": 1, "created_at": "2026-11-18T10:00:00Z", "data": {"name": "Sophie Martin", "attendance": "yes", "guests": 2, "children": 1, "diet": "Végétarien", "brunch": "yes", "email": "sophie@ex.fr", "rid": rid}},
        {"id": 2, "created_at": "2026-11-18T12:00:00Z", "data": {"name": "=HYPERLINK(\"x\")", "attendance": "no", "email": "marc@ex.fr"}},
        {"id": 3, "created_at": "2026-11-19T09:00:00Z", "data": {"name": "Sophie Martin", "attendance": "yes", "guests": 2, "children": 0, "diet": "Végétarien, Sans gluten", "brunch": "no", "rid": rid}},
        {"id": 4, "created_at": "2026-11-19T19:00:00Z", "data": {"name": "Léa " + XSS, "attendance": "yes", "guests": 1, "brunch": "yes"}}])
    pg.click('#refresh') if pg.locator('#refresh').count() else pg.reload(); pg.reload(); pg.wait_for_selector('#tiles'); pg.wait_for_timeout(1500)
    tiles = pg.eval_on_selector_all('#tiles .tile', "e=>e.map(x=>x.innerText.replace(/\\s+/g,' ').trim())")
    check("compteurs : 3 présents (3 adultes, 0 enfant), 1 absent, 3 réponses, brunch", tiles[:4] == ["3 personnes présentes (3 adultes, 0 enfant)", "1 ne viendra pas", "3 réponses", "1 au brunch"], tiles)
    check("réponse corrigée : seule la plus récente compte", "1 invité a corrigé sa réponse" in pg.inner_text('#dup-note') and pg.locator('#table tbody tr').count() == 3)
    pg.click('#toggle-replaced'); pg.wait_for_timeout(300)
    check("anciennes réponses visibles à la demande, barrées", pg.locator('#table tbody tr.superseded').count() == 1)
    pg.click('#toggle-replaced')
    check("régimes regroupés pour le traiteur", "Végétarien, Sans gluten" in pg.inner_text('#diet-box') and "Végétarien" + "\n" not in pg.inner_text('#diet-box'))
    check("réponses échappées (XSS)", pg.evaluate("window.__xss") is None)
    pg.fill('#search', 'sophie'); pg.wait_for_timeout(600)
    check("recherche", pg.locator('#table tbody tr').count() == 1 and "1 sur 3" in pg.inner_text('#count'), (pg.locator('#table tbody tr').count(), pg.locator('#count').all_inner_texts()))
    pg.fill('#search', ''); pg.click('[data-filter=no]'); pg.wait_for_timeout(600)
    check("filtre Absents", pg.locator('#table tbody tr').count() == 1, pg.locator('#table tbody tr').count())
    pg.click('[data-filter=all]'); pg.click('#table th button:has-text("Nom")'); pg.wait_for_timeout(200)
    check("tri par nom", pg.inner_text('#table tbody tr:first-child td:first-child').startswith('='))
    with pg.expect_download() as dl: pg.click('#csv')
    raw = open(dl.value.path(), "rb").read()
    rows = list(csv.reader(io.StringIO(raw.decode("utf-8-sig")), delimiter=";"))
    check("export CSV : BOM, une ligne par invité, sans doublon", raw.startswith(b"\xef\xbb\xbf") and len(rows) == 4 and rows[0][0] == "Nom")
    check("export CSV : pas de formule exécutable", any(r[0].startswith("'=") for r in rows))
    check("copier les emails : seulement les réponses en vigueur", "l’email" in pg.inner_text('#copy-emails'))
    pg.click('#copy-emails'); pg.wait_for_timeout(300)
    check("emails prêts pour le champ Cci", pg.evaluate("navigator.clipboard.readText()") == "marc@ex.fr")
    pg.click('#table tbody tr:has-text("HYPERLINK") td.act button'); check("suppression en deux temps", pg.locator('button.confirm:has-text("Confirmer")').count() == 1)
    pg.click('button.confirm:has-text("Confirmer")'); pg.wait_for_timeout(400)
    check("réponse supprimée", len(db_get(pg)["rsvps"]["camille-hugo-zzzzzzzz"]) == 3)
    check("lien de modification et de consultation", pg.get_attribute('#edit-link', 'href') == '/creer/' and pg.get_attribute('#open-public', 'href').endswith('?f=camille-hugo-zzzzzzzz'))
    check("partage aussi depuis le tableau", pg.locator('#detail .share-whatsapp').count() == 1 and pg.locator('#detail .qr-img').count() == 1)
    pg.click('#manual-open'); pg.fill('#manual-name', 'Tante Martine'); pg.fill('#manual-guests', '2'); pg.click('#manual-save'); pg.wait_for_timeout(700)
    added = [r for r in db_get(pg)["rsvps"]["camille-hugo-zzzzzzzz"] if r["data"].get("manual")]
    check("réponse reçue par téléphone : ajoutée à la main et comptée", len(added) == 1 and added[0]["data"]["guests"] == 2
          and pg.locator('#table tbody tr:has-text("Tante Martine")').count() == 1 and pg.locator('text=ajoutée par vous').count() == 1)
    check("récapitulatif e-mail activé par défaut", pg.get_attribute('#digest', 'aria-checked') == "true")
    pg.click('#digest'); pg.wait_for_timeout(300)
    check("récapitulatif e-mail désactivable", pg.get_attribute('#digest', 'aria-checked') == "false")
    pg.click('#premium-open'); pg.wait_for_timeout(200)
    check("fausse porte Premium : clic mesuré, email pré-rempli", any(e["event"] == "premium_click" for e in events(pg)) and pg.input_value('#premium-email') == "camille@example.com")
    pg.click('#premium-send'); pg.wait_for_selector('#premium-done')
    check("fausse porte Premium : intérêt enregistré", pg.evaluate("localStorage.getItem('fp:premium')") == "camille@example.com")
    v = axe(pg); check("accessibilité du tableau (axe, aucune violation grave)", not v, v)
    pg.screenshot(path=OUT + "/tableau.png", full_page=True)
    pg.set_viewport_size({"width": 390, "height": 844}); pg.wait_for_timeout(300)
    check("tableau : aucun débordement horizontal à 390 px", overflow(pg) <= 0, overflow(pg))
    pg.set_viewport_size({"width": 1440, "height": 900})
    pg.click('#delete-invitation'); pg.click('#delete-invitation'); pg.wait_for_selector('#none')
    check("suppression du faire-part et de ses réponses", "camille-hugo-zzzzzzzz" not in db_get(pg)["inv"])
    pg.click('#delete-account'); pg.click('#delete-account'); pg.wait_for_url(BASE + "/", timeout=5000)
    check("suppression du compte : déconnecté", pg.evaluate("localStorage.getItem('fp:session')") is None)
    c.close()

    # ================================================================== Pages SEO/GEO (brief du 20/11/2026)
    print("\n== Pages SEO/GEO : ambiances, produit, exemple, guides, outils ==")
    seo_pages = ["/ambiances/", "/ambiances/champetre/", "/ambiances/gatsby/", "/rsvp-mariage-en-ligne/", "/faire-part-mariage-whatsapp/",
                 "/exemples/camille-et-thomas/", "/tarifs/", "/a-propos/", "/mentions-legales/", "/guide/", "/guide/texte-faire-part-mariage/",
                 "/guide/faire-part-mariage-digital/", "/guide/reponses-invites-mariage/", "/comparatif/faire-part-papier-ou-digital/",
                 "/comparatif/alternative-canva-faire-part/", "/outils/", "/outils/generateur-texte-faire-part/", "/outils/retroplanning-faire-part/"]
    for w in (375, 1440):
        c = ctx(viewport={"width": w, "height": 860}); pg = watch(c.new_page(), "seo-%d" % w)
        bad = []
        for path in seo_pages:
            pg.goto(BASE + path); pg.wait_for_timeout(250)
            if overflow(pg) > 0: bad.append(path)
        check(f"pages SEO : aucun débordement horizontal à {w} px", not bad, bad)
        c.close()
    c = ctx(); pg = watch(c.new_page(), "seo")
    viol = {}
    for path in ["/ambiances/champetre/", "/rsvp-mariage-en-ligne/", "/guide/texte-faire-part-mariage/", "/outils/generateur-texte-faire-part/", "/outils/retroplanning-faire-part/", "/tarifs/"]:
        pg.goto(BASE + path); pg.wait_for_timeout(300)
        v = axe(pg)
        if v: viol[path] = v
    check("accessibilité des pages SEO (axe, aucune violation grave)", not viol, viol)
    # Ambiance : le bouton ouvre l'éditeur avec l'ambiance déjà choisie
    pg.goto(BASE + "/ambiances/gatsby/"); pg.wait_for_timeout(300)
    pg.click('a[data-style=gatsby] >> nth=0'); pg.wait_for_selector('#p1')
    wait_until(lambda: pg.evaluate("localStorage.getItem('fp:draft')") is not None)
    d = json.loads(pg.evaluate("localStorage.getItem('fp:draft')") or "{}")
    check("ambiance Gatsby : l'éditeur s'ouvre avec l'ambiance (canonical sans paramètre)", (d.get("state") or {}).get("theme") == "noir" and pg.url.endswith("/creer/"), d.get("state", {}).get("theme"))
    pg.evaluate("localStorage.removeItem('fp:draft')")
    # Exemple : réponse possible, rien d'enregistré
    pg.goto(BASE + "/exemples/camille-et-thomas/"); pg.wait_for_selector('.fp-intro', timeout=8000)
    pg.click('.env', force=True); pg.wait_for_timeout(2600)
    html_ex = open(os.path.join(SITE, "exemples", "camille-et-thomas", "index.html"), encoding="utf-8").read()
    check("exemple : texte du faire-part dans le HTML statique", "Domaine des Tilleuls" in html_ex and "Le faire-part de Camille et Thomas (exemple)" in html_ex)
    check("exemple : réponses non enregistrées (aucune écriture en base)", json.loads(pg.evaluate("localStorage.getItem('fp:db')") or '{"rsvps":{}}').get("rsvps", {}) == {})
    # Générateur : le texte part dans l'éditeur en un clic
    pg.goto(BASE + "/outils/generateur-texte-faire-part/"); pg.wait_for_selector('#g-p1')
    pg.fill('#g-p1', "Inès"); pg.fill('#g-p2', "Malo"); pg.fill('#g-date', "2027-09-04"); pg.click('text=Très formel')
    out = pg.inner_text('#g-out')
    check("générateur : date en toutes lettres en ton formel", "le samedi quatre septembre deux mille vingt-sept" in out, out)
    pg.click('text=Avec humour'); pg.click('#g-use'); pg.wait_for_selector('#p1')
    wait_until(lambda: "Inès" in (pg.evaluate("localStorage.getItem('fp:draft')") or ""))
    d = json.loads(pg.evaluate("localStorage.getItem('fp:draft')") or "{}").get("state") or {}
    check("générateur : prénoms et texte insérés dans l'éditeur", pg.input_value('#p1') == "Inès" and "signé un accord" in (d.get("subtitle") or "") , d.get("subtitle"))
    pg.evaluate("localStorage.removeItem('fp:draft')")
    # Rétroplanning
    pg.goto(BASE + "/outils/retroplanning-faire-part/"); pg.wait_for_selector('#r-date')
    pg.fill('#r-date', "2027-09-04")
    check("rétroplanning : date limite deux mois avant", pg.get_attribute('[data-step=dl] time', 'datetime') == "2027-07-04")
    check("rétroplanning : faire-part 5 mois avant (standard)", pg.get_attribute('[data-step=fp] time', 'datetime') == "2027-04-04")
    pg.click('text=À l’étranger, invités éloignés')
    check("rétroplanning : 10 mois avant pour l'étranger", pg.get_attribute('[data-step=fp] time', 'datetime') == "2026-11-04")
    c.close()

    # ================================================================== Pages, sécurité, CSP
    print("\n== Pages annexes et sécurité ==")
    c = ctx(); pg = watch(c.new_page(), "pages")
    for path, needle in [("/confidentialite/", "Confidentialité"), ("/conditions/", "Conditions d’utilisation"), ("/404.html", "Cette page n’existe pas"), ("/mentions-legales/", "Mentions légales"), ("/tarifs/", "Ce qui est gratuit"), ("/a-propos/", "Pourquoi Maison Meli existe")]:
        pg.goto(BASE + path); pg.wait_for_timeout(200)
        check("page " + path, needle in pg.inner_text('h1'))
    check("confidentialité : plus de Google Fonts", "Google Fonts" not in pg.goto(BASE + "/confidentialite/").text())
    pages = [os.path.relpath(os.path.join(d, f), SITE) for d, _, fs in os.walk(SITE) for f in fs if f.endswith(".html")]
    csp_ok = all('http-equiv="Content-Security-Policy"' in open(os.path.join(SITE, f), encoding="utf-8").read() for f in pages)
    check("CSP stricte sur toutes les pages", csp_ok and len(pages) >= 7)
    sdir = [re.search(r"script-src ([^;]*);", open(os.path.join(SITE, f), encoding="utf-8").read()).group(1) for f in pages]
    check("scripts autorisés par empreinte, jamais 'unsafe-inline' ni 'unsafe-eval'", all("'sha256-" in d and "unsafe" not in d for d in sdir), sdir[:1])
    check("Google autorisé seulement là où il sert", "accounts.google.com" not in open(os.path.join(SITE, "invitation.html"), encoding="utf-8").read() and "accounts.google.com/gsi/client" in open(os.path.join(SITE, "creer", "index.html"), encoding="utf-8").read())
    c.close()
    b.close()
finally:
    srv.terminate()

csp = [e for e in errors if "Content Security Policy" in e]
check("aucune violation de CSP pendant la recette", not csp, csp[:3])
real = [e for e in errors if "Content Security Policy" not in e and "Failed to load resource" not in e]
check("aucune erreur JavaScript pendant la recette", not real, real[:5])
ok = sum(1 for _, r in results if r)
print("\n%d / %d vérifications réussies" % (ok, len(results)))
sys.exit(0 if ok == len(results) else 1)

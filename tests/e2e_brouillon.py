"""Test ciblé du 27/11/2026 : reprise du brouillon (cas de Chloé, 27/11 à 1 h 57).
Une personne commence son faire-part sans compte, revient plus tard et passe par « Mon faire-part » :
on doit lui proposer de reprendre son brouillon, le rattacher à son compte, et le retrouver sur un autre appareil.
Prérequis : cd web && npm run build:local. Puis, depuis la racine : python3 tests/e2e_brouillon.py
Ordinateur (1440 px) et téléphone (390 px, tactile). Code de sortie 1 si un test échoue."""
import subprocess, time, json, re, os, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "web", "out")
OUT = os.path.join(ROOT, "tests", "out"); os.makedirs(OUT, exist_ok=True)
BASE = "http://localhost:8098"
errors, results = [], []

def check(name, ok, detail=""):
    results.append((name, bool(ok)))
    print(("PASS " if ok else "FAIL ") + name + (" -> " + str(detail)[:300] if detail != "" and not ok else ""))
def watch(pg, tag):
    pg.on("pageerror", lambda e: errors.append(tag + " pageerror: %s" % e))
    pg.on("console", lambda m: errors.append(tag + " console: " + m.text) if m.type == "error" else None)
    return pg
def wait_until(fn, timeout=8):
    t0 = time.time()
    while time.time() - t0 < timeout:
        try:
            if fn(): return True
        except Exception: pass
        time.sleep(0.1)
    return False
def uid(email): return 'local-' + re.sub(r'[^a-z0-9]+', '-', email.lower())
def session(email): return json.dumps({"access_token": "local." + uid(email), "refresh_token": "local", "expires_at": 4102444800, "user": {"id": uid(email), "email": email}})
def ls(pg, k): return pg.evaluate("(k)=>localStorage.getItem(k)", k)
def db(pg): return json.loads(ls(pg, 'fp:db') or '{"inv":{},"rsvps":{}}')
def overflow(pg): return pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")

if "pmtwhrqfdvbxbgrzcytl" in open(os.path.join(SITE, "mon-faire-part", "index.html"), encoding="utf-8").read():
    sys.exit("web/out est l'export de production : lancez `cd web && npm run build:local`.")
srv = subprocess.Popen(["python3", "-m", "http.server", "8098"], cwd=SITE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
DEVICES = {
    "ordinateur": dict(viewport={"width": 1440, "height": 900}),
    "téléphone": dict(viewport={"width": 390, "height": 844}, device_scale_factor=3, is_mobile=True, has_touch=True),
}
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    for dev, opts in DEVICES.items():
        email = "chloe-" + ("pc" if dev == "ordinateur" else "mobile") + "@example.com"
        def ctx():
            return b.new_context(timezone_id="Europe/Paris", locale="fr-FR", **opts)
        tap = (lambda pg, sel: pg.tap(sel)) if opts.get("has_touch") else (lambda pg, sel: pg.click(sel))
        print("\n== " + dev + " ==")

        # 1. Sans compte : prénoms saisis, puis départ.
        c = ctx(); pg = watch(c.new_page(), dev)
        pg.goto(BASE + "/creer/"); pg.wait_for_selector('#p1')
        pg.fill('#p1', 'Chloé'); pg.fill('#p2', 'Hugo'); pg.wait_for_timeout(500)
        d = json.loads(ls(pg, 'fp:draft') or '{}')
        check(dev + " : brouillon enregistré et horodaté dans le navigateur", d.get("state", {}).get("partner1") == "Chloé" and d.get("at", 0) > 0, d)

        # 2. Retour par « Mon faire-part », sans être connecté : on propose de reprendre.
        pg.goto(BASE + "/mon-faire-part/"); pg.wait_for_selector('#draft-resume')
        txt = pg.inner_text('#draft-resume')
        check(dev + " : non connecté, « Mon faire-part » propose de reprendre le brouillon", "Chloé & Hugo" in txt and "Reprendre mon faire-part" in txt, txt)
        check(dev + " : la connexion reste proposée sous la reprise (« Déjà publié ? »)", pg.locator('#signin').count() == 1 and "Déjà publié" in pg.inner_text('#signin'))
        check(dev + " : aucun débordement horizontal", overflow(pg) <= 0, overflow(pg))
        box = pg.locator('#draft-resume-link').bounding_box()
        check(dev + " : bouton Reprendre ≥ 44 px de haut", box and box["height"] >= 44, box)
        pg.screenshot(path=OUT + "/brouillon-reprise-" + ("pc" if dev == "ordinateur" else "mobile") + ".png", full_page=True)
        tap(pg, '#draft-resume-link'); pg.wait_for_selector('#p1')
        check(dev + " : Reprendre rouvre l'éditeur avec le brouillon", pg.input_value('#p1') == 'Chloé' and pg.locator('#draft-note').count() == 1)

        # 3. Connexion depuis « Mon faire-part » (le cas de Chloé) : le brouillon est rattaché au compte.
        pg.evaluate("(s)=>localStorage.setItem('fp:session', s)", session(email))
        pg.goto(BASE + "/mon-faire-part/"); pg.wait_for_selector('#draft-resume')
        check(dev + " : connecté sans faire-part, plus de page vide : reprise proposée", pg.locator('#none').count() == 0 and "Chloé & Hugo" in pg.inner_text('#draft-resume'))
        check(dev + " : le brouillon est rattaché au compte", wait_until(lambda: (db(pg).get("drafts", {}).get(uid(email), {}).get("data", {}).get("state", {}).get("partner2")) == "Hugo"))
        check(dev + " : brouillon marqué « gardé sur le compte »", wait_until(lambda: json.loads(ls(pg, 'fp:draft'))["synced"] == json.loads(ls(pg, 'fp:draft'))["at"]))

        # 4. Connecté, dans l'éditeur : les modifications partent sur le compte.
        pg.goto(BASE + "/creer/"); pg.wait_for_selector('#p1')
        pg.fill('#p2', 'Hugo-Louis'); pg.wait_for_timeout(300)
        check(dev + " : connecté, une modification part sur le compte (quelques secondes plus tard)", wait_until(lambda: db(pg)["drafts"][uid(email)]["data"]["state"]["partner2"] == "Hugo-Louis", 8))
        shared_db = ls(pg, 'fp:db')

        # 5. Autre appareil (navigateur vide, même compte) : le brouillon revient.
        c2 = ctx(); pg2 = watch(c2.new_page(), dev + " autre appareil")
        pg2.goto(BASE + "/"); pg2.evaluate("([d, s])=>{localStorage.setItem('fp:db', d); localStorage.setItem('fp:session', s)}", [shared_db, session(email)])
        pg2.goto(BASE + "/mon-faire-part/"); pg2.wait_for_selector('#draft-resume')
        check(dev + " : autre appareil, « Mon faire-part » retrouve le brouillon du compte", "Chloé & Hugo-Louis" in pg2.inner_text('#draft-resume'))
        pg2.goto(BASE + "/creer/"); pg2.wait_for_selector('#p1')
        check(dev + " : autre appareil, l'éditeur reprend le brouillon du compte", pg2.input_value('#p2') == 'Hugo-Louis' and pg2.locator('#draft-note').count() == 1)

        # 6. Déconnexion : le brouillon (déjà sur le compte) ne reste pas sur l'appareil.
        pg2.goto(BASE + "/mon-faire-part/"); pg2.wait_for_selector('#signout'); tap(pg2, '#signout'); pg2.wait_for_url(BASE + "/")
        check(dev + " : déconnexion, le brouillon gardé sur le compte quitte l'appareil", wait_until(lambda: ls(pg2, 'fp:draft') is None))
        c2.close()

        # 7. « Recommencer à zéro » efface le brouillon partout.
        pg.goto(BASE + "/creer/"); pg.wait_for_selector('#reset-draft'); tap(pg, '#reset-draft'); pg.wait_for_selector('#p1')
        pg.wait_for_timeout(300)
        check(dev + " : « Recommencer à zéro » efface le brouillon du navigateur et du compte", pg.input_value('#p1') == '' and uid(email) not in db(pg).get("drafts", {}))

        # 8. Publication : plus de brouillon nulle part, « Mon faire-part » montre le faire-part.
        state = {"partner1": "Chloé", "partner2": "Hugo", "date": "2027-07-03", "time": "15:00", "venueName": "Château de Test"}
        pg.evaluate("(d)=>localStorage.setItem('fp:draft', d)", json.dumps({"state": state, "step": 8, "activeMs": 120000, "at": int(time.time() * 1000)}))
        pg.goto(BASE + "/creer/"); pg.wait_for_selector('#publish'); pg.wait_for_timeout(300)
        check(dev + " : brouillon rattaché à l'ouverture de l'éditeur", wait_until(lambda: uid(email) in db(pg).get("drafts", {}), 6))
        tap(pg, '#publish')
        check(dev + " : publication", wait_until(lambda: any(v["owner"] == uid(email) for v in db(pg)["inv"].values()), 8))
        check(dev + " : après publication, brouillon effacé du navigateur et du compte", wait_until(lambda: ls(pg, 'fp:draft') is None and uid(email) not in db(pg).get("drafts", {}), 6))
        pg.goto(BASE + "/mon-faire-part/"); pg.wait_for_selector('#edit-link')
        check(dev + " : « Mon faire-part » montre le faire-part publié (plus de reprise)", pg.locator('#draft-resume').count() == 0)
        c.close()

        # 9. Compte sans brouillon ni faire-part : la page vide d'origine est conservée.
        c = ctx(); pg = watch(c.new_page(), dev + " vide")
        pg.goto(BASE + "/"); pg.evaluate("(s)=>localStorage.setItem('fp:session', s)", session("vide-" + email))
        pg.goto(BASE + "/mon-faire-part/"); pg.wait_for_selector('#none')
        check(dev + " : sans brouillon, la page « Aucun faire-part » est inchangée", pg.locator('#draft-resume').count() == 0)
        c.close()
    b.close()
finally:
    srv.terminate()

errs = [e for e in errors if "favicon" not in e]
check("aucune erreur JavaScript ni console", not errs, errs[:5])
n = sum(1 for _, ok in results if ok)
print("\n%d/%d" % (n, len(results)))
sys.exit(0 if n == len(results) else 1)

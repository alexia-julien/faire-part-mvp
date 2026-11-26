"""Recette mobile de Maison Meli : vrais moteurs (Safari = WebKit, Chrome Android = Chromium), écran tactile, agent mobile.
Complète tests/e2e.py (qui tourne sous Chromium ordinateur, fenêtre redimensionnée).

Prérequis : cd web && npm ci && npm run build:local
            pip install playwright pillow && python3 -m playwright install webkit chromium
Lancer    : python3 tests/e2e_mobile.py                 (tous les appareils dont le moteur est installé)
            python3 tests/e2e_mobile.py --strict        (échoue si un moteur manque : utilisé par la CI GitHub)
            python3 tests/e2e_mobile.py --devices "Pixel 7"
Captures dans tests/out/mobile/. Code de sortie 1 si un test échoue."""
import subprocess, time, json, re, os, sys, tempfile, argparse
from playwright.sync_api import sync_playwright
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "web", "out")
OUT = os.path.join(ROOT, "tests", "out", "mobile"); os.makedirs(OUT, exist_ok=True)
AXE = os.path.join(ROOT, "web", "node_modules", "axe-core", "axe.min.js")
TMP = tempfile.mkdtemp()
PORT = 8098
BASE = "http://localhost:%d" % PORT

# Appareils de référence : petit iPhone (320 px), iPhone récent, Android courant.
DEVICES = ["iPhone SE", "iPhone 15", "Pixel 7"]
MIN_TAP = 44  # px CSS : recommandation Apple (44 pt) et WCAG 2.5.5

ap = argparse.ArgumentParser()
ap.add_argument("--devices", default=",".join(DEVICES))
ap.add_argument("--strict", action="store_true", help="échoue si le moteur d'un appareil n'est pas installé")
args = ap.parse_args()

errors, results, skipped = [], [], []
DEV = ""

def check(name, ok, detail=""):
    label = "[%s] %s" % (DEV, name)
    results.append((label, bool(ok)))
    print(("PASS " if ok else "FAIL ") + label + (" -> " + str(detail)[:400] if detail != "" and not ok else ""))

def watch(pg, tag):
    pg.on("pageerror", lambda e: errors.append("[%s] %s pageerror: %s" % (DEV, tag, e)))
    pg.on("console", lambda m: errors.append("[%s] %s console: %s" % (DEV, tag, m.text)) if m.type == "error" else None)
    pg.on("dialog", lambda d: (errors.append("[%s] %s DIALOG %s" % (DEV, tag, d.message)), d.dismiss()))
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
def sign_in(pg, email):
    pg.evaluate("(s)=>localStorage.setItem('fp:session', s)", json.dumps({"access_token": "local." + uid(email), "refresh_token": "local", "expires_at": 4102444800, "user": {"id": uid(email), "email": email}}))
def seed(pg, slug, cfg, owner="x", rsvps=None):
    db = db_get(pg); db["inv"][slug] = {"owner": owner, "config": cfg, "created_at": "2026-11-20T08:00:00Z", "updated_at": "2026-11-20T08:00:00Z"}
    db["rsvps"][slug] = rsvps or []; db_put(pg, db)
def invitation_cfg(**kw):
    c = {"v": 2, "partner1": "Camille", "partner2": "Hugo", "date": "2027-06-19", "time": "15:30", "tz": "Europe/Paris",
         "venueName": "Domaine des Tilleuls", "venueAddress": "Chemin des Vergers\n84220 Gordes", "theme": "sauge", "font": "classique",
         "intro": "enveloppe", "photoShape": "arrondi", "decor": "feuillage", "foil": "aucune", "texture": True,
         "mapsUrl": "https://maps.app.goo.gl/abc123",
         "sections": {"program": {"on": True, "items": [{"time": "15:30", "label": "Cérémonie"}, {"time": "17:00", "label": "Vin d’honneur"}]},
                      "gifts": {"on": True, "text": "Cagnotte.", "url": "https://www.leetchi.com/c/camille-hugo"}},
         "rsvp": {"guests": True, "children": True, "companions": True, "diet": True, "brunch": False, "message": True, "email": True, "deadline": "2027-05-01"}}
    c.update(kw); return c

def overflow(pg): return pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
def shot(pg, name): pg.screenshot(path=os.path.join(OUT, "%s-%s.png" % (re.sub(r'\W+', '-', DEV).strip('-').lower(), name)))

def tappable(pg, sel, min_size=MIN_TAP):
    """L'élément est visible à l'écran, assez grand pour le doigt et rien ne le recouvre (barre flottante, bandeau…).
    Renvoie (ok, détail)."""
    loc = pg.locator(sel).first
    if loc.count() == 0: return False, "absent"
    try: loc.scroll_into_view_if_needed(timeout=3000)
    except Exception: pass
    pg.wait_for_timeout(150)
    r = loc.evaluate("""e=>{const b=e.getBoundingClientRect();const x=b.left+b.width/2,y=b.top+b.height/2;
        const t=document.elementFromPoint(x,y);return {w:b.width,h:b.height,top:b.top,bottom:b.bottom,vh:innerHeight,
        covered:!(t&&(t===e||e.contains(t)||t.contains(e))),by:t?(t.id||t.className||t.tagName).toString().slice(0,60):null}}""")
    ok = r["w"] >= min_size and r["h"] >= min_size and r["top"] >= 0 and r["bottom"] <= r["vh"] + 1 and not r["covered"]
    return ok, r

def small_inputs(pg):
    """Champs visibles dont la police est < 16 px : Safari iOS zoome alors toute la page au toucher."""
    return pg.evaluate("""[...document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]),textarea,select')]
        .filter(e=>{const b=e.getBoundingClientRect();return b.width>0&&b.height>0&&getComputedStyle(e).visibility!=='hidden'})
        .filter(e=>parseFloat(getComputedStyle(e).fontSize)<16).map(e=>(e.id||e.name||e.className.toString().slice(0,30))+':'+getComputedStyle(e).fontSize)""")

def fixed_bottom_unsafe(pg):
    """Éléments fixés en bas de l'écran sans marge pour la barre d'accueil de l'iPhone.
    Le site déclare viewport-fit=cover : sans env(safe-area-inset-bottom), un bouton collé en bas passe sous la barre."""
    return pg.evaluate("""(()=>{const rules=[];for(const s of document.styleSheets){let rs;try{rs=s.cssRules}catch(e){continue}
        const walk=l=>{for(const r of l){if(r.cssRules&&!r.selectorText)walk(r.cssRules);else if(r.selectorText)rules.push(r)}};walk(rs)}
      const out=[];for(const e of document.querySelectorAll('body *')){const cs=getComputedStyle(e);if(cs.position!=='fixed'||cs.display==='none'||cs.visibility==='hidden')continue;
        const b=e.getBoundingClientRect();if(b.width<40||b.height<20||b.bottom<innerHeight-48||b.top>innerHeight)continue;
        if(e.closest('[data-sonner-toaster],[aria-hidden=true]'))continue;
        let p=e,safe=false;while(p&&p!==document.body&&!safe){const el=p;safe=rules.some(r=>{try{return el.matches(r.selectorText)&&/safe-area-inset-bottom/.test(r.cssText)}catch(x){return false}})
          ||/safe-area-inset-bottom/.test(el.getAttribute('style')||'');p=p.parentElement}
        if(!safe)out.push((e.id||e.className.toString().slice(0,50)||e.tagName)+' bottom='+Math.round(innerHeight-b.bottom))}
      return out})()""")

def axe(pg):
    pg.evaluate(open(AXE).read())
    return pg.evaluate("axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}).then(r=>r.violations.filter(v=>v.impact==='serious'||v.impact==='critical').map(v=>v.id+' '+v.nodes.length+' '+(v.nodes[0]&&v.nodes[0].target)))")

Image.new("RGB", (3000, 4000), (170, 150, 130)).save(TMP + "/photo-telephone.jpg", quality=95)

# ====================================================================================================
def run_device(p, name, engine):
    global DEV
    DEV = name
    desc = dict(p.devices[name])
    browser = engine.launch()
    def ctx(**kw):
        o = dict(desc, timezone_id="Europe/Paris", locale="fr-FR"); o.update(kw)
        return browser.new_context(**o)
    W = desc["viewport"]["width"]
    print("\n================ %s — %s, %d px, tactile=%s ================" % (name, desc["default_browser_type"], W, desc.get("has_touch")))

    # ---------------------------------------------------------------- Accueil
    c = ctx(); pg = watch(c.new_page(), "accueil"); pg.goto(BASE + "/"); pg.wait_for_timeout(800)
    vp = pg.get_attribute('meta[name=viewport]', 'content') or ""
    check("viewport mobile : largeur de l'appareil, zoom utilisateur autorisé", "width=device-width" in vp and "user-scalable=no" not in vp and "maximum-scale=1" not in vp, vp)
    check("accueil : aucun débordement horizontal", overflow(pg) <= 0, overflow(pg))
    ok, d = tappable(pg, 'main a[href^="/creer"]'); check("accueil : « Créer mon faire-part » facile à toucher", ok, d)
    pg.mouse.wheel(0, 1500); pg.evaluate("window.scrollTo(0, 1600)"); pg.wait_for_timeout(900)
    ok, d = tappable(pg, 'a.glass[data-create]'); check("accueil : bouton flottant visible, ≥ 44 px, non recouvert", ok, d)
    bad = fixed_bottom_unsafe(pg); check("accueil : éléments fixés en bas au-dessus de la barre d'accueil iPhone (safe area)", not bad, bad)
    shot(pg, "accueil")
    pg.tap('a.glass[data-create]'); pg.wait_for_selector('#p1', timeout=8000)
    check("accueil : le bouton flottant ouvre l'éditeur au toucher", "/creer" in pg.url)
    c.close()

    # ---------------------------------------------------------------- Éditeur complet au doigt
    c = ctx(); pg = watch(c.new_page(), "editeur"); pg.goto(BASE + "/"); pg.wait_for_timeout(300)
    pg.goto(BASE + "/creer/"); pg.wait_for_selector('#p1')  # arrivée depuis l'accueil : le geste retour a un historique
    zoom = set()
    hdr = pg.evaluate("(()=>{const h=document.querySelector('header > div');return [h.getBoundingClientRect().height,h.scrollWidth-h.clientWidth]})()")
    check("éditeur : en-tête sur une ligne, sans débordement", hdr[0] <= 64 and hdr[1] <= 0, hdr)
    check("éditeur : aucun débordement horizontal", overflow(pg) <= 0, overflow(pg))
    pg.tap('#p1'); pg.keyboard.type('Alexia'); pg.tap('#p2'); pg.keyboard.type('Julien')
    zoom.update(small_inputs(pg))
    ok, d = tappable(pg, '#next'); check("éditeur : bouton « Suivant » facile à toucher", ok, d)
    # Aperçu en panneau
    ok, d = tappable(pg, '#show-preview'); check("éditeur : bouton d'aperçu ≥ 44 px", ok, d)
    pg.tap('#show-preview'); pg.wait_for_timeout(900)
    check("éditeur : l'aperçu s'ouvre au toucher, prénoms écrits", pg.locator('[role=dialog] .names').count() > 0 and "Alexia" in pg.inner_text('[role=dialog] .names'))
    ok, d = tappable(pg, '#close-preview'); check("éditeur : bouton de fermeture de l'aperçu ≥ 44 px", ok, d)
    shot(pg, "apercu")
    pg.go_back(); pg.wait_for_timeout(900)
    closed_by_back = "/creer" in pg.url and pg.locator('[role=dialog] .names').count() == 0
    check("éditeur : le geste retour ferme l'aperçu sans quitter l'éditeur", closed_by_back, pg.url)
    if "/creer" not in pg.url: pg.goto(BASE + "/creer/"); pg.wait_for_selector('#p1')
    elif pg.locator('#close-preview').count(): pg.tap('#close-preview'); pg.wait_for_timeout(500)
    # Fermeture par le bouton : l'éditeur reste en place (pas de retour en arrière parasite)
    pg.tap('#show-preview'); pg.wait_for_timeout(800); pg.tap('#close-preview'); pg.wait_for_timeout(900)
    check("éditeur : fermer l'aperçu par le bouton laisse sur l'éditeur", "/creer" in pg.url and pg.locator('#p1').count() == 1 and pg.locator('[role=dialog] .names').count() == 0, pg.url)
    check("éditeur : brouillon conservé après le geste retour", wait_until(lambda: pg.input_value('#p1') == 'Alexia', 4), pg.input_value('#p1'))
    pg.tap('#next'); pg.wait_for_selector('#date-input')
    zoom.update(small_inputs(pg))
    check("date : sélecteur natif (type=date)", pg.get_attribute('#date-input', 'type') == 'date' and pg.get_attribute('#time-input', 'type') == 'time')
    pg.fill('#date-input', '2027-08-07'); pg.fill('#time-input', '16:30'); pg.wait_for_timeout(200)
    pg.tap('#next'); pg.wait_for_selector('#venue')
    zoom.update(small_inputs(pg))
    pg.tap('#venue'); pg.keyboard.type('Domaine de Vauluisant')
    pg.fill('#maps', 'maps.app.goo.gl/abc123')  # collé depuis l'app Google Maps, sans https://
    pg.tap('#next'); pg.wait_for_selector('.presets')
    check("lien Maps sans https:// accepté", pg.locator('.presets').count() == 1, pg.inner_text('#step-msg') if pg.locator('#step-msg').count() else "")
    pg.tap('label.preset:has(input[value=boheme])'); pg.wait_for_timeout(300)
    check("ambiance choisie au toucher", pg.is_checked('input[name=preset][value=boheme]'))
    pg.tap('#next'); pg.wait_for_selector('#thumbs')
    pg.set_input_files('#photo-input', TMP + "/photo-telephone.jpg")
    check("photo de téléphone (12 Mpx, portrait) acceptée", wait_until(lambda: pg.locator('#thumbs .thumb').count() == 1, 10), pg.inner_text('#photo-msg') if pg.locator('#photo-msg').count() else "")
    check("éditeur (style) : aucun débordement horizontal", overflow(pg) <= 0, overflow(pg))
    pg.tap('#next'); pg.wait_for_selector('#sw-program')
    ok, d = tappable(pg, 'label[for=sw-program]'); check("sections : toute la ligne de l'interrupteur se touche (≥ 44 px)", ok, d)
    pg.tap('label[for=sw-program]'); pg.wait_for_timeout(300)
    check("sections : toucher la ligne active la section", pg.get_attribute('#sw-program', 'aria-checked') == 'true')
    zoom.update(small_inputs(pg))
    pg.tap('#next'); pg.wait_for_selector('#rsvp-guests')
    zoom.update(small_inputs(pg))
    for _ in range(3):
        if pg.locator('#publish').count(): break
        pg.tap('#next'); pg.wait_for_timeout(500)
    pg.wait_for_selector('#publish')
    ok, d = tappable(pg, '#publish'); check("récapitulatif : bouton « Publier » visible et non recouvert", ok, d)
    check("récapitulatif : aucun débordement horizontal", overflow(pg) <= 0, overflow(pg))
    shot(pg, "recapitulatif")
    # Connexion par code
    pg.tap('#publish'); pg.wait_for_selector('#auth-email')
    zoom.update(small_inputs(pg))
    em = pg.evaluate("(()=>{const e=document.querySelector('#auth-email');return [e.type,e.inputMode,e.autocomplete]})()")
    check("connexion : clavier e-mail et saisie automatique", em == ['email', 'email', 'email'], em)
    ok, d = tappable(pg, 'text=Recevoir mon code'); check("connexion : « Recevoir mon code » visible au-dessus du panneau", ok, d)
    pg.tap('#auth-email'); pg.keyboard.type('alexia@example.com'); pg.tap('text=Recevoir mon code'); pg.wait_for_selector('[data-input-otp]')
    otp = pg.evaluate("(()=>{const e=document.querySelector('[data-input-otp]');return [e.inputMode,e.autocomplete,e.getAttribute('pattern')]})()")
    check("code : clavier numérique et code proposé par le téléphone (one-time-code)", otp[0] == 'numeric' and otp[1] == 'one-time-code', otp)
    zoom.update(small_inputs(pg))
    shot(pg, "code")
    pg.keyboard.type('123456')
    check("publication terminée", wait_until(lambda: pg.locator('#done').count() == 1 and pg.locator('.publish-ritual').count() == 0, 12))
    db = db_get(pg); slug = next(iter(db["inv"]), None)
    check("faire-part publié", slug is not None and db["inv"][slug]["config"]["partner1"] == "Alexia")
    check("succès : aucun débordement horizontal", overflow(pg) <= 0, overflow(pg))
    ok, d = tappable(pg, '.share-whatsapp'); check("succès : bouton WhatsApp facile à toucher", ok, d)
    wa = pg.get_attribute('.share-whatsapp', 'href') or ""
    check("succès : lien WhatsApp compatible téléphone (wa.me)", wa.startswith("https://wa.me/") or "api.whatsapp.com" in wa, wa)
    check("succès : SMS au format téléphone", (pg.get_attribute('.share-sms', 'href') or "").startswith("sms:"))
    with pg.expect_download(timeout=10000) as dl: pg.tap('.qr-download')
    check("succès : QR enregistrable (PNG ≥ 1024 px)", Image.open(dl.value.path()).width >= 1024)
    if pg.locator('#rating-card [data-score]').count():
        ok, d = tappable(pg, '#rating-card [data-score="9"]', 32); check("note : cases 0–10 touchables (≥ 32 px)", ok, d)
        pg.tap('#rating-card [data-score="9"]'); pg.wait_for_timeout(300)
        zoom.update(small_inputs(pg))
    shot(pg, "succes")
    check("aucun champ < 16 px (pas de zoom automatique de Safari)", not zoom, sorted(zoom))
    # Appli fermée puis rouverte : session et faire-part toujours là
    pg.close(); pg = watch(c.new_page(), "reouverture"); pg.goto(BASE + "/mon-faire-part/"); pg.wait_for_timeout(1500)
    check("onglet rouvert : toujours connecté", pg.locator('#auth-email').count() == 0 and pg.locator('#tiles').count() == 1)
    c.close()

    # Brouillon conservé si l'onglet est fermé en cours de création
    c = ctx(); pg = watch(c.new_page(), "brouillon"); pg.goto(BASE + "/creer/"); pg.wait_for_selector('#p1')
    pg.tap('#p1'); pg.keyboard.type('Zoé'); pg.tap('#p2'); pg.keyboard.type('Léo'); pg.wait_for_timeout(800); pg.close()
    pg = watch(c.new_page(), "brouillon2"); pg.goto(BASE + "/creer/"); pg.wait_for_selector('#p1')
    check("onglet fermé puis rouvert : brouillon restauré", wait_until(lambda: pg.input_value('#p1') == 'Zoé', 4))
    # Texte agrandi (réglage d'accessibilité du téléphone)
    pg.evaluate("document.documentElement.style.fontSize='125%'"); pg.wait_for_timeout(400)
    check("texte agrandi (125 %) : éditeur sans débordement", overflow(pg) <= 0, overflow(pg))
    c.close()

    # ---------------------------------------------------------------- Faire-part invité
    c = ctx(); pg = watch(c.new_page(), "invite"); pg.goto(BASE + "/")
    seed(pg, "camille-hugo-mobilexx", invitation_cfg())
    pg.goto(BASE + "/invitation.html?f=camille-hugo-mobilexx"); pg.wait_for_selector('.env')
    shot(pg, "invite-enveloppe")
    pg.tap('.env', force=True)
    check("invité : l'enveloppe s'ouvre au toucher", wait_until(lambda: pg.locator('.fp-intro').count() == 0, 5))
    check("invité : aucun débordement horizontal", overflow(pg) <= 0, overflow(pg))
    ok, d = tappable(pg, '.fp-respond'); check("invité : « Répondre » flottant visible, ≥ 44 px", ok, d)
    bad = fixed_bottom_unsafe(pg); check("invité : éléments fixés en bas au-dessus de la barre d'accueil (safe area)", not bad, bad)
    mp = pg.get_attribute('.sec-lieu .maps-btn', 'href') or ""
    check("invité : bouton Maps ouvre l'app (lien https vers Maps)", mp.startswith("https://"), mp)
    ok, d = tappable(pg, '[data-ics]'); check("invité : « Ajouter à mon agenda » entier et touchable", ok, d)
    with pg.expect_download(timeout=10000) as dl: pg.tap('[data-ics]')
    ics = open(dl.value.path(), encoding="utf-8").read()
    check("invité : fichier agenda (.ics) à la bonne heure", "DTSTART:20270619T133000Z" in ics, ics[:120])
    shot(pg, "invite")
    # Paysage
    lw, lh = desc["viewport"]["height"], desc["viewport"]["width"]
    pg.set_viewport_size({"width": lw, "height": lh}); pg.wait_for_timeout(500)
    check("invité en paysage : aucun débordement horizontal", overflow(pg) <= 0, overflow(pg))
    ok, d = tappable(pg, '.fp-respond'); check("invité en paysage : bouton flottant visible", ok, d)
    shot(pg, "invite-paysage")
    pg.set_viewport_size(desc["viewport"]); pg.wait_for_timeout(400)
    pg.tap('.fp-respond'); pg.wait_for_timeout(700)
    zoomi = set(small_inputs(pg))
    pg.tap('#f-name'); pg.keyboard.type('Sophie Martin')
    ok, d = tappable(pg, '.rq-nav .btn'); check("réponse : bouton suivant visible", ok, d)
    pg.tap('.rq-nav .btn'); pg.wait_for_timeout(500)
    pg.tap('.rq-card:has(input[value=yes])'); pg.wait_for_timeout(800)
    ok, d = tappable(pg, '[aria-label^="Plus — Adultes"]'); check("réponse : boutons + / − ≥ 44 px", ok, d)
    pg.tap('[aria-label^="Plus — Adultes"]'); zoomi.update(small_inputs(pg))
    for _ in range(6):
        if pg.locator('.rq-nav .btn:has-text("Envoyer")').count(): break
        if pg.locator('#f-email').count(): pg.tap('#f-email'); pg.keyboard.type('sophie@example.fr')
        zoomi.update(small_inputs(pg))
        pg.tap('.rq-nav .btn'); pg.wait_for_timeout(500)
    check("réponse : aucun champ < 16 px", not zoomi, sorted(zoomi))
    ok, d = tappable(pg, '.rq-nav .btn:has-text("Envoyer")'); check("réponse : « Envoyer » visible et non recouvert", ok, d)
    pg.evaluate("(()=>{const b=[...document.querySelectorAll('.rq-nav .btn')].find(x=>/Envoyer/.test(x.textContent));b.click();b.click()})()")
    pg.wait_for_selector('.rsvp-thanks', timeout=8000); pg.wait_for_timeout(500)
    check("double toucher sur « Envoyer » : une seule réponse enregistrée", len(db_get(pg)["rsvps"]["camille-hugo-mobilexx"]) == 1, len(db_get(pg)["rsvps"]["camille-hugo-mobilexx"]))
    c.close()

    # Mode sombre du téléphone
    c = ctx(color_scheme="dark"); pg = watch(c.new_page(), "sombre"); pg.goto(BASE + "/")
    seed(pg, "camille-hugo-sombrexx", invitation_cfg(intro="aucune"))
    pg.goto(BASE + "/invitation.html?f=camille-hugo-sombrexx"); pg.wait_for_selector('.names'); pg.wait_for_timeout(500)
    v = axe(pg); check("mode sombre : faire-part lisible (contrastes axe)", not v, v)
    pg.goto(BASE + "/"); pg.wait_for_timeout(600)
    v = axe(pg); check("mode sombre : accueil lisible (contrastes axe)", not v, v)
    shot(pg, "accueil-sombre")
    c.close()

    # Réseau mobile lent. Chromium : profil « 4G lente » de Chrome (562 ms de latence, 1,4 Mbit/s), temps mesuré.
    # WebKit (pas de bridage réseau dans Playwright) : 250 ms de retard par fichier, pour vérifier les états de chargement.
    c = ctx(); pg = watch(c.new_page(), "lent"); pg.goto(BASE + "/")
    seed(pg, "camille-hugo-lentxxxx", invitation_cfg())
    throttled = desc["default_browser_type"] == "chromium"
    if throttled:
        cdp = c.new_cdp_session(pg); cdp.send("Network.enable"); cdp.send("Network.setCacheDisabled", {"cacheDisabled": True})
        cdp.send("Network.emulateNetworkConditions", {"offline": False, "latency": 562.5, "downloadThroughput": 1.4 * 1024 * 1024 / 8, "uploadThroughput": 675 * 1024 / 8})
    else:
        c.route("**/*", lambda route: (time.sleep(0.25), route.continue_()))
    t0 = time.time(); pg.goto(BASE + "/invitation.html?f=camille-hugo-lentxxxx", timeout=60000)
    seen_error = False
    while time.time() - t0 < 20 and pg.locator('.env').count() == 0:
        if re.search(r"introuvable|n.a pas pu s.ouvrir", pg.inner_text('body') or "", re.I): seen_error = True
        pg.wait_for_timeout(200)
    dt = time.time() - t0
    check("réseau lent : faire-part invité affiché", pg.locator('.env').count() == 1, round(dt, 1))
    check("réseau lent : pas de faux message d'erreur pendant le chargement", not seen_error)
    print("     (réseau lent : enveloppe affichée en %.1f s)" % dt)
    # Information seulement : le serveur de test ne compresse pas (Cloudflare sert en Brotli), le temps local est donc pessimiste.
    if throttled: print("INFO [%s] 4G lente, cache vide, sans compression : enveloppe en %.1f s (à mesurer sur staging pour la valeur réelle)" % (DEV, dt))
    c.close()

    # ---------------------------------------------------------------- Mon faire-part (suivi des réponses)
    c = ctx(); pg = watch(c.new_page(), "suivi"); pg.goto(BASE + "/")
    sign_in(pg, "camille@example.com")
    rows = [{"id": i, "created_at": "2026-11-%02dT10:00:00Z" % (10 + i), "data": {"name": "Invité numéro %d avec un nom assez long" % i, "attendance": "yes" if i % 3 else "no",
             "guests": 2, "children": 1, "diet": "Végétarien, Sans gluten, allergie aux noix", "email": "invite%d@example.fr" % i, "message": "Hâte d'y être, merci pour l'invitation !"}} for i in range(1, 9)]
    seed(pg, "camille-hugo-suivixxx", invitation_cfg(), owner=uid("camille@example.com"), rsvps=rows)
    pg.goto(BASE + "/mon-faire-part/"); pg.wait_for_selector('#tiles'); pg.wait_for_timeout(1500)
    if pg.locator('#rating-later').count(): pg.tap('#rating-later'); pg.wait_for_timeout(300)
    check("Mon faire-part : aucun débordement horizontal", overflow(pg) <= 0, overflow(pg))
    check("Mon faire-part : les 8 réponses sont affichées", pg.locator('#table tbody tr').count() == 8, pg.locator('#table tbody tr').count())
    hid = pg.evaluate("""(()=>{const w=document.querySelector('#table-wrap');const out=[];document.querySelectorAll('#table tbody tr:first-child td').forEach(td=>{const b=td.getBoundingClientRect();
        if(b.width>0&&(b.right>w.getBoundingClientRect().right+1||b.left<w.getBoundingClientRect().left-1))out.push(td.className||td.cellIndex)});return out})()""")
    check("Mon faire-part : chaque réponse lisible sans défilement horizontal (fiches)", not hid, hid)
    ok, d = tappable(pg, '#table tbody tr:first-child td.act button'); check("Mon faire-part : bouton de suppression touchable", ok, d)
    ok, d = tappable(pg, 'header [data-report]'); check("Mon faire-part : « Un souci ? » touchable", ok, d)
    shot(pg, "mon-faire-part")
    pg.tap('header [data-report]'); pg.wait_for_selector('#report-dialog')
    rz = small_inputs(pg); check("« Un souci ? » : aucun champ < 16 px", not rz, rz)
    ok, d = tappable(pg, '#report-send'); check("« Un souci ? » : bouton d'envoi visible", ok, d)
    c.close()

    # ---------------------------------------------------------------- Navigateur intégré de WhatsApp (information)
    ua = desc["user_agent"] + (" WhatsApp/2.24.1" if "iPhone" in desc["user_agent"] else " WhatsApp/2.24.1 wv")
    c = ctx(user_agent=ua); pg = watch(c.new_page(), "whatsapp"); pg.goto(BASE + "/")
    seed(pg, "camille-hugo-wappxxxx", invitation_cfg())
    pg.goto(BASE + "/invitation.html?f=camille-hugo-wappxxxx"); pg.wait_for_selector('.env'); pg.tap('.env', force=True)
    check("navigateur WhatsApp : faire-part ouvert", wait_until(lambda: pg.locator('.fp-intro').count() == 0, 5))
    pg.goto(BASE + "/creer/"); pg.wait_for_selector('#p1')
    hint = pg.evaluate("/WhatsApp|navigateur|Safari|Chrome/i.test(document.body.innerText)")
    print("INFO [%s] navigateur WhatsApp : message d'aide pour la connexion Google %s" % (DEV, "présent" if hint else "absent (Google refuse souvent la connexion dans ce navigateur)"))
    c.close()
    browser.close()

# ====================================================================================================
if not os.path.exists(os.path.join(SITE, "index.html")):
    sys.exit("Export absent : lancez d'abord `cd web && npm run build:local`.")
if "pmtwhrqfdvbxbgrzcytl" in open(os.path.join(SITE, "mon-faire-part", "index.html"), encoding="utf-8").read():
    sys.exit("web/out est l'export de production : lancez `cd web && npm run build:local` pour les tests.")

srv = subprocess.Popen(["python3", "-m", "http.server", str(PORT)], cwd=SITE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
try:
    with sync_playwright() as p:
        for name in [d.strip() for d in args.devices.split(",") if d.strip()]:
            engine = getattr(p, p.devices[name]["default_browser_type"])
            if not os.path.exists(engine.executable_path):
                skipped.append("%s (%s non installé : python3 -m playwright install %s)" % (name, engine.name, engine.name)); continue
            try:
                run_device(p, name, engine)
            except Exception as e:
                DEV = name; check("parcours complet sans blocage", False, repr(e)[:400])
finally:
    srv.terminate()

DEV = "global"
real = [e for e in errors if "Failed to load resource" not in e]
check("aucune erreur JavaScript sur mobile", not real, real[:6])
for s in skipped: print("IGNORÉ " + s)
if skipped and args.strict: check("tous les moteurs mobiles installés", False, skipped)
ok = sum(1 for _, r in results if r)
print("\n%d / %d vérifications mobiles réussies%s" % (ok, len(results), (" — %d appareil(s) ignoré(s)" % len(skipped)) if skipped else ""))
sys.exit(0 if ok == len(results) else 1)

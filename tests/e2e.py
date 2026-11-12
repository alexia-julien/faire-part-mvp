"""Recette de bout en bout (navigateur headless, mode local sans Supabase).
Lancer depuis la racine du repo :  pip install playwright pillow && python3 tests/e2e.py
Captures d'écran dans tests/out/. Code de sortie 1 si un test échoue.
La base elle-même se teste avec supabase/tests.sql."""
import subprocess, time, json, re, os, sys, tempfile
from playwright.sync_api import sync_playwright
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "tests", "out"); os.makedirs(OUT, exist_ok=True)
TMP = tempfile.mkdtemp()
BASE = "http://localhost:8099"
LOCAL = "window.FP_CONFIG={supabaseUrl:'',supabaseKey:''};"
XSS = '<img src=x onerror=window.__xss=1><script>window.__xss=1</script>"\'>'
errors, results = [], []

def check(name, ok, detail=""):
    results.append((name, bool(ok)))
    print(("PASS " if ok else "FAIL ") + name + (" -> " + str(detail) if detail != "" else ""))

def watch(pg, tag):
    pg.on("pageerror", lambda e: errors.append(tag + " pageerror: %s" % e))
    pg.on("console", lambda m: errors.append(tag + " console: " + m.text)
          if m.type == "error" and "ERR_TUNNEL" not in m.text and "ERR_NAME_NOT" not in m.text else None)
    pg.on("dialog", lambda d: (errors.append(tag + " DIALOG " + d.message), d.dismiss()))
    return pg

def newctx(b, **kw):
    c = b.new_context(**kw)
    c.route("**/js/config.js", lambda r: r.fulfill(status=200, content_type="application/javascript", body=LOCAL))
    return c

def wait_count(pg, sel, n, timeout=30):
    t0 = time.time()
    while time.time() - t0 < timeout:
        if pg.locator(sel).count() == n: return True
        time.sleep(0.1)
    return False

def wait_until(fn, timeout=8):
    t0 = time.time()
    while time.time() - t0 < timeout:
        if fn(): return True
        time.sleep(0.1)
    return False

def lum(rgb):
    v = [int(x) / 255 for x in re.findall(r'[\d.]+', rgb)[:3]] if 'color(srgb' not in rgb else [float(x) for x in re.findall(r'[\d.]+', rgb)[:3]]
    v = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in v]
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]

def ratio(a, b):
    la, lb = sorted([lum(a), lum(b)], reverse=True); return round((la + 0.05) / (lb + 0.05), 2)

def db_get(pg):
    return json.loads(pg.evaluate("localStorage.getItem('fp:db')") or '{"inv":{},"rsvps":{}}')

def db_put(pg, db):
    pg.evaluate("(d)=>localStorage.setItem('fp:db', d)", json.dumps(db))

def uid(email):
    return 'local-' + re.sub(r'[^a-z0-9]+', '-', email.lower())

def sign_in(pg, email='alexia@example.com'):
    """Pose une session du mode local (équivaut à une connexion réussie), sans passer par l'écran de connexion."""
    pg.evaluate("(s)=>localStorage.setItem('fp:session', s)", json.dumps({"access_token": "local." + uid(email), "refresh_token": "local", "expires_at": 4102444800, "user": {"id": uid(email), "email": email}}))

def code_login(pg, email='alexia@example.com'):
    """Connexion par l'écran : email, puis le code 123456 accepté par le faux service du mode local."""
    pg.fill('#auth-email', email); pg.click('.auth-form:not([hidden]) button[type=submit]'); pg.wait_for_selector('#auth-code')
    pg.fill('#auth-code', '123456'); pg.click('.auth-form:not([hidden]) button[type=submit]')

def fill_basics(pg, p1='Alexia', p2='Julien', date='2027-08-07', venue='Domaine de Vauluisant'):
    pg.fill('[data-bind=partner1]', p1); pg.fill('[data-bind=partner2]', p2); pg.fill('[data-bind=date]', date); pg.click('#next')
    pg.fill('[data-bind=venueName]', venue); pg.click('#next')

Image.new("RGB", (2400, 1600), (170, 150, 130)).save(TMP + "/ok.jpg")
Image.new("RGB", (900, 1600), (120, 140, 110)).save(TMP + "/portrait.jpg")
Image.new("RGB", (1200, 800), (40, 60, 200)).save(TMP + "/blue.jpg")
open(TMP + "/bad.jpg", "wb").write(b"not an image at all")

srv = subprocess.Popen(["python3", "-m", "http.server", "8099"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    c = newctx(b, viewport={"width": 1280, "height": 900}, timezone_id="Europe/Paris", locale="fr-FR",
               permissions=["clipboard-read", "clipboard-write"])
    pg = watch(c.new_page(), "onb"); pg.goto(BASE + "/creer.html")

    print("\n== Étapes 1-2 : validations ==")
    pg.click('#next'); check("étape 1 vide refusée", pg.inner_text('#step-msg') == 'Indiquez les deux prénoms.')
    pg.fill('[data-bind=partner1]', 'Alexia'); pg.fill('[data-bind=partner2]', 'Julien'); pg.click('#next')
    check("date manquante refusée", 'date' in pg.inner_text('#step-msg'))
    pg.fill('[data-bind=date]', '2020-01-01'); pg.click('#next'); check("date passée refusée", 'passée' in pg.inner_text('#step-msg'))
    pg.fill('[data-bind=date]', '2051-01-01'); pg.click('#next'); check("année au-delà de 2050 refusée", '2050' in pg.inner_text('#step-msg'), pg.inner_text('#step-msg'))
    pg.evaluate("(()=>{const i=document.getElementById('date-input');i.value='20270-08-07';i.dispatchEvent(new Event('input',{bubbles:true}))})()")
    pg.click('#next'); check("année à 5 chiffres refusée avec un message clair", '2050' in pg.inner_text('#step-msg'), pg.inner_text('#step-msg'))
    check("calendrier limité : pas avant aujourd'hui, pas après 2050", pg.get_attribute('#date-input', 'max') == '2050-12-31' and re.fullmatch(r'\d{4}-\d{2}-\d{2}', pg.get_attribute('#date-input', 'min') or ''))
    check("heure de la cérémonie facultative (vide par défaut)", 'facultatif' in pg.inner_text('label:has([data-bind=time])') and pg.input_value('[data-bind=time]') == '')
    pg.fill('[data-bind=date]', '2027-08-07'); time.sleep(0.3)
    check("sans heure : jour seul sous la date", pg.inner_text('#preview .date-sub').strip().upper() == 'SAMEDI', pg.inner_text('#preview .date-sub'))
    check("sans heure : agenda sur la journée entière", 'DTSTART;VALUE=DATE:20270807' in pg.evaluate("FP.buildIcs({partner1:'A',partner2:'B',date:'2027-08-07'})")
          and 'DTEND;VALUE=DATE:20270808' in pg.evaluate("FP.buildIcs({partner1:'A',partner2:'B',date:'2027-08-07'})"))
    pg.fill('[data-bind=time]', '16:00'); time.sleep(0.3)
    check("avec heure : jour et heure", pg.inner_text('#preview .date-sub').strip().upper() == 'SAMEDI · 16H00')

    print("\n== Aperçu mobile / ordinateur ==")
    check("aperçu en mode Mobile par défaut", pg.get_attribute('[data-device=mobile]', 'aria-pressed') == 'true' and 'desktop' not in pg.get_attribute('#phone', 'class'))
    fs_mobile = pg.evaluate("parseFloat(getComputedStyle(document.querySelector('#preview .names')).fontSize)")
    pg.click('[data-device=desktop]'); time.sleep(0.4)
    geo = pg.evaluate("(()=>{const pv=document.getElementById('preview'),ph=document.getElementById('phone');return {w:pv.offsetWidth,zoom:parseFloat(getComputedStyle(pv).zoom),phone:ph.clientWidth,ratio:ph.getBoundingClientRect().width/ph.getBoundingClientRect().height}})()")
    check("mode Ordinateur : faire-part rendu en 1280 px puis réduit à la largeur de l'écran", geo['w'] == 1280 and abs(geo['zoom'] * 1280 - geo['phone']) < 2, geo)
    check("mode Ordinateur : écran au format paysage", 1.4 < geo['ratio'] < 1.8, geo['ratio'])
    fs_desk = pg.evaluate("parseFloat(getComputedStyle(document.querySelector('#preview .names')).fontSize)")
    check("mode Ordinateur : mise en page « grand écran » (prénoms plus grands)", fs_desk > fs_mobile, (fs_mobile, fs_desk))
    pg.click('#replay-intro'); time.sleep(0.3)
    ov = pg.evaluate("(()=>{const o=document.querySelector('#preview .fp-intro'),ph=document.getElementById('phone');return o?[o.getBoundingClientRect().height,ph.clientHeight]:null})()")
    check("mode Ordinateur : l'introduction couvre exactement l'écran de l'aperçu", ov and abs(ov[0] - ov[1]) < 3, ov)
    time.sleep(0.6); pg.screenshot(path=OUT + "/preview-desktop-intro.png")
    pg.keyboard.press('Escape'); wait_until(lambda: pg.locator('#preview .fp-intro').count() == 0, 5)
    pg.screenshot(path=OUT + "/preview-desktop.png")
    pg.reload(); time.sleep(0.4)
    check("format d'aperçu mémorisé", 'desktop' in pg.get_attribute('#phone', 'class'))
    pg.click('[data-device=mobile]'); time.sleep(0.3)
    check("retour au mode Mobile", pg.evaluate("getComputedStyle(document.getElementById('preview')).zoom") in ('1', 'normal') and 'desktop' not in pg.get_attribute('#phone', 'class'))
    if not pg.is_visible('fieldset[data-step="1"]'): pg.click('#back')
    pg.fill('[data-bind=date]', '2027-08-07')
    pg.press('[data-bind=partner2]', 'Enter'); check("Entrée passe à l'étape 2", pg.is_visible('fieldset[data-step="2"]'))
    check("focus sur le titre de l'étape", pg.evaluate("document.activeElement.tagName") == 'LEGEND')
    check("5 étapes, étape courante annoncée", pg.locator('#steps li').count() == 5 and pg.get_attribute('#steps li:nth-child(2)', 'aria-current') == 'step')
    pg.click('#next'); check("lieu manquant refusé", pg.inner_text('#step-msg') == 'Indiquez le nom du lieu.')
    pg.fill('[data-bind=venueName]', 'Domaine de l’Abbaye de Vauluisant'); pg.fill('[data-bind=venueAddress]', 'Lieu-dit Vauluisant\n89190 Courgenay')
    pg.fill('[data-bind=mapsUrl]', 'https://evil.example/phish'); pg.click('#next')
    check("lien Maps non reconnu refusé", 'pas reconnu' in pg.inner_text('#step-msg'))
    pg.fill('[data-bind=mapsUrl]', 'https://maps.app.goo.gl/YX6o64wnaQqDWDLp6')
    pg.reload()
    check("brouillon restauré après rechargement (même étape)", pg.input_value('[data-bind=venueName]').startswith('Domaine') and pg.is_visible('fieldset[data-step="2"]'))
    pg.click('#next')

    print("\n== Étape 3 : photos ==")
    pg.set_input_files('#photo-input', [TMP + '/bad.jpg', TMP + '/ok.jpg']); wait_count(pg, '#thumbs .thumb', 1); time.sleep(0.5)
    check("photo illisible signalée, la bonne ajoutée", pg.locator('#thumbs .thumb').count() == 1 and pg.inner_text('#photo-msg') != '')
    pg.set_input_files('#photo-input', [TMP + '/portrait.jpg', TMP + '/blue.jpg', TMP + '/ok.jpg']); wait_count(pg, '#thumbs .thumb', 3)
    check("plafond de 3 photos", pg.locator('#thumbs .thumb').count() == 3 and not pg.is_visible('#add-photo'))
    srcs = pg.evaluate("[...document.querySelectorAll('#thumbs img')].map(i=>i.src)")
    check("ordre choisi respecté", pg.evaluate("(s)=>new Promise(r=>{const i=new Image();i.onload=()=>r(i.height>i.width);i.src=s})", srcs[1]))
    pg.click('#thumbs .thumb:nth-child(2) .main-btn')
    check("choix de la photo principale", pg.evaluate("document.querySelector('#thumbs img').src") == srcs[1])
    pg.click('#thumbs .thumb:nth-child(3) button[aria-label^=Supprimer]')
    check("suppression d'une photo", pg.locator('#thumbs .thumb').count() == 2)

    print("\n== Étape 3 : style ==")
    check("9 ambiances, Champêtre sélectionnée par défaut", pg.locator('.preset').count() == 9 and pg.is_checked('input[name=preset][value=champetre]'))
    check("options avancées repliées par défaut", not pg.is_visible('#pick-theme'))
    pg.click('.preset:has(input[value=elegance])'); time.sleep(0.3)
    attrs = pg.evaluate("['data-theme','data-font','data-shape'].map(a=>document.getElementById('preview').getAttribute(a))")
    check("ambiance Élégance : nuit + haute couture + photo arrondie dans l'aperçu", attrs == ['nuit', 'bodoni', 'arrondi'], attrs)
    check("ambiance Élégance : cadre, dorure, sans texture", pg.evaluate("['data-decor','data-foil','data-texture'].map(a=>document.getElementById('preview').getAttribute(a))") == ['cadre', 'or', 'lisse']
          and pg.locator('#preview .hero-text .dc-frame').count() == 1 and pg.locator('#preview .dc-fc').count() == 4)
    check("dorure : prénoms peints en dégradé métallique", 'gradient' in pg.evaluate("getComputedStyle(document.querySelector('#preview .names')).backgroundImage")
          and pg.evaluate("getComputedStyle(document.querySelector('#preview .names')).webkitTextFillColor") == 'rgba(0, 0, 0, 0)')
    check("miniatures : chaque ambiance dessinée avec les prénoms du couple", pg.locator('.preset .fp-mini .mini-names').count() == 9
          and all('alexia' in t.lower() for t in pg.locator('.preset .mini-names').all_inner_texts()))
    check("miniature Gatsby : palette, police, éventail art déco", pg.evaluate("(()=>{const m=document.querySelector('[data-mini=\"preset:gatsby\"]');return [m.dataset.theme,m.dataset.font,m.dataset.decor,!!m.querySelector('.dc-deco')]})()") == ['noir', 'artdeco', 'artdeco', True])
    check("dégradés des ornements dorés : identifiants uniques", pg.evaluate("(()=>{const ids=[...document.querySelectorAll('linearGradient')].map(g=>g.id);return ids.length>0&&new Set(ids).size===ids.length})()"))
    check("changer d'intro joue l'intro dans l'aperçu (monogramme)", pg.locator('#preview .fp-intro-monogramme').count() == 1)
    check("contenu de l'aperçu inerte pendant l'intro", pg.evaluate("document.querySelector('#preview .fp-content').inert") is True)
    check("intro du monogramme se ferme seule", wait_until(lambda: pg.locator('#preview .fp-intro').count() == 0, 6))
    check("défilement de l'aperçu rétabli après l'intro", not pg.evaluate("document.getElementById('phone').classList.contains('fp-locked')"))
    pg.click('#style-more summary')
    check("12 palettes, 8 polices, 5 ornements, 4 finitions, 3 intros, 3 formes", [pg.locator('[name=%s]' % n).count() for n in ['style-theme', 'style-font', 'style-decor', 'style-foil', 'style-intro', 'style-shape']] == [12, 8, 5, 4, 3, 3])
    check("onglets : « Couleurs » ouvert, les autres masqués", pg.is_visible('#pick-theme') and not pg.is_visible('#pick-font') and pg.get_attribute('#tab-colors', 'aria-selected') == 'true')
    pg.focus('#tab-colors'); pg.keyboard.press('ArrowRight')
    check("onglets au clavier (flèche droite)", pg.get_attribute('#tab-font', 'aria-selected') == 'true' and pg.is_visible('#pick-font') and pg.evaluate("document.activeElement.id") == 'tab-font')
    pg.click('#tab-colors')
    pg.click('.swatch-card:has(input[name=style-theme][value=bordeaux])'); time.sleep(0.3)
    check("palette Bordeaux appliquée, ambiance devenue personnalisée", pg.get_attribute('#preview', 'data-theme') == 'bordeaux'
          and pg.locator('input[name=preset]:checked').count() == 0)
    pg.click('#tab-decor'); pg.click('.decor-card:has(input[name=style-decor][value=botanique])'); time.sleep(0.3)
    check("ornement botanique : deux branches dans les coins", pg.get_attribute('#preview', 'data-decor') == 'botanique' and pg.locator('#preview .dc-corner').count() == 2)
    check("miniatures d'ornements aux couleurs choisies", pg.locator('[data-mini^="decor:"][data-theme=bordeaux]').count() == 5)
    pg.click('#tab-finish'); pg.click('.foil-card:has(input[name=style-foil][value=orrose])'); pg.check('[data-bind-bool=texture]'); time.sleep(0.3)
    check("finitions : or rose et papier texturé", pg.get_attribute('#preview', 'data-foil') == 'orrose' and pg.get_attribute('#preview', 'data-texture') == 'papier'
          and 'svg' in pg.evaluate("getComputedStyle(document.getElementById('preview')).backgroundImage"))
    check("forme de la photo : sous les photos, illustrée avec la photo principale", pg.is_visible('#shape-field') and pg.locator('#shape-field .shape-card').count() == 3
          and pg.evaluate("document.querySelector('.shape-demo img').src.startsWith('data:image/')"))
    pg.click('.shape-card:has(input[name=style-shape][value=arche])'); time.sleep(0.3)
    check("forme arche appliquée à la photo", pg.get_attribute('#preview', 'data-shape') == 'arche'
          and pg.evaluate("getComputedStyle(document.querySelector('#preview .hero-photo-wrap')).borderTopLeftRadius").startswith('999'))
    pg.click('#tab-font'); pg.click('.font-card:has(input[name=style-font][value=romantique])'); time.sleep(0.3)
    check("police romantique : prénoms en Great Vibes", 'Great Vibes' in pg.evaluate("getComputedStyle(document.querySelector('#preview .names')).fontFamily"))
    check("polices chargées depuis Google Fonts uniquement à l'étape Style", pg.evaluate("[...document.querySelectorAll('link[rel=stylesheet]')].filter(l=>l.href.includes('Great+Vibes')).length") >= 1)
    pg.click('#tab-intro')
    check("onglet Introduction : uniquement l'introduction, avec une démonstration de chaque choix", pg.locator('#panel-intro .intro-card').count() == 3
          and pg.locator('#panel-intro [name=style-shape], #panel-intro [data-bind-bool]').count() == 0 and pg.locator('#panel-intro .id-env').count() == 1 and pg.locator('#panel-intro .id-mono').count() == 1)
    pg.click('.intro-card:has(input[name=style-intro][value=enveloppe])'); time.sleep(0.2)
    check("choisir l'enveloppe la montre dans l'aperçu", pg.locator('#preview .fp-intro-enveloppe').count() == 1)
    pg.click('#preview .env', force=True)
    check("l'enveloppe s'ouvre au clic puis disparaît", wait_until(lambda: pg.locator('#preview .fp-intro').count() == 0, 5))
    check("bouton « Revoir l'introduction » visible", pg.is_visible('#replay-intro'))
    pg.click('#replay-intro'); check("« Revoir l'introduction » rejoue l'enveloppe", pg.locator('#preview .fp-intro-enveloppe').count() == 1)
    pg.keyboard.press('Escape'); check("Échap ouvre l'enveloppe", wait_until(lambda: pg.locator('#preview .fp-intro').count() == 0, 5))
    pg.click('.intro-card:has(input[name=style-intro][value=aucune])'); time.sleep(0.2)
    check("intro « Aucune » : pas d'intro, bouton revoir masqué", pg.locator('#preview .fp-intro').count() == 0 and not pg.is_visible('#replay-intro'))
    pg.click('.preset:has(input[value=romantique])'); time.sleep(0.3)
    check("revenir à une ambiance rétablit sa cohérence", pg.evaluate("['data-theme','data-font','data-shape'].map(a=>document.getElementById('preview').getAttribute(a))") == ['rose', 'romantique', 'arche'])
    pg.keyboard.press('Escape'); wait_until(lambda: pg.locator('#preview .fp-intro').count() == 0, 5)
    pg.screenshot(path=OUT + "/step3-style.png")
    pg.click('#next')

    print("\n== Étape 4 : sections ==")
    check("aucune section active par défaut", pg.locator('[data-section-toggle]:checked').count() == 0)
    check("compte à rebours : dans les sections, activé par défaut", pg.is_visible('.sections [data-bind-bool=countdown]') and pg.is_checked('[data-bind-bool=countdown]'))
    pg.uncheck('[data-bind-bool=countdown]'); time.sleep(0.3)
    check("compte à rebours désactivable", pg.locator('#preview .countdown').count() == 0)
    pg.check('[data-bind-bool=countdown]'); time.sleep(0.3)
    pg.check('[data-section-toggle=program]'); time.sleep(0.3)
    times = pg.evaluate("[...document.querySelectorAll('#program-items input[type=time]')].map(i=>i.value)")
    check("programme pré-rempli à partir de l'heure de la cérémonie", times == ['16:00', '17:30', '20:00', '23:00'], times)
    check("programme affiché en frise dans l'aperçu", pg.locator('#preview .timeline li').count() == 4)
    pg.click('#program-add'); pg.fill('#program-items .prog-row:nth-child(5) input[type=text]', 'Brunch ' + XSS)
    pg.press('#program-items .prog-row:nth-child(5) input[type=text]', 'Enter')
    check("Entrée dans le programme ne change pas d'étape", pg.is_visible('fieldset[data-step="4"]'))
    pg.click('#program-items .prog-row:nth-child(1) .icon-btn'); time.sleep(0.3)
    check("ajout/suppression d'étapes du programme", pg.locator('#preview .timeline li').count() == 4 and pg.locator('#preview .timeline img').count() == 0)
    pg.check('[data-section-toggle=story]'); time.sleep(0.3)
    check("« Notre histoire » vide : texte d'exemple dans l'aperçu seulement", 'Votre texte apparaîtra ici' in pg.inner_text('#preview .sec-story'))
    pg.fill('[data-sec="story.text"]', 'Rencontrés à Lyon en 2019.\n\nLa demande à Lisbonne.')
    for s in ['dress', 'lodging', 'practical', 'gifts']: pg.check('[data-section-toggle=%s]' % s)
    check("sections pré-remplies (dress code, hébergement, infos, liste)", all(pg.input_value('[data-sec="%s.text"]' % s) for s in ['dress', 'lodging', 'practical', 'gifts']))
    pg.fill('[data-sec="lodging.url"]', 'javascript:alert(1)'); pg.click('#next')
    check("lien d'hébergement invalide refusé", 'hébergements' in pg.inner_text('#step-msg'))
    pg.fill('[data-sec="lodging.url"]', ''); pg.fill('[data-sec="gifts.url"]', 'https://www.leetchi.com/c/mariage-alexia-julien'); time.sleep(0.3)
    check("bouton cagnotte avec le domaine affiché", 'leetchi.com' in pg.inner_text('#preview .sec-gifts .maps-btn'))
    pg.uncheck('[data-section-toggle=practical]'); time.sleep(0.3)
    check("désactiver une section la retire", pg.locator('#preview .sec-practical').count() == 0)
    order = pg.evaluate("[...document.querySelectorAll('#preview section')].map(s=>s.className.split(' ')[0].replace('sec-',''))")
    check("ordre des sections", order == ['message', 'story', 'program', 'lieu', 'dress', 'lodging', 'gifts', 'rsvp'], order)
    alts = pg.evaluate("[...document.querySelectorAll('#preview section')].map(s=>s.classList.contains('alt'))")
    check("fonds alternés", all(alts[i] != alts[i + 1] for i in range(len(alts) - 1)))
    pg.screenshot(path=OUT + "/step4-sections.png")
    pg.click('#next')

    print("\n== Étape 5 : réponses ==")
    check("« accompagnants » activable (nombre de personnes coché par défaut)", pg.is_enabled('[data-bind-rsvp=companions]'))
    pg.uncheck('[data-bind-rsvp=guests]')
    check("« accompagnants » grisé sans nombre de personnes ni enfants", not pg.is_enabled('[data-bind-rsvp=companions]'))
    pg.check('[data-bind-rsvp=guests]')
    for k in ['children', 'companions', 'brunch', 'email', 'phone', 'address']: pg.check('[data-bind-rsvp=%s]' % k)
    pg.fill('[data-bind-rsvp-text=customLabel]', 'Une chanson pour la soirée ? ' + XSS)
    pg.fill('[data-bind-rsvp-text=deadline]', '2027-09-01'); pg.click('#publish')
    check("date limite après le mariage refusée", 'précéder' in pg.inner_text('#step-msg'))
    pg.fill('[data-bind-rsvp-text=deadline]', '2020-01-01'); pg.click('#publish')
    check("date limite passée refusée", 'passée' in pg.inner_text('#step-msg'))
    pg.fill('[data-bind-rsvp-text=deadline]', '2027-06-01'); time.sleep(0.3)
    check("aperçu : adultes + enfants, email, téléphone, adresse, question perso", all(pg.locator('#preview ' + s).count() == 1 for s in ['#f-guests', '#f-children', '#f-email', '#f-phone', '#f-address', '#f-custom']))
    check("aperçu : question perso échappée", pg.locator('#preview label[for=f-custom] img').count() == 0 and pg.evaluate("window.__xss") is None)
    check("aperçu : date limite affichée", 'avant le 1er juin 2027' in pg.inner_text('#preview .deadline'))
    check("mention de confidentialité adaptée aux coordonnées", 'coordonnées' in pg.inner_text('#preview .privacy'))
    check("bouton final : « Terminer »", pg.inner_text('#publish') == 'Terminer')
    pg.click('#publish'); pg.wait_for_selector('#auth-step:not([hidden])')
    check("publier sans compte : la connexion s'ouvre, rien n'est publié, le brouillon est gardé", not pg.is_visible('#wizard') and not pg.is_visible('#done')
          and db_get(pg)['inv'] == {} and pg.evaluate("localStorage.getItem('fp:draft')") is not None and 'compte' in pg.inner_text('#auth-box h2'))
    pg.click('#auth-back')
    check("connexion : « Revenir à mon faire-part » rouvre l'éditeur à la même étape", pg.is_visible('#wizard') and pg.is_visible('#publish') and not pg.is_visible('#auth-step'))
    pg.click('#publish'); pg.wait_for_selector('#auth-step:not([hidden])')
    pg.fill('#auth-email', 'pas-un-email'); pg.click('.auth-form:not([hidden]) button[type=submit]')
    check("connexion : adresse email invalide refusée", 'valide' in pg.inner_text('#auth-box .form-msg') and not pg.is_visible('#auth-code'))
    pg.fill('#auth-email', 'alexia@example.com'); pg.click('.auth-form:not([hidden]) button[type=submit]'); pg.wait_for_selector('#auth-code')
    check("connexion : code envoyé à l'adresse indiquée", 'alexia@example.com' in pg.inner_text('.auth-sent'))
    pg.screenshot(path=OUT + "/auth.png", full_page=True)
    pg.fill('#auth-code', '000000'); pg.click('.auth-form:not([hidden]) button[type=submit]'); time.sleep(0.3)
    check("connexion : mauvais code refusé, toujours rien de publié", 'incorrect' in pg.inner_text('#auth-box .form-msg') and db_get(pg)['inv'] == {}
          and pg.evaluate("localStorage.getItem('fp:session')") is None)
    pg.fill('#auth-code', '123 456'); pg.click('.auth-form:not([hidden]) button[type=submit]'); pg.wait_for_selector('#done:not([hidden])')
    check("connexion réussie : le faire-part est publié dans la foulée", pg.is_visible('#done') and not pg.is_visible('#auth-step'))
    pub = pg.input_value('#public-link')
    check("fin : rappel du compte, bouton vers les réponses, plus aucun lien privé", 'alexia@example.com' in pg.inner_text('#done-note')
          and pg.inner_text('#go-mine') == 'Voir les réponses de mes invités' and pg.get_attribute('#go-mine', 'href') == 'admin.html'
          and pg.locator('#private-card, #private-link, #mail-link').count() == 0 and '#k=' not in pg.content())
    pg.screenshot(path=OUT + "/done.png", full_page=True)
    slug = pub.split('f=')[1]; adm = BASE + '/admin.html'
    check("publication : lien public non devinable, rattaché au compte", re.fullmatch(r'alexia-julien-[a-z0-9]{8}', slug) is not None
          and db_get(pg)['inv'][slug]['owner'] == uid('alexia@example.com') and 'key' not in db_get(pg)['inv'][slug])
    stored = db_get(pg)['inv'][slug]['config']
    check("config publiée : style, sections, RSVP, fuseau", stored['theme'] == 'rose' and stored['font'] == 'romantique' and stored['intro'] == 'enveloppe'
          and stored['sections']['program']['on'] and len(stored['sections']['program']['items']) == 4 and stored['rsvp']['email'] and stored['tz'] == 'Europe/Paris')
    check("étapes vides du programme non publiées", all(it['label'].strip() for it in stored['sections']['program']['items']))
    check("brouillon effacé après publication", pg.evaluate("localStorage.getItem('fp:draft')") is None)

    print("\n== Page publique : intro et contenu ==")
    g = watch(c.new_page(), "pub"); g.goto(pub); g.wait_for_selector('.fp-intro-enveloppe')
    check("enveloppe affichée à l'ouverture", g.is_visible('.env'))
    check("page verrouillée et contenu inerte pendant l'intro", g.evaluate("document.documentElement.classList.contains('fp-locked') && document.querySelector('.fp-content').inert"))
    check("enveloppe accessible au clavier (bouton nommé)", g.get_attribute('.env', 'aria-label') == 'Ouvrir l’invitation')
    g.screenshot(path=OUT + "/public-envelope.png")
    g.click('.env', force=True); time.sleep(1.2); g.screenshot(path=OUT + "/public-envelope-open.png")
    check("après ouverture : intro retirée, page déverrouillée", wait_until(lambda: g.locator('.fp-intro').count() == 0, 5)
          and not g.evaluate("document.documentElement.classList.contains('fp-locked')") and not g.evaluate("document.querySelector('.fp-content').inert"))
    check("fond de page assorti à la palette", g.evaluate("getComputedStyle(document.body).backgroundColor") == 'rgb(250, 243, 240)')
    check("seule la police choisie est téléchargée", g.evaluate("[...document.querySelectorAll('link[rel=stylesheet]')].filter(l=>l.href.includes('fonts.googleapis')).length") == 1)
    check("programme : 4 étapes, libellé piégé affiché en texte", g.locator('.timeline li').count() == 4 and g.locator('.timeline img').count() == 0 and g.evaluate("window.__xss") is None)
    check("notre histoire en 2 paragraphes", g.locator('.sec-story .narrow p').count() == 2)
    check("cagnotte : lien sûr ouvert dans un nouvel onglet", g.get_attribute('.sec-gifts .maps-btn', 'rel') == 'noopener nofollow' and g.get_attribute('.sec-gifts .maps-btn', 'target') == '_blank')
    check("hébergement sans lien : pas de bouton", g.locator('.sec-lodging .maps-btn').count() == 0)
    g.check('input[name=attendance][value=yes]')
    check("accompagnants masqués pour une personne seule", not g.is_visible('#f-companions'))
    g.fill('#f-guests', '2'); check("accompagnants affichés dès 2 personnes", g.is_visible('#f-companions'))
    g.fill('#f-guests', '1'); g.fill('#f-children', '2'); check("accompagnants affichés avec des enfants", g.is_visible('#f-companions'))
    g.check('input[name=attendance][value=no]')
    check("« absent » masque adultes, enfants, accompagnants, brunch, régime", not any(g.is_visible(s) for s in ['#f-guests', '#f-children', '#f-companions', 'input[name=brunch]']))
    check("« absent » garde les coordonnées et la question perso", all(g.is_visible(s) for s in ['#f-email', '#f-phone', '#f-custom']))
    g.check('input[name=attendance][value=yes]')
    g.fill('#f-name', 'Marie Dupont'); g.fill('#f-email', 'marie@'); g.click('.rsvp-form button[type=submit]')
    check("email invalide signalé avant l'envoi", 'email' in g.inner_text('.form-msg'))
    g.fill('#f-email', 'a@b.c<script>'); g.click('.rsvp-form button[type=submit]')
    check("email piégé refusé", 'email' in g.inner_text('.form-msg'))
    g.fill('#f-email', 'marie.dupont@example.fr'); g.fill('#f-phone', 'abc'); g.click('.rsvp-form button[type=submit]')
    check("téléphone invalide signalé", 'téléphone' in g.inner_text('.form-msg'))
    g.fill('#f-phone', '06 12 34 56 78'); g.fill('#f-guests', '2'); g.fill('#f-children', '1')
    g.fill('#f-companions', 'Paul Dupont, Léo (6 ans)'); g.check('input[name=brunch][value=yes]'); g.fill('#f-diet', 'Sans gluten')
    g.fill('#f-address', '12 rue des Lilas\n69003 Lyon'); g.fill('#f-custom', 'Dancing Queen'); g.fill('#f-msg', '=HYPERLINK("x")')
    g.click('.rsvp-form button[type=submit]'); g.wait_for_selector('.thanks')
    check("réponse complète envoyée", 'Merci Marie' in g.inner_text('.thanks'))
    saved = db_get(g)['rsvps'][slug][-1]['data']
    check("toutes les données collectées", saved['children'] == 1 and saved['email'] == 'marie.dupont@example.fr' and 'Lyon' in saved['address']
          and saved['custom'] == 'Dancing Queen' and saved['companions'].startswith('Paul'), saved)
    g.reload(); g.wait_for_selector('.fp-intro'); g.keyboard.press('Escape'); wait_until(lambda: g.locator('.fp-intro').count() == 0)
    check("au retour : prévenu d'une réponse déjà envoyée", 'déjà répondu (Marie Dupont)' in g.inner_text('.fp'))
    g.fill('#f-name', 'Marie Dupont'); g.check('input[name=attendance][value=no]'); g.fill('#f-email', 'marie.dupont@example.fr')
    g.click('.rsvp-form button[type=submit]'); g.wait_for_selector('.thanks')
    # autres invités, saisis directement
    db = db_get(g)
    db['rsvps'][slug] += [
        {"id": 100, "created_at": "2026-10-21T08:00:00Z", "data": {"name": "Zoé Bernard", "attendance": "yes", "guests": 1, "children": 0, "diet": "Végétarienne", "email": "zoe@example.com", "brunch": "no"}},
        {"id": 101, "created_at": "2026-10-21T09:00:00Z", "data": {"name": "Antoine Leroy", "attendance": "yes", "guests": 2, "children": 2, "companions": "Claire, Hugo, Lina", "email": "antoine@example.com", "brunch": "yes"}},
        {"id": 102, "created_at": "2026-10-21T10:00:00Z", "data": {"name": "Hacker " + XSS, "attendance": "yes", "guests": "<b>", "children": "x", "email": XSS, "diet": XSS}},
    ]
    db_put(g, db)

    print("\n== Page de suivi ==")
    a = watch(c.new_page(), "adm"); a.goto(adm); a.wait_for_selector('#content:not([hidden])')
    check("titre et rappel de la date limite", a.inner_text('#admin-title') == 'Réponses — Alexia & Julien' and '1er juin 2027' in a.inner_text('#admin-sub'), a.inner_text('#admin-sub'))
    tiles = a.inner_text('#tiles').replace('\n', ' | ')
    check("tuiles : 4 réponses (doublon écarté), adultes et enfants", tiles.startswith('4 | réponses') and '6 | personnes présentes (4 adultes, 2 enfants)' in tiles, tiles)
    check("tuiles : 1 absente, brunch compté avec les enfants", '1 | ne viendra pas' in tiles and '4 | au brunch' in tiles, tiles)
    check("régimes pour le traiteur (présents uniquement)", a.locator('#diet-list li').count() == 2 and 'Végétarienne' in a.inner_text('#diet-list'))
    check("données piégées affichées en texte", a.evaluate("window.__xss") is None and a.locator('tbody img, tbody script, #diet-list img').count() == 0)
    heads = a.evaluate("[...document.querySelectorAll('thead th')].map(t=>t.textContent.trim())")
    check("colonnes = questions posées (adultes, enfants, accompagnants, email, téléphone, adresse, question perso)",
          all(h in heads for h in ['Adultes', 'Enfants', 'Accompagnants', 'Email', 'Téléphone', 'Adresse']) and any(h.startswith('Une chanson') for h in heads), heads)
    check("question perso échappée dans l'en-tête", a.locator('thead img').count() == 0)
    a.click('[data-filter=no]'); check("filtre « Absents »", a.locator('tbody tr').count() == 1 and 'Marie' in a.inner_text('tbody'))
    a.click('[data-filter=yes]'); check("filtre « Présents »", a.locator('tbody tr').count() == 4)
    a.click('[data-filter=all]'); a.fill('#search', 'leroy'); time.sleep(0.2)
    check("recherche par nom (sans accents ni majuscules)", a.locator('tbody tr').count() == 1 and 'Antoine' in a.inner_text('tbody'))
    a.fill('#search', 'hugo'); time.sleep(0.2); check("recherche dans les accompagnants", a.locator('tbody tr').count() == 1)
    a.fill('#search', 'zzzz'); time.sleep(0.2); check("aucun résultat : message clair", a.is_visible('#no-match') and not a.is_visible('#table-wrap'))
    a.fill('#search', ''); time.sleep(0.2)
    a.click('th:has-text("Nom") .sort'); names = a.evaluate("[...document.querySelectorAll('tbody tr td:nth-child(1)')].map(t=>t.textContent)")
    check("tri par nom (A→Z)", names[0].startswith('Antoine') and names[-1].startswith('Zoé'), names)
    check("tri annoncé (aria-sort)", a.get_attribute('th:has-text("Nom")', 'aria-sort') == 'ascending')
    a.click('th:has-text("Nom") .sort'); check("tri inversé", a.evaluate("document.querySelector('tbody tr td:nth-child(1)').textContent").startswith('Zoé'))
    a.click('#copy-emails'); time.sleep(0.3)
    clip = a.evaluate("navigator.clipboard.readText()")
    check("copie des emails : valides, sans doublon, réponses en vigueur", clip == 'marie.dupont@example.fr, zoe@example.com, antoine@example.com' and '3 adresses copiées' in a.inner_text('#action-msg'), clip)
    check("bouton de copie indique le nombre d'emails", a.inner_text('#copy-emails') == 'Copier les 3 emails')
    with a.expect_download() as dl: a.click('#csv')
    csv = open(dl.value.path(), encoding='utf-8-sig', newline='').read()
    check("CSV : toutes les colonnes + formule neutralisée", all(h in csv.split('\r\n')[0] for h in ['Adultes', 'Enfants', 'Email', 'Adresse', 'Remplacée']) and '"\'=HYPERLINK' in csv)
    check("CSV : adresse multi-ligne conservée dans sa cellule", '"12 rue des Lilas\n69003 Lyon"' in csv)
    n0 = a.locator('tbody tr').count()
    a.click('tbody tr:has-text("Hacker") .link-btn'); a.click('tbody tr:has-text("Hacker") .link-btn'); wait_count(a, 'tbody tr', n0 - 1)
    check("suppression d'une réponse (2 clics)", a.locator('tbody tr').count() == n0 - 1)
    check("nom en première colonne, fixé au défilement horizontal", a.evaluate("getComputedStyle(document.querySelector('tbody td')).position") == 'sticky')
    check("bouton Supprimer sur une seule ligne", a.evaluate("(()=>{const b=document.querySelector('tbody .act .link-btn');return b.getBoundingClientRect().height<30})()"))
    check("en-tête de question longue tronqué avec infobulle", a.evaluate("(()=>{const t=[...document.querySelectorAll('thead th')].find(x=>x.title.startsWith('Une chanson'));return t.getBoundingClientRect().width<=13*16+40})()"))
    check("noms et emails non coupés au milieu (ordinateur)", a.evaluate("[...document.querySelectorAll('tbody td.sticky')].every(td=>{const r=document.createRange();r.selectNodeContents(td.firstChild);return new Set([...r.getClientRects()].map(x=>Math.round(x.top))).size===1})"))
    a.evaluate("document.getElementById('table-wrap').scrollLeft=0")
    a.screenshot(path=OUT + "/admin-desktop.png", full_page=True)
    am = watch(newctx(b, viewport={"width": 375, "height": 800}, is_mobile=True, has_touch=True).new_page(), "adm-mob")
    am.goto(BASE + "/robots.txt"); db_put(am, db_get(a)); sign_in(am); am.goto(adm); am.wait_for_selector('#content:not([hidden])')
    check("suivi mobile : réponses en cartes, sans défilement horizontal",
          am.evaluate("getComputedStyle(document.querySelector('tbody tr')).display") == 'block' and am.evaluate("document.documentElement.scrollWidth <= innerWidth"))
    check("suivi mobile : chaque valeur étiquetée", am.evaluate("getComputedStyle(document.querySelector('tbody td'),'::before').content").strip('"') == 'Nom')
    am.screenshot(path=OUT + "/admin-mobile.png", full_page=True)
    bad = watch(newctx(b, viewport={"width": 1100, "height": 800}).new_page(), "bad"); bad.goto(BASE + "/robots.txt"); db_put(bad, db_get(a))
    bad.goto(adm); bad.wait_for_selector('#signin:not([hidden])')
    check("suivi sans session : connexion demandée, aucune donnée affichée", not bad.is_visible('#detail') and bad.is_visible('#auth-email') and 'Zoé' not in bad.content())
    sign_in(bad, 'curieux@example.com'); bad.goto(adm); bad.wait_for_selector('#none:not([hidden])')
    check("suivi avec un autre compte : rien du faire-part d'autrui", not bad.is_visible('#content') and bad.locator('tbody tr').count() == 0 and 'Alexia' not in bad.inner_text('main'))

    print("\n== Modification ==")
    e = watch(c.new_page(), "edit"); e.goto(BASE + "/creer.html"); wait_until(lambda: e.inner_text('#title') == 'Modifier mon faire-part' and e.is_visible('#wizard'))
    check("compte avec un faire-part : l'éditeur l'ouvre en modification", e.inner_text('#publish') == 'Enregistrer les modifications' and not e.is_visible('#draft-note'))
    check("modification : tout est pré-rempli", e.input_value('[data-bind=partner1]') == 'Alexia' and e.locator('#thumbs .thumb').count() == 2)
    e.click('#next'); e.click('#next')
    check("modification : style conservé", e.is_checked('input[name=preset][value=romantique]'))
    e.click('#next')
    check("modification : sections conservées", e.is_checked('[data-section-toggle=gifts]') and e.locator('#program-items .prog-row').count() == 4)
    e.fill('[data-sec="dress.text"]', 'Tenue de soirée.'); e.click('#next')
    check("modification : questions conservées", e.is_checked('[data-bind-rsvp=address]') and e.input_value('[data-bind-rsvp-text=deadline]') == '2027-06-01')
    e.click('#publish'); e.wait_for_selector('#done:not([hidden])')
    g.goto(pub); g.wait_for_selector('.fp-intro'); g.keyboard.press('Escape'); wait_until(lambda: g.locator('.fp-intro').count() == 0)
    check("modification visible sur la page publique", 'Tenue de soirée.' in g.inner_text('.sec-dress'))

    print("\n== Intros : monogramme, aucune, anciens faire-part, mouvement réduit ==")
    db = db_get(pg)
    base_cfg = {"partner1": "Léa", "partner2": "Tom", "date": "2027-07-10", "venueName": "Château"}
    db['inv']['mono-0001'] = {"key": "k" * 24, "config": dict(base_cfg, intro="monogramme", theme="noir", font="minimal")}
    db['inv']['none-0001'] = {"key": "k" * 24, "config": dict(base_cfg, intro="aucune")}
    db['inv']['legacy-0001'] = {"key": "k" * 24, "config": dict(base_cfg, theme="sauge", practical="Parking sur place.")}
    for s in ['mono-0001', 'none-0001', 'legacy-0001']: db['rsvps'][s] = []
    db_put(pg, db)
    m = watch(c.new_page(), "mono"); m.goto(BASE + "/invitation.html?f=mono-0001"); m.wait_for_selector('.fp-intro-monogramme')
    check("monogramme : initiales L & T", m.inner_text('.mono-letters').replace('\n', '').replace(' ', '') == 'L&T', m.inner_text('.mono-letters'))
    m.screenshot(path=OUT + "/public-monogram.png")
    check("monogramme : s'efface seul", wait_until(lambda: m.locator('.fp-intro').count() == 0, 6))
    check("noir & or + minimaliste : prénoms en capitales", m.evaluate("getComputedStyle(document.querySelector('.names')).textTransform") == 'uppercase')
    n = watch(c.new_page(), "none"); n.goto(BASE + "/invitation.html?f=none-0001"); n.wait_for_selector('.rsvp-form')
    check("intro « aucune » : faire-part direct", n.locator('.fp-intro').count() == 0)
    l = watch(c.new_page(), "legacy"); l.goto(BASE + "/invitation.html?f=legacy-0001"); l.wait_for_selector('.rsvp-form')
    check("ancien faire-part : pas d'intro imposée, infos pratiques reprises", l.locator('.fp-intro').count() == 0 and 'Parking sur place.' in l.inner_text('.sec-practical'))
    check("ancien faire-part : rendu inchangé (épuré, encre, sans texture)", l.evaluate("['data-decor','data-foil','data-texture'].map(a=>document.querySelector('.fp').getAttribute(a))") == ['aucun', 'aucune', 'lisse']
          and l.locator('.dc-top, .dc-corner, .dc-frame').count() == 0)
    rm = watch(newctx(b, reduced_motion="reduce").new_page(), "reduced")
    rm.goto(BASE + "/creer.html"); db_put(rm, db_get(pg)); rm.goto(pub); rm.wait_for_selector('.fp-intro')
    rm.click('.env'); check("mouvement réduit : ouverture quasi immédiate", wait_until(lambda: rm.locator('.fp-intro').count() == 0, 1.5))

    print("\n== Sécurité : config forgée (nouveaux champs) ==")
    forged = {"partner1": XSS, "partner2": {"x": 1}, "date": "2027-08-07", "venueName": XSS, "intro": "x\"><script>", "font": "../../evil",
              "theme": "x", "photoShape": "<b>", "countdown": "yes", "tz": "../../etc", "decor": "<svg onload=alert(1)>", "foil": "url(javascript:x)", "texture": "true",
              "sections": {"story": {"on": True, "text": XSS}, "program": {"on": True, "items": [{"time": "<b>", "label": XSS}] + [{"time": "10:00", "label": "x"}] * 40 + ["str", None]},
                           "lodging": {"on": True, "text": "t", "url": "javascript:alert(1)"}, "gifts": {"on": True, "text": "t", "url": "https://user:pw@evil.com/"},
                           "dress": {"on": "true", "text": "ne doit pas s'afficher"}, "__proto__": {"polluted": 1}},
              "rsvp": {"customLabel": XSS, "deadline": "2027-13-45", "email": "yes"}, "photos": ["javascript:alert(1)"]}
    db = db_get(pg); db['inv']['forge-0002'] = {"key": "z" * 24, "config": forged}; db['rsvps']['forge-0002'] = []; db_put(pg, db)
    f = watch(c.new_page(), "forged"); f.goto(BASE + "/invitation.html?f=forge-0002"); f.wait_for_selector('.rsvp-form')
    check("forgée : aucun script exécuté, aucune balise injectée", f.evaluate("window.__xss") is None and f.locator('.fp img, .fp script, .fp b').count() == 0)
    check("forgée : intro, police, palette, forme invalides → valeurs sûres (enveloppe par défaut)",
          f.evaluate("[...['data-theme','data-font','data-shape']].map(a=>document.getElementById('root').getAttribute(a))") == ['sauge', 'classique', 'arrondi'] and f.locator('.fp-intro-enveloppe').count() == 1)
    check("forgée : ornement, dorure, texture invalides → épuré, encre, lisse", f.evaluate("['data-decor','data-foil','data-texture'].map(a=>document.querySelector('.fp').getAttribute(a))") == ['aucun', 'aucune', 'lisse'])
    check("forgée : programme plafonné à 8 étapes, entrées invalides ignorées", f.locator('.timeline li').count() == 8)
    check("forgée : lien javascript: et lien avec identifiants refusés", f.locator('.sec-lodging .maps-btn, .sec-gifts .maps-btn').count() == 0)
    check("forgée : section activée par une chaîne « true » ignorée", f.locator('.sec-dress').count() == 0)
    check("forgée : date limite impossible ignorée, email non demandé (« yes » ≠ true)", f.locator('.deadline').count() == 0 and f.locator('#f-email').count() == 0)
    check("forgée : pas de pollution de prototype", f.evaluate("({}).polluted") is None)
    fr = c.new_page(); fr.goto(BASE + "/robots.txt")
    fr.set_content("<iframe id=i src='%s/admin.html'></iframe>" % BASE); time.sleep(1)
    check("suivi dans une iframe : page vidée (anti-clickjacking)", fr.frame_locator('#i').locator('body').inner_text().strip() == '')

    print("\n== Comptes ==")
    seed = db_get(pg)
    def fresh(tag, **kw):
        x = watch(newctx(b, viewport=kw.pop('viewport', {"width": 1100, "height": 850}), **kw).new_page(), tag); x.goto(BASE + "/robots.txt"); db_put(x, seed); return x
    d2 = fresh("device2"); d2.goto(adm); d2.wait_for_selector('#signin:not([hidden])')
    code_login(d2); d2.wait_for_selector('#content:not([hidden])')
    check("autre appareil : on retrouve son faire-part et ses réponses en se connectant", d2.inner_text('#admin-title') == 'Réponses — Alexia & Julien'
          and d2.locator('tbody tr').count() > 0 and d2.input_value('#public-link') == pub and 'alexia@example.com' in d2.inner_text('#account-email'))
    d2.goto(BASE + "/"); d2.wait_for_selector('#demo .fp-intro')
    check("accueil connecté : lien « Mon faire-part »", d2.inner_text('#nav-mine') == 'Mon faire-part' and d2.is_visible('#back-home'))
    d2.goto(adm); d2.wait_for_selector('#content:not([hidden])'); d2.click('#signout'); d2.wait_for_selector('#demo .fp-intro')
    check("déconnexion : retour à l'accueil, session effacée", d2.evaluate("localStorage.getItem('fp:session')") is None and d2.inner_text('#nav-mine') == 'Se connecter')
    d2.goto(adm); d2.wait_for_selector('#signin:not([hidden])')
    check("après déconnexion, le suivi redemande la connexion", not d2.is_visible('#detail'))

    o = fresh("one"); o.goto(BASE + "/creer.html"); fill_basics(o, 'Second', 'Essai', '2027-10-02', 'Ailleurs')
    while o.is_visible('#next'): o.click('#next'); time.sleep(0.12)
    o.click('#publish'); o.wait_for_selector('#auth-step:not([hidden])'); code_login(o)
    wait_until(lambda: o.inner_text('#title') == 'Modifier mon faire-part' and o.is_visible('#notice'))
    check("un seul faire-part par compte : le brouillon n'est pas publié, le faire-part existant s'ouvre", len(db_get(o)['inv']) == len(seed['inv'])
          and o.input_value('[data-bind=partner1]') == 'Alexia' and 'déjà un faire-part' in o.inner_text('#notice') and not o.is_visible('#done'))
    o.goto(BASE + "/creer.html#p1=Autre&p2=Couple&s=chateau"); wait_until(lambda: o.inner_text('#title') == 'Modifier mon faire-part' and o.is_visible('#wizard'))
    check("un seul faire-part par compte : le lien d'accueil ne crée pas de second faire-part", o.input_value('[data-bind=partner1]') == 'Alexia' and len(db_get(o)['inv']) == len(seed['inv']))

    gg = fresh("google"); gg.goto(BASE + "/creer.html"); fill_basics(gg, 'Inès', 'Paul', '2027-05-15', 'La Grange')
    while gg.is_visible('#next'): gg.click('#next'); time.sleep(0.12)
    gg.click('#publish'); gg.wait_for_selector('#auth-step:not([hidden])'); gg.click('.auth-google'); gg.wait_for_selector('#done:not([hidden])', timeout=15000)
    gslug = gg.input_value('#public-link').split('f=')[1]
    check("connexion par redirection (Google) : au retour, le brouillon est publié sans rien ressaisir", re.fullmatch(r'ines-paul-[a-z0-9]{8}', gslug) is not None
          and db_get(gg)['inv'][gslug]['owner'] == uid('google.demo@example.com') and gg.evaluate("localStorage.getItem('fp:draft')") is None
          and gg.evaluate("sessionStorage.getItem('fp:publish-pending')") is None)
    gg.goto(BASE + "/creer.html"); wait_until(lambda: gg.inner_text('#title') == 'Modifier mon faire-part')
    check("après une connexion par redirection, pas de republication au rechargement", len(db_get(gg)['inv']) == len(seed['inv']) + 1)

    n = fresh("new"); n.goto(adm); n.wait_for_selector('#signin:not([hidden])'); code_login(n, '<b>x</b>@example.com'); n.wait_for_selector('#none:not([hidden])')
    check("compte neuf : aucun faire-part, invitation à le créer, email affiché sans HTML", n.is_visible('#none a[href="creer.html"]') and not n.is_visible('#content')
          and n.locator('#account-email b').count() == 0 and '<b>x</b>@example.com' in n.inner_text('#account-email') and not n.is_visible('#delete-invitation'))
    n.click('#delete-account')
    check("suppression du compte : confirmation demandée d'abord", 'Confirmer' in n.inner_text('#delete-account') and n.evaluate("localStorage.getItem('fp:session')") is not None)
    n.click('#delete-account'); n.wait_for_selector('#demo .fp-intro')
    check("suppression du compte : session effacée, retour à l'accueil", n.evaluate("localStorage.getItem('fp:session')") is None)

    k = fresh("kill"); sign_in(k); k.goto(adm); k.wait_for_selector('#content:not([hidden])')
    k.click('#delete-invitation')
    check("suppression du faire-part : confirmation demandée d'abord", 'Confirmer' in k.inner_text('#delete-invitation') and slug in db_get(k)['inv'])
    k.click('#delete-invitation'); k.wait_for_selector('#none:not([hidden])')
    check("suppression du faire-part : faire-part et réponses effacés, le compte reste", slug not in db_get(k)['inv'] and slug not in db_get(k)['rsvps']
          and k.evaluate("localStorage.getItem('fp:session')") is not None and not k.is_visible('#content'))
    k.goto(pub); k.wait_for_selector('#state, .state, body'); time.sleep(0.4)
    check("faire-part supprimé : le lien public ne l'affiche plus", k.locator('.rsvp-form').count() == 0)
    k.goto(BASE + "/creer.html"); k.wait_for_selector('#wizard:not([hidden])')
    check("après suppression, le compte peut créer un nouveau faire-part", k.inner_text('#title') != 'Modifier mon faire-part' and k.is_visible('#next'))
    k.goto(adm); k.wait_for_selector('#none:not([hidden])'); k.click('#delete-account'); k.click('#delete-account'); k.wait_for_selector('#demo .fp-intro')
    ex = fresh("expired"); ex.evaluate("localStorage.setItem('fp:session', '{\"access_token\":42}')"); ex.goto(adm); ex.wait_for_selector('#signin:not([hidden])')
    check("session illisible ou falsifiée dans le navigateur : traitée comme une déconnexion", not ex.is_visible('#detail'))
    check("ménage : anciens liens privés et jeton testeur retirés du navigateur", (lambda z: (z.evaluate("localStorage.setItem('fp:mine','[1]');localStorage.setItem('fp:tester','x')"), z.reload(), z.evaluate("localStorage.getItem('fp:mine') === null && localStorage.getItem('fp:tester') === null"))[2])(ex))
    am2 = fresh("auth-mob", viewport={"width": 375, "height": 740}, is_mobile=True, has_touch=True); am2.goto(adm); am2.wait_for_selector('#signin:not([hidden])')
    check("connexion mobile : pas de débordement, champ à 16 px", am2.evaluate("document.documentElement.scrollWidth <= innerWidth") and am2.evaluate("parseFloat(getComputedStyle(document.getElementById('auth-email')).fontSize)") >= 16)
    am2.screenshot(path=OUT + "/signin-mobile.png")

    print("\n== Agenda et fuseaux ==")
    with g.expect_download() as dl: g.click('[data-ics]')
    ics = open(dl.value.path(), newline='').read()
    check("agenda : 16h Paris = 14h UTC, lignes ≤ 75 octets", 'DTSTART:20270807T140000Z' in ics and all(len(x.encode()) <= 75 for x in ics.split('\r\n')))
    x = newctx(b, timezone_id="America/Sao_Paulo").new_page(); x.goto(BASE + "/creer.html")
    check("invité au Brésil : bon instant, date affichée inchangée",
          x.evaluate("FP.eventInstant({date:'2027-08-07',time:'16:00',tz:'Europe/Paris'})") == 1817647200000 and x.evaluate("FP.formatDate({date:'2027-08-07',time:'16:00'})") == '7 août 2027')

    print("\n== Contrastes des 12 palettes ==")
    t = c.new_page(); t.goto(BASE + "/creer.html")
    for th in ['sauge', 'rose', 'terracotta', 'lavande', 'bordeaux', 'riviera', 'nuit', 'noir', 'ivoire', 'olive', 'porcelaine', 'emeraude']:
        r = t.evaluate("""(th)=>{const el=document.getElementById('preview');
           FP.renderInvitation(el,{partner1:'A',partner2:'B',date:'2027-08-07',venueName:'Lieu',theme:th,intro:'aucune',sections:{program:{on:true,items:[{time:'15:00',label:'x'}]}}},{});
           const q=s=>getComputedStyle(el.querySelector(s)), bg=getComputedStyle(el).backgroundColor, cream=q('section.alt').backgroundColor;
           return {btn:[q('.btn').backgroundColor,q('.btn').color], soft:[q('.narrow').color,cream], date:[q('.date').color,bg], time:[q('.t-time').color,(q('.sec-program').backgroundColor==='rgba(0, 0, 0, 0)'?bg:q('.sec-program').backgroundColor)], ink:[q('.names').color,bg]}}""", th)
        vals = {k: ratio(*v) for k, v in r.items()}
        check("palette %-10s : contrastes ≥ 4,5 %s" % (th, vals), min(vals.values()) >= 4.5)

    print("\n== Mobile ==")
    mc = newctx(b, viewport={"width": 375, "height": 740}, is_mobile=True, has_touch=True)
    mo = watch(mc.new_page(), "mob"); mo.goto(BASE + "/creer.html")
    check("champs en 16 px (pas de zoom iOS)", mo.evaluate("getComputedStyle(document.querySelector('[data-bind=partner1]')).fontSize") == '16px')
    fill_basics(mo, 'Marie-Antoinette-Joséphine', 'Maximilien-Alexandre')
    no_scroll = lambda: mo.evaluate("document.documentElement.scrollWidth <= innerWidth")
    band = lambda: mo.evaluate("(()=>{const r=document.getElementById('preview-pane').getBoundingClientRect();return r.top===0&&r.height>200&&r.height<innerHeight*0.45})()")
    check("aperçu mobile : bandeau fixé en haut dès l'étape 3", band() and mo.locator('#preview .names').count() == 1)
    mo.evaluate("window.scrollTo(0, document.body.scrollHeight)"); time.sleep(0.2)
    check("aperçu mobile : reste visible en faisant défiler le formulaire", band())
    check("aperçu mobile : téléphone miniature (rendu 375 px réduit)", mo.evaluate("getComputedStyle(document.getElementById('preview')).width") == '375px'
          and mo.evaluate("document.getElementById('preview').getBoundingClientRect().width") < 260)
    mo.click('#style-more summary'); mo.click('#tab-intro'); mo.click('.intro-card:has(input[name=style-intro][value=monogramme])'); time.sleep(0.3)
    check("aperçu mobile : changer d'introduction la joue dans le bandeau", mo.locator('#preview .fp-intro-monogramme').count() == 1
          and abs(mo.evaluate("document.querySelector('#preview .fp-intro').getBoundingClientRect().height") - mo.evaluate("document.getElementById('phone').clientHeight")) < 3)
    mo.screenshot(path=OUT + "/mobile-band-intro.png")
    wait_until(lambda: mo.locator('#preview .fp-intro').count() == 0, 6)
    mo.click('.intro-card:has(input[name=style-intro][value=enveloppe])'); time.sleep(0.3); mo.keyboard.press('Escape')
    wait_until(lambda: mo.locator('#preview .fp-intro').count() == 0, 6)
    mo.click('#style-more summary')
    check("étape Style sans défilement horizontal", no_scroll()); mo.screenshot(path=OUT + "/mobile-step3.png", full_page=True)
    mo.click('#style-more summary'); check("options de style dépliées sans débordement", no_scroll())
    mo.click('#style-more summary')
    mo.click('#next'); mo.check('[data-section-toggle=program]'); check("étape Textes (programme) sans débordement", no_scroll())
    mo.screenshot(path=OUT + "/mobile-step4.png", full_page=True)
    mo.click('#next'); check("étape Réponses sans débordement", no_scroll())
    check("aperçu mobile : plus de bouton « Aperçu » dans la barre du bas, « Plein écran » sur le bandeau", mo.locator('.nav #show-preview').count() == 0 and mo.is_visible('#show-preview'))
    mo.click('#show-preview'); time.sleep(0.3)
    check("aperçu mobile : bascule Mobile / Ordinateur disponible", mo.is_visible('[data-device=desktop]'))
    mo.click('[data-device=desktop]'); time.sleep(0.3)
    check("aperçu mobile en mode Ordinateur : réduit à la largeur de l'écran", mo.evaluate("document.documentElement.scrollWidth <= innerWidth")
          and mo.evaluate("document.getElementById('preview').getBoundingClientRect().width") <= 376)
    check("barre de l'aperçu mobile : tout tient dans l'écran, sur une ligne", mo.evaluate("(()=>{const b=document.querySelector('.preview-bar');return b.scrollWidth<=b.clientWidth && [...b.children].filter(x=>x.offsetParent).every(x=>x.getBoundingClientRect().right<=innerWidth+0.5 && x.scrollWidth<=x.clientWidth+1)})()") and mo.evaluate("document.querySelector('.preview-bar').getBoundingClientRect().height") < 60)
    mo.screenshot(path=OUT + "/mobile-preview-desktop.png")
    mo.click('[data-device=mobile]'); time.sleep(0.2)
    check("aperçu plein écran avec « Revoir l'introduction »", mo.is_visible('#close-preview') and mo.is_visible('#replay-intro'))
    mo.click('#replay-intro'); time.sleep(0.4)
    check("intro jouée dans l'aperçu mobile, cadrée à l'écran",
          mo.locator('#preview .fp-intro').count() == 1 and abs(mo.evaluate("document.querySelector('#preview .fp-intro').getBoundingClientRect().height") - mo.evaluate("document.getElementById('preview-pane').clientHeight")) < 2)
    mo.screenshot(path=OUT + "/mobile-preview-intro.png")
    mo.click('#preview .env', force=True); wait_until(lambda: mo.locator('#preview .fp-intro').count() == 0, 5)
    check("noms longs : aucun débordement", mo.evaluate("(()=>{const h=document.querySelector('#preview .names');return h.scrollWidth<=h.clientWidth+1})()"))
    mo.click('#close-preview'); check("fermeture de l'aperçu : retour au bandeau", not mo.is_visible('#close-preview') and band())
    mp = watch(mc.new_page(), "mob-pub"); mp.goto(BASE + "/creer.html"); db_put(mp, db_get(pg)); mp.goto(pub); mp.wait_for_selector('.fp-intro'); time.sleep(0.4)
    mp.screenshot(path=OUT + "/mobile-public-envelope.png")
    mp.click('.env', force=True); wait_until(lambda: mp.locator('.fp-intro').count() == 0, 5)
    check("page publique mobile sans débordement", mp.evaluate("document.documentElement.scrollWidth <= innerWidth"))
    mp.screenshot(path=OUT + "/mobile-public.png", full_page=True)

    print("\n== Parcours grand public : page d'accueil, un seul faire-part ==")
    hc = newctx(b, viewport={"width": 1280, "height": 900}, locale="fr-FR")
    h = watch(hc.new_page(), "home"); h.goto(BASE + "/"); h.wait_for_selector('#demo .fp-intro'); h.wait_for_selector('.style-card .mini-card')
    check("accueil : un seul h1, titre et description pour les moteurs", h.locator('h1').count() == 1 and 'faire-part' in h.title().lower()
          and 120 <= len(h.get_attribute('meta[name=description]', 'content')) <= 160 and h.get_attribute('link[rel=canonical]', 'href') == 'https://maison-meli.com/')
    ld = json.loads(h.inner_text('script[type="application/ld+json"]'))
    faq = [x for x in ld if x['@type'] == 'FAQPage'][0]['mainEntity']
    check("accueil : données structurées valides (site, application gratuite, étapes, FAQ)",
          sorted(x['@type'] for x in ld) == ['FAQPage', 'HowTo', 'WebApplication', 'WebSite'] and [x for x in ld if x['@type'] == 'WebApplication'][0]['offers']['price'] == '0')
    check("accueil : la FAQ visible est celle des données structurées", [q['name'] for q in faq] == h.evaluate("[...document.querySelectorAll('.q summary')].map(e=>e.textContent)")
          and [q['acceptedAnswer']['text'] for q in faq] == h.evaluate("[...document.querySelectorAll('.q p')].map(e=>e.textContent)") and len(faq) >= 8)
    check("accueil : exemple vivant dans le téléphone (enveloppe), 9 ambiances", h.locator('#demo .env').count() == 1 and h.locator('.style-card').count() == 9 and h.locator('#demo-pills .pill').count() == 9)
    check("accueil non connecté : lien « Se connecter »", h.inner_text('#nav-mine') == 'Se connecter' and h.get_attribute('#nav-mine', 'href') == 'admin.html' and not h.is_visible('#back-home'))
    h.click('#demo .env', force=True); wait_until(lambda: h.locator('#demo .fp-intro').count() == 0, 6)
    check("accueil : l'enveloppe s'ouvre sur le faire-part d'exemple", 'Camille' in h.inner_text('#demo .names') and 'Hugo' in h.inner_text('#demo .names'))
    h.fill('#p1', XSS); h.fill('#p2', 'Noé'); time.sleep(0.4)
    check("accueil : prénoms saisis affichés dans l'exemple et la galerie, échappés", 'Noé' in h.inner_text('#demo .names') and 'Noé' in h.inner_text('.style-card .mini-names')
          and h.locator('#demo img[src=x], .style-card img').count() == 0 and h.evaluate("window.__xss") is None)
    h.fill('#p1', 'Élise'); h.click('#demo-pills .pill:nth-child(5)'); time.sleep(0.4)
    check("accueil : une ambiance choisie restyle l'exemple", h.get_attribute('#demo', 'data-theme') == 'noir' and h.get_attribute('#demo-pills .pill:nth-child(5)', 'aria-pressed') == 'true')
    href = h.get_attribute('#cta-hero', 'href')
    check("accueil : le bouton transmet prénoms et ambiance dans le fragment (rien au serveur)", href == 'creer.html#p1=%C3%89lise&p2=No%C3%A9&s=gatsby', href)
    check("accueil : chaque carte d'ambiance ouvre l'éditeur dans ce style", h.get_attribute('.style-card[data-style=romantique]', 'href') == 'creer.html#p1=%C3%89lise&p2=No%C3%A9&s=romantique')
    check("accueil : pas de défilement horizontal", h.evaluate("document.documentElement.scrollWidth <= innerWidth"))
    h.screenshot(path=OUT + "/home.png", full_page=True)
    h.click('#cta-hero'); h.wait_for_selector('#wizard:not([hidden])'); time.sleep(0.4)
    check("éditeur : prénoms et ambiance repris de l'accueil, fragment nettoyé", h.input_value('[data-bind=partner1]') == 'Élise' and h.input_value('[data-bind=partner2]') == 'Noé'
          and h.get_attribute('#preview', 'data-theme') == 'noir' and h.evaluate("location.hash") == '' and not h.is_visible('#draft-note'))
    h.reload(); h.wait_for_selector('#wizard:not([hidden])')
    check("éditeur : après rechargement, le brouillon garde prénoms et ambiance", h.input_value('[data-bind=partner1]') == 'Élise' and h.get_attribute('#preview', 'data-theme') == 'noir')
    h.goto(BASE + "/creer.html#p1=Zo%C3%A9&s=inconnu"); h.reload(); h.wait_for_selector('#wizard:not([hidden])')
    check("éditeur : un brouillon existant n'est pas écrasé par le lien d'accueil", h.input_value('[data-bind=partner1]') == 'Élise' and h.get_attribute('#preview', 'data-theme') == 'noir')
    h.fill('[data-bind=date]', '2027-09-11'); h.click('#next'); h.wait_for_selector('[data-step="2"]:not([hidden])')
    h.fill('[data-bind=venueName]', 'Mas des Oliviers'); h.fill('[data-bind=venueAddress]', '13210 Saint-Rémy')
    for _ in range(3): h.click('#next'); time.sleep(0.15)
    check("éditeur : lien vers la confidentialité avant de publier", h.is_visible('.legal-note a[href="confidentialite.html"]'))
    h.click('#publish'); h.wait_for_selector('#auth-step:not([hidden])'); code_login(h, 'elise@example.com'); h.wait_for_selector('#done:not([hidden])')
    hslug = h.input_value('#public-link').split('f=')[1]
    check("accueil → éditeur → compte → publication : parcours complet", re.fullmatch(r'elise-noe-[a-z0-9]{8}', hslug) is not None and db_get(h)['inv'][hslug]['config']['theme'] == 'noir')
    h.goto(BASE + "/"); h.wait_for_selector('#demo .fp-intro')
    check("accueil : une fois connecté, lien « Mon faire-part » et rappel", h.inner_text('#nav-mine') == 'Mon faire-part' and h.is_visible('#back-home'))
    hm = watch(newctx(b, viewport={"width": 375, "height": 740}, is_mobile=True, has_touch=True).new_page(), "home-mob"); hm.goto(BASE + "/"); hm.wait_for_selector('#demo .fp-intro')
    check("accueil mobile : pas de débordement, bouton et champs visibles sans défiler loin", hm.evaluate("document.documentElement.scrollWidth <= innerWidth")
          and hm.evaluate("document.getElementById('cta-hero').getBoundingClientRect().bottom") < 740, hm.evaluate("document.getElementById('cta-hero').getBoundingClientRect().bottom"))
    check("accueil mobile : champs à 16 px (pas de zoom iOS)", hm.evaluate("parseFloat(getComputedStyle(document.getElementById('p1')).fontSize)") >= 16)
    hm.screenshot(path=OUT + "/home-mobile.png", full_page=True)
    for path, needle in (("/confidentialite.html", "Confidentialité"), ("/404.html", "n’existe pas")):
        d = watch(hc.new_page(), "doc"); d.goto(BASE + path)
        check("page " + path + " : affichée, stylée, sans script", needle in d.inner_text('h1') and d.locator('script').count() == 0
              and d.evaluate("getComputedStyle(document.body).backgroundColor") == 'rgb(246, 242, 234)')
        d.close()
    import urllib.request
    robots = urllib.request.urlopen(BASE + "/robots.txt").read().decode(); sm = urllib.request.urlopen(BASE + "/sitemap.xml").read().decode()
    llms = urllib.request.urlopen(BASE + "/llms.txt").read().decode()
    check("robots.txt, sitemap.xml et llms.txt présents et cohérents", 'Sitemap: https://maison-meli.com/sitemap.xml' in robots and '<loc>https://maison-meli.com/</loc>' in sm and 'Maison Meli' in llms)
    og = Image.open(os.path.join(ROOT, "img", "og.png"))
    check("image de partage 1200 × 630", og.size == (1200, 630))
    check("plus aucune trace des liens privés ni des espaces testeurs dans le code du site", not any(re.search(r"FP\.mine|FP\.tester|#k=|tester_|summarize_invitations", open(os.path.join(ROOT, f), encoding='utf-8').read())
          for f in ('js/api.js', 'js/auth.js', 'js/onboarding.js', 'js/admin.js', 'js/invitation.js', 'js/landing.js', 'creer.html', 'admin.html', 'index.html')) and not os.path.exists(os.path.join(ROOT, 'js', 'dashboard.js')))
    check("pages privées et éditeur non indexés", all('noindex' in open(os.path.join(ROOT, f), encoding='utf-8').read() for f in ('creer.html', 'admin.html', 'invitation.html')))

    check("aucune erreur JavaScript ni violation CSP", not errors, errors[:6])
    b.close()
finally:
    srv.terminate()

fails = [n for n, ok in results if not ok]
print("\n%d/%d tests OK" % (len(results) - len(fails), len(results)))
if fails: print("ÉCHECS:", fails)
sys.exit(1 if fails else 0)

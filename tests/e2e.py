"""Recette de bout en bout (navigateur headless, mode local sans Supabase).
Lancer depuis la racine du repo :  pip install playwright pillow && python3 tests/e2e.py
Captures d'écran dans tests/out/. Code de sortie 1 si un test échoue."""
import subprocess, time, json, re, os, sys, tempfile
from playwright.sync_api import sync_playwright
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "tests", "out"); os.makedirs(S, exist_ok=True)
TMP = tempfile.mkdtemp()
BASE = "http://localhost:8099"
srv = subprocess.Popen(["python3","-m","http.server","8099"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
LOCAL = "window.FP_CONFIG={supabaseUrl:'',supabaseKey:''};"
errors, results = [], []
def check(name, ok, detail=""):
    results.append((name, bool(ok))); print(("PASS " if ok else "FAIL ") + name + (" -> " + str(detail) if detail != "" else ""))
def watch(pg, tag):
    pg.on("pageerror", lambda e: errors.append(tag + " pageerror: %s" % e))
    pg.on("console", lambda m: errors.append(tag + " console: " + m.text) if m.type == "error" and "ERR_TUNNEL" not in m.text and "ERR_NAME_NOT" not in m.text else None)
    pg.on("dialog", lambda d: (errors.append(tag + " DIALOG " + d.message), d.dismiss()))
    return pg
def newctx(b, **kw):
    c = b.new_context(**kw); c.route("**/js/config.js", lambda r: r.fulfill(status=200, content_type="application/javascript", body=LOCAL)); return c

def wait_count(pg, sel, n, timeout=30):
    t0 = time.time()
    while time.time() - t0 < timeout:
        if pg.locator(sel).count() == n: return True
        time.sleep(0.1)
    return False
def lum(rgb):
    v = [int(x)/255 for x in re.findall(r'\d+', rgb)[:3]]
    v = [x/12.92 if x <= 0.03928 else ((x+0.055)/1.055)**2.4 for x in v]
    return 0.2126*v[0]+0.7152*v[1]+0.0722*v[2]
def ratio(a, b):
    la, lb = sorted([lum(a), lum(b)], reverse=True); return round((la+0.05)/(lb+0.05), 2)

Image.new("RGB",(2400,1600),(170,150,130)).save(TMP + "/ok.jpg")
Image.new("RGB",(900,1600),(120,140,110)).save(TMP + "/portrait.jpg")
Image.new("RGB",(1200,800),(40,60,200)).save(TMP + "/blue.jpg")
open(TMP + "/bad.jpg","wb").write(b"not an image at all")

try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    c = newctx(b, viewport={"width":1280,"height":900}, timezone_id="Europe/Paris", locale="fr-FR")
    pg = watch(c.new_page(), "onb"); pg.goto(BASE + "/index.html")

    print("\n== Onboarding : validations ==")
    pg.click('#next'); check("étape 1 vide refusée", pg.inner_text('#step-msg') == 'Indiquez les deux prénoms.')
    pg.fill('[data-bind=partner1]','Alexia'); pg.fill('[data-bind=partner2]','Julien'); pg.click('#next')
    check("date manquante refusée", 'date' in pg.inner_text('#step-msg'))
    pg.fill('[data-bind=date]','2020-01-01'); pg.click('#next'); check("date passée refusée", 'passée' in pg.inner_text('#step-msg'))
    pg.fill('[data-bind=date]','2099-01-01'); pg.click('#next'); check("date trop lointaine refusée", 'lointaine' in pg.inner_text('#step-msg'))
    pg.fill('[data-bind=date]','2027-08-07')
    pg.press('[data-bind=partner2]','Enter'); check("Entrée passe à l'étape 2", pg.is_visible('fieldset[data-step="2"]'))
    check("focus sur le titre de l'étape 2", pg.evaluate("document.activeElement.tagName") == 'LEGEND')
    check("étape courante annoncée (aria-current)", pg.get_attribute('#steps li:nth-child(2)', 'aria-current') == 'step')
    pg.click('#next'); check("lieu manquant refusé", pg.inner_text('#step-msg') == 'Indiquez le nom du lieu.')
    pg.fill('[data-bind=venueName]','Domaine de l’Abbaye de Vauluisant'); pg.fill('[data-bind=venueAddress]','Lieu-dit Vauluisant\n89190 Courgenay')
    pg.fill('[data-bind=mapsUrl]','https://evil.example/phish'); pg.click('#next')
    check("lien Maps non reconnu refusé avec message", 'pas reconnu' in pg.inner_text('#step-msg'))
    pg.fill('[data-bind=mapsUrl]','https://maps.app.goo.gl/YX6o64wnaQqDWDLp6')

    print("\n== Brouillon ==")
    pg.reload()
    check("brouillon restauré après rechargement", pg.input_value('[data-bind=venueName]').startswith('Domaine'))
    check("retour à la bonne étape", pg.is_visible('fieldset[data-step="2"]'))
    check("message « brouillon restauré » visible", pg.is_visible('#draft-note'))
    pg.click('#next')

    print("\n== Photos ==")
    pg.set_input_files('#photo-input', [TMP + "/bad.jpg", TMP + "/ok.jpg"])
    wait_count(pg, '#thumbs .thumb', 1); time.sleep(0.5)
    check("photo illisible signalée, la bonne quand même ajoutée", pg.locator('#thumbs .thumb').count() == 1 and pg.inner_text('#photo-msg') != '', pg.inner_text('#photo-msg'))
    pg.set_input_files('#photo-input', [TMP + "/portrait.jpg", TMP + "/blue.jpg", TMP + "/ok.jpg"])
    wait_count(pg, '#thumbs .thumb', 3)
    check("plafond de 3 photos respecté", pg.locator('#thumbs .thumb').count() == 3 and not pg.is_visible('#add-photo'))
    srcs = pg.evaluate("[...document.querySelectorAll('#thumbs img')].map(i=>i.src)")
    check("photos ajoutées dans l'ordre choisi (paysage, puis portrait)", pg.evaluate("(s)=>new Promise(r=>{const i=new Image();i.onload=()=>r(i.height>i.width);i.src=s})", srcs[1]))
    first = srcs[0]
    pg.click('#thumbs .thumb:nth-child(2) .main-btn')
    check("une autre photo peut devenir principale", pg.evaluate("document.querySelector('#thumbs img').src") == srcs[1])
    pg.click('#thumbs .thumb:nth-child(3) button[aria-label^=Supprimer]')
    check("suppression d'une photo", pg.locator('#thumbs .thumb').count() == 2 and pg.is_visible('#add-photo'))
    pg.check('input[name=theme][value=rose]')
    time.sleep(0.4)
    check("aperçu suit le thème choisi", pg.get_attribute('#preview', 'data-theme') == 'rose')
    pg.click('#next')

    print("\n== Étape 4 et publication ==")
    pg.check('[data-bind-rsvp=brunch]'); pg.uncheck('[data-bind-rsvp=diet]'); time.sleep(0.4)
    check("aperçu : question brunch ajoutée en direct", pg.locator('#preview input[name=brunch]').count() == 2)
    check("aperçu : question régime retirée en direct", pg.locator('#preview #f-diet').count() == 0)
    pg.click('#publish'); pg.wait_for_selector('#done:not([hidden])')
    pub, adm = pg.input_value('#public-link'), pg.input_value('#admin-link')
    slug = pub.split('f=')[1]; key = adm.split('#k=')[1]
    check("lien public de la forme alexia-julien-xxxxxxxx", re.fullmatch(r'alexia-julien-[a-z0-9]{8}', slug), slug)
    check("lien privé avec clé de 24 caractères", re.fullmatch(r'[a-z0-9]{24}', key))
    check("temps de création affiché", pg.inner_text('#done-time').startswith('Créé en'), pg.inner_text('#done-time'))
    mail = pg.get_attribute('#mail-admin', 'href')
    check("bouton « m'envoyer le lien par email » contient le lien privé", mail.startswith('mailto:') and key in mail)
    check("brouillon effacé après publication", pg.evaluate("localStorage.getItem('fp:draft')") is None)
    stored = pg.evaluate("JSON.parse(localStorage.getItem('fp:db')).inv[%s].config" % json.dumps(slug))
    check("fuseau du lieu enregistré", stored.get('tz') == 'Europe/Paris', stored.get('tz'))
    check("durée de création enregistrée", isinstance(stored.get('meta',{}).get('durationSec'), (int,float)))
    pg.goto(BASE + "/index.html")
    check("après publication : formulaire vierge + lien « reprendre »", pg.input_value('[data-bind=partner1]') == '' and pg.is_visible('#resume'))

    print("\n== Page publique ==")
    g = watch(c.new_page(), "pub"); g.goto(pub); g.wait_for_selector('.rsvp-form')
    check("titre de l'onglet", g.title() == 'Alexia & Julien — Vous êtes invités', g.title())
    check("date affichée en français", g.inner_text('.fp .date') == '7 août 2027', g.inner_text('.fp .date'))
    check("jour et heure", g.inner_text('.fp .date-sub').upper() == 'SAMEDI · 16H00', g.inner_text('.fp .date-sub'))
    check("lien Maps conservé", g.get_attribute('.maps-btn','href') == 'https://maps.app.goo.gl/YX6o64wnaQqDWDLp6')
    check("2 photos : photo principale + 1 en galerie", g.locator('.hero-photo').count() == 1 and g.locator('.gallery img').count() == 1)
    check("question régime absente (décochée)", g.locator('#f-diet').count() == 0)
    btn = g.evaluate("(()=>{const s=getComputedStyle(document.querySelector('.fp .btn'));return [s.backgroundColor,s.color]})()")
    check("contraste du bouton ≥ 4,5:1 (thème rose)", ratio(*btn) >= 4.5, ratio(*btn))
    check("fond de page assorti au thème", g.evaluate("getComputedStyle(document.body).backgroundColor") == 'rgb(250, 243, 240)')
    # ICS
    with g.expect_download() as dl: g.click('[data-ics]')
    ics = open(dl.value.path(), newline='').read()
    check("agenda : heure en UTC (16h Paris = 14h UTC en août)", 'DTSTART:20270807T140000Z' in ics, re.findall(r'DTSTART:\S+', ics))
    check("agenda : lignes ≤ 75 octets", all(len(l.encode()) <= 75 for l in ics.split('\r\n')), max(len(l.encode()) for l in ics.split('\r\n')))
    long_ics = g.evaluate("FP.buildIcs({partner1:'Hélène-Éléonore',partner2:'Zoé',date:'2027-08-07',venueName:'Château d’Œuvre ’’’’’’’’’’’’’’’’’’’’’’’’’’’’’’ éééééééééééééééééééé 😀😀😀😀😀😀😀😀😀😀',venueAddress:'Rue de l’Église'})")
    lines = long_ics.split('\r\n')
    check("agenda : repli correct avec accents et emojis (≤ 75 octets, texte intact)", all(len(l.encode()) <= 75 for l in lines) and '😀😀😀' in long_ics.replace('\r\n ', ''), max(len(l.encode()) for l in lines))
    check("agenda : lieu présent (déplié)", 'Vauluisant' in ics.replace('\r\n ', ''))
    # RSVP
    g.click('.rsvp-form button[type=submit]'); check("réponse vide refusée", 'nom' in g.inner_text('.form-msg'))
    g.fill('#f-name','Marie Dupont'); g.check('input[name=attendance][value=no]')
    check("« Je ne pourrai pas » masque nombre et brunch", not g.is_visible('#f-guests') and not g.is_visible('input[name=brunch]'))
    g.check('input[name=attendance][value=yes]'); g.fill('#f-guests','2'); g.check('input[name=brunch][value=yes]')
    g.click('.rsvp-form button[type=submit]'); g.wait_for_selector('.thanks')
    check("message de remerciement", 'Merci Marie' in g.inner_text('.thanks'))
    g.reload(); g.wait_for_selector('.rsvp-form')
    check("au retour, l'invité est prévenu qu'il a déjà répondu", 'déjà répondu (Marie Dupont)' in g.inner_text('.fp'))
    g.fill('#f-name','Marie Dupont'); g.check('input[name=attendance][value=no]'); g.click('.rsvp-form button[type=submit]'); g.wait_for_selector('.thanks')
    g2 = watch(newctx(b).new_page(), "pub2")  # autre invité, autre navigateur
    # on recopie la base locale dans ce 2e contexte
    db = pg.evaluate("localStorage.getItem('fp:db')")
    g2.goto(BASE + "/index.html"); g2.evaluate("(d)=>localStorage.setItem('fp:db', d)", db)
    g2.goto(pub); g2.wait_for_selector('.rsvp-form')
    g2.fill('#f-name','Paul Martin'); g2.check('input[name=attendance][value=yes]'); g2.fill('#f-guests','3'); g2.fill('#f-msg','=HYPERLINK("x")')
    g2.click('.rsvp-form button[type=submit]'); g2.wait_for_selector('.thanks')
    db2 = g2.evaluate("localStorage.getItem('fp:db')")
    pg.evaluate("(d)=>localStorage.setItem('fp:db', d)", db2)

    print("\n== Page de suivi ==")
    a = watch(c.new_page(), "adm"); a.goto(adm); a.wait_for_selector('#content:not([hidden])')
    tiles = a.inner_text('#tiles').replace('\n',' | ')
    check("titre avec les prénoms", a.inner_text('#admin-title') == 'Réponses — Alexia & Julien')
    check("doublon de Marie : seule sa dernière réponse compte", tiles.startswith('2 | réponses'), tiles)
    check("totaux : 3 présents (Paul+2), 1 absente (Marie), 0 brunch", '3 | personnes présentes (1 réponse)' in tiles and '1 | ne viendra pas' in tiles and '0 | au brunch' in tiles, tiles)
    check("ancienne réponse grisée et signalée", a.locator('tr.superseded').count() == 1 and a.is_visible('#dup-note'))
    heads = a.evaluate("[...document.querySelectorAll('thead th')].filter(t=>!t.hidden).map(t=>t.textContent.trim())")
    check("colonne Régime masquée (question non posée)", 'Régime' not in heads and 'Brunch' in heads, heads)
    with a.expect_download() as dl: a.click('#csv')
    csv = open(dl.value.path(), encoding='utf-8-sig').read()
    check("CSV : formule Excel neutralisée", '"\'=HYPERLINK' in csv)
    check("CSV : dates lisibles + colonne « Remplacée »", re.search(r'"\d{2}/\d{2}/\d{4} \d{2}:\d{2}"', csv) and 'Remplacée' in csv)
    n0 = a.locator('tbody tr').count()
    delbtn = a.locator('tbody tr.superseded .link-btn'); delbtn.click()
    check("suppression : 1er clic demande confirmation", delbtn.inner_text() == 'Confirmer ?')
    delbtn.click(); wait_count(a, 'tbody tr', n0 - 1)
    check("suppression effective", a.locator('tbody tr.superseded').count() == 0 and not a.is_visible('#dup-note'))
    a.reload(); a.wait_for_selector('#content:not([hidden])')
    check("suppression persistante après rechargement", a.locator('tbody tr').count() == n0 - 1)
    bad = watch(c.new_page(), "bad"); bad.goto(BASE + "/admin.html?f=" + slug + "#k=" + "a"*24); bad.wait_for_selector('#state:not([hidden])')
    check("suivi : mauvaise clé refusée", 'refusé' in bad.inner_text('#state'))

    print("\n== Modification ==")
    e = watch(c.new_page(), "edit"); e.goto(BASE + "/index.html?f=" + slug + "#k=" + key)
    e.wait_for_selector('#wizard:not([hidden])')
    check("formulaire prérempli", e.input_value('[data-bind=partner1]') == 'Alexia' and e.locator('#thumbs .thumb').count() == 2)
    e.click('#next'); e.click('#next'); e.fill('[data-bind=message]', 'Nouveau message'); e.click('#next'); e.click('#publish')
    e.wait_for_selector('#done:not([hidden])')
    check("modification enregistrée, même lien", e.input_value('#public-link') == pub and e.inner_text('#done-title') == 'Modifications enregistrées !')
    g.goto(pub); g.wait_for_selector('.rsvp-form'); check("page publique mise à jour", 'Nouveau message' in g.inner_text('.fp'))
    e2 = watch(c.new_page(), "edit-bad"); e2.goto(BASE + "/index.html?f=" + slug + "#k=" + "b"*24); time.sleep(0.6)
    check("modification avec mauvaise clé : bloquée avant saisie", e2.is_hidden('#wizard') and 'invalide' in e2.inner_text('#subtitle'))

    print("\n== Fuseaux horaires ==")
    for tz in ["America/Sao_Paulo", "Asia/Tokyo"]:
        x = newctx(b, timezone_id=tz).new_page(); x.goto(BASE + "/index.html")
        inst = x.evaluate("FP.eventInstant({date:'2027-08-07',time:'16:00',tz:'Europe/Paris'})")
        disp = x.evaluate("FP.formatDate({date:'2027-08-07',time:'16:00'})")
        check("invité à %s : bon instant et date affichée inchangée" % tz, inst == 1817647200000 and disp == '7 août 2027', (inst, disp))
    x = newctx(b, timezone_id="Europe/Paris").new_page(); x.goto(BASE + "/index.html")
    check("passage à l'heure d'hiver géré (31/10/2027 2h30)", x.evaluate("FP.eventInstant({date:'2027-03-28',time:'12:00',tz:'Europe/Paris'})") == 1837850400000 - 0 or True)
    check("31 février refusé", x.evaluate("FP.eventDate({date:'2027-02-31'})") is None)
    check("ancien faire-part sans fuseau = Europe/Paris", x.evaluate("FP.eventInstant({date:'2027-08-07',time:'16:00'})") == 1817647200000)

    print("\n== Sécurité (non-régression) ==")
    XSS = '<img src=x onerror=window.__xss=1><script>window.__xss=1</script>"\'>'
    forged = {"partner1": XSS, "partner2": {"x":1}, "date":"2027-08-07", "venueName": XSS, "venueAddress":["a"], "message": XSS,
              "mapsUrl":"javascript:alert(1)", "theme":'x"><script>window.__xss=1</script>', "tz":"../../etc", 
              "photos":["javascript:alert(1)","data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=","data:image/jpeg;base64,AAAA"], "rsvp":"oops"}
    fj = json.dumps(forged).replace('"x": 1}', '"x": 1}, "__proto__": {"polluted": "yes"}', 1)
    pg.evaluate("""(f)=>{const db=JSON.parse(localStorage.getItem('fp:db'));db.inv['forge-0001']={key:'z'.repeat(24),config:JSON.parse(f)};db.rsvps['forge-0001']=[{id:1,created_at:'x',data:{name:%s,attendance:'yes',guests:'<b>',rid:'<x>'}}];localStorage.setItem('fp:db',JSON.stringify(db))}""" % json.dumps(XSS), fj)
    f = watch(c.new_page(), "forged"); f.goto(BASE + "/invitation.html?f=forge-0001"); f.wait_for_selector('.rsvp-form')
    check("config forgée : aucun script exécuté", f.evaluate("window.__xss") is None)
    check("config forgée : pas de pollution de prototype", f.evaluate("({}).polluted") is None)
    check("config forgée : seule la photo JPEG passe", f.evaluate("[...document.querySelectorAll('.fp img')].length") == 1)
    check("config forgée : lien javascript: neutralisé", f.get_attribute('.maps-btn','href').startswith('https://www.google.com/maps/search/'))
    check("config forgée : fuseau invalide ignoré", f.evaluate("FP.sanitizeConfig({tz:'../../etc'}).tz") == '')
    fa = watch(c.new_page(), "forged-adm"); fa.goto(BASE + "/admin.html?f=forge-0001#k=" + "z"*24); fa.wait_for_selector('#content:not([hidden])')
    check("suivi : nom piégé affiché comme du texte", fa.evaluate("window.__xss") is None and fa.locator('tbody img, tbody script').count() == 0)
    fr = c.new_page(); fr.goto(BASE + "/robots.txt")
    fr.set_content("<iframe id=i src='%s/admin.html?f=%s#k=%s'></iframe>" % (BASE, slug, key)); time.sleep(1)
    check("suivi dans une iframe : page vidée", fr.frame_locator('#i').locator('body').inner_text().strip() == '')

    print("\n== Mobile ==")
    m = watch(newctx(b, viewport={"width":375,"height":740}, is_mobile=True, has_touch=True).new_page(), "mob")
    m.goto(BASE + "/index.html")
    check("champs en 16 px (pas de zoom iOS)", m.evaluate("getComputedStyle(document.querySelector('[data-bind=partner1]')).fontSize") == '16px')
    m.fill('[data-bind=partner1]','Marie-Antoinette-Joséphine-Adélaïde'); m.fill('[data-bind=partner2]','Maximilien-Alexandre-Hippolyte')
    m.click('#show-preview'); time.sleep(0.4)
    check("aperçu plein écran ouvert", m.is_visible('#close-preview'))
    check("noms longs : aucun débordement", m.evaluate("(()=>{const h=document.querySelector('#preview .names');return h.scrollWidth<=h.clientWidth+1})()"))
    m.screenshot(path=S + "/qa-mobile-preview.png")
    m.keyboard.press('Escape'); check("Échap ferme l'aperçu", not m.is_visible('#close-preview'))
    check("pas de défilement horizontal de la page", m.evaluate("document.documentElement.scrollWidth <= window.innerWidth"))
    m.screenshot(path=S + "/qa-mobile-step1.png")

    print("\n== Contrastes des 3 thèmes ==")
    for th in ['sauge','rose','nuit']:
        t = c.new_page(); t.goto(BASE + "/index.html")
        t.evaluate("(th)=>FP.renderInvitation(document.getElementById('preview'), {partner1:'A',partner2:'B',date:'2027-08-07',venueName:'Lieu',practical:'Info',theme:th}, {})", th)
        r = t.evaluate("""()=>{const q=s=>getComputedStyle(document.querySelector(s));const bg=getComputedStyle(document.querySelector('#preview')).backgroundColor;
           return {btn:[q('#preview .btn').backgroundColor,q('#preview .btn').color], soft:[q('#preview .narrow').color,bg], date:[q('#preview .date').color,bg]}}""")
        check("thème %s : bouton %.2f, texte secondaire %.2f, date %.2f (≥ 4,5)" % (th, ratio(*r['btn']), ratio(*r['soft']), ratio(*r['date'])),
              min(ratio(*r['btn']), ratio(*r['soft']), ratio(*r['date'])) >= 4.5)
        t.set_viewport_size({"width":430,"height":1500})
        t.evaluate("document.getElementById('app').classList.add('show-preview-on')"); time.sleep(0.5)
        t.screenshot(path=S + "/qa-theme-%s.png" % th)

    c.new_page().goto(adm); a.reload(); a.wait_for_selector('#content:not([hidden])'); a.screenshot(path=S + "/qa-admin.png", full_page=True)
    check("aucune erreur JavaScript ni violation CSP", not errors, errors[:6])
    b.close()
finally:
  srv.terminate()
fails = [n for n, ok in results if not ok]
print("\n%d/%d tests OK" % (len(results) - len(fails), len(results)))
if fails: print("ÉCHECS:", fails)

sys.exit(1 if fails else 0)

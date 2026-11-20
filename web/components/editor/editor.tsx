"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m as motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Eye, RotateCcw, X } from "lucide-react";
import { api, cleanupLegacy, publicLink, randomKey, slugify, userError, type ApiError, type MyInvitation } from "@/lib/api";
import { auth, consumeRedirect, type User } from "@/lib/auth";
import {
  applyPreset, defaults, eventDate, isAllowedMapsUrl, isValidLink, matchingPreset, parseDate, PRESETS, sanitizeConfig,
  today, type Config,
} from "@/lib/invitation";
import { loadAllFonts } from "@/lib/fonts";
import { source, track } from "@/lib/track";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { InvitationView } from "@/components/invitation/invitation-view";
import { Iphone } from "@/components/magic/iphone";
import { AuthPanel } from "@/components/site/auth-panel";
import { ShareKit } from "@/components/site/share-kit";
import { StepCustomize, StepDate, StepNames, StepReview, StepRsvp, StepStyle, StepTexts, StepVenue } from "./steps";
import { PublishRitual } from "./publish-ritual";
import { BrandMark } from "@/components/site/brand-mark";

export const STEPS = [
  { id: "names", label: "Les mariés" },
  { id: "date", label: "La date" },
  { id: "venue", label: "Le lieu" },
  { id: "style", label: "L’ambiance" },
  { id: "custom", label: "Personnaliser" },
  { id: "texts", label: "Textes" },
  { id: "rsvp", label: "Réponses" },
  { id: "review", label: "Aperçu" },
] as const;
const TOTAL = STEPS.length;
const DRAFT_KEY = "fp:draft", PENDING_KEY = "fp:publish-pending", MAX_YEAR = 2050;

function storeGet(k: string) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } }
function storeSet(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } }
function storeDel(k: string) { try { localStorage.removeItem(k); } catch {} }
const pendingSet = () => { try { sessionStorage.setItem(PENDING_KEY, String(Date.now())); } catch {} };
const pendingDel = () => { try { sessionStorage.removeItem(PENDING_KEY); } catch {} };
const pendingGet = () => { try { const t = Number(sessionStorage.getItem(PENDING_KEY)); return t > 0 && Date.now() - t < 3600000; } catch { return false; } };

function duration(s: number | null | undefined) {
  if (!s) return "";
  if (s < 60) return "Créé en moins d’une minute.";
  const m = Math.round(s / 60);
  return m < 120 ? "Créé en " + m + (m > 1 ? " minutes." : " minute.") : "";
}

export type EditorApi = {
  state: Config;
  update: (fn: (c: Config) => Config) => void;
  editing: boolean;
  pendingPhotos: number;
  setPendingPhotos: (fn: (n: number) => number) => void;
  replayIntro: () => void;
  dateRef: React.RefObject<HTMLInputElement | null>;
  deadlineRef: React.RefObject<HTMLInputElement | null>;
  next: () => void;
};

export function Editor() {
  const reduce = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<Config>(defaults);
  const [editing, setEditing] = useState<{ slug: string } | null>(null);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [msg, setMsg] = useState("");
  const [notice, setNotice] = useState("");
  const [restored, setRestored] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [gate, setGate] = useState(false);
  const [published, setPublished] = useState<{ slug: string; seconds: number | null } | null>(null);
  const [ritual, setRitual] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [pendingPhotos, setPendingPhotos] = useState(0);
  const [wide, setWide] = useState(true);
  const dateRef = useRef<HTMLInputElement>(null), deadlineRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const scroller = useRef<HTMLDivElement>(null), drawerScroller = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state); stateRef.current = state;
  const stepRef = useRef(step); stepRef.current = step;

  // Temps réellement passé à créer : page visible et action dans les 2 dernières minutes.
  const activeMs = useRef(0);
  useEffect(() => {
    let lastTick = Date.now(), lastAct = Date.now();
    const mark = () => { lastAct = Date.now(); };
    const evs = ["input", "click", "keydown", "pointerdown", "scroll"];
    evs.forEach((e) => document.addEventListener(e, mark, { passive: true, capture: true }));
    const t = setInterval(() => {
      const now = Date.now();
      if (document.visibilityState === "visible" && now - lastAct < 120000) activeMs.current += Math.min(now - lastTick, 10000);
      lastTick = now;
    }, 5000);
    return () => { clearInterval(t); evs.forEach((e) => document.removeEventListener(e, mark, { capture: true })); };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const f = () => setWide(mq.matches); f(); mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);

  // L'aperçu suit l'écran en cours : les textes montrent les sections, les réponses montrent le formulaire invité.
  useEffect(() => {
    if (!ready || published) return;
    const id = STEPS[step]?.id;
    const t = window.setTimeout(() => {
      const el = scroller.current; if (!el || el.closest(".fp-locked") || el.classList.contains("fp-locked")) return;
      const sel = id === "texts" ? ".fp section" : id === "rsvp" ? ".sec-rsvp" : null;
      const target = sel ? el.querySelector<HTMLElement>(sel) : null;
      const top = target ? Math.max(0, target.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - 8) : 0;
      el.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
    }, 380);
    return () => clearTimeout(t);
  }, [step, ready, published, reduce]);

  // ---------- Brouillon : sauvegarde automatique, restauré au rechargement ----------
  const dirty = useRef(false), timer = useRef<number>(0);
  const editingRef = useRef(editing); editingRef.current = editing;
  const publishedRef = useRef(published); publishedRef.current = published;
  const writeDraft = useCallback(() => {
    clearTimeout(timer.current); timer.current = 0;
    if (editingRef.current || publishedRef.current || !dirty.current) return;
    dirty.current = false;
    const d = { state: stateRef.current, activeMs: activeMs.current, step: stepRef.current + 1 };
    if (!storeSet(DRAFT_KEY, d)) storeSet(DRAFT_KEY, { ...d, state: { ...d.state, photos: [] } }); // photos trop lourdes : on garde le reste
    setSaved(true);
  }, []);
  const saveDraft = useCallback(() => {
    if (editingRef.current || publishedRef.current) return;
    dirty.current = true; setSaved(false); clearTimeout(timer.current); timer.current = window.setTimeout(writeDraft, 300);
  }, [writeDraft]);
  useEffect(() => {
    const vis = () => { if (document.visibilityState === "hidden") writeDraft(); };
    window.addEventListener("pagehide", writeDraft); document.addEventListener("visibilitychange", vis);
    return () => { window.removeEventListener("pagehide", writeDraft); document.removeEventListener("visibilitychange", vis); };
  }, [writeDraft]);

  const update = useCallback((fn: (c: Config) => Config) => {
    setState((c) => {
      const n = fn(c);
      // Funnel : « démarrage » = le couple a saisi ses prénoms (une fois par onglet, jamais en modification).
      if (!editingRef.current && (n.partner1 !== c.partner1 || n.partner2 !== c.partner2) && (n.partner1.trim() || n.partner2.trim())) track("editor_start", { src: source(), once: true });
      return n;
    });
    saveDraft(); setMsg("");
  }, [saveDraft]);
  useEffect(() => { if (ready && !editing) saveDraft(); }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Démarrage : faire-part du compte (modification), sinon brouillon ou nouveau ----------
  const enterEdit = useCallback((inv: MyInvitation, fromDraft: boolean) => {
    setState(sanitizeConfig(inv.config)); setEditing({ slug: inv.slug }); setStep(0); setRestored(false);
    setNotice(fromDraft ? "Ce compte a déjà un faire-part : le voici. Un compte ne peut en avoir qu’un, vous pouvez le modifier autant que vous voulez." : "");
    setGate(false); setReady(true);
  }, []);
  const startNew = useCallback(() => {
    let s = defaults(), st = 0, restoredDraft = false;
    const draft = storeGet(DRAFT_KEY);
    if (draft && draft.state && typeof draft.state === "object") {
      const meta = draft.state.meta;
      s = sanitizeConfig(draft.state); if (meta) s.meta = s.meta || meta;
      if (typeof draft.activeMs === "number" && draft.activeMs >= 0 && draft.activeMs < 864e5) activeMs.current = draft.activeMs;
      restoredDraft = !!(s.partner1 || s.partner2 || s.date || s.venueName || s.photos.length);
      st = Math.min(Math.max((parseInt(draft.step, 10) || 1) - 1, 0), TOTAL - 1);
    }
    // Arrivée depuis la page d'accueil : prénoms et ambiance (dans le fragment, jamais envoyés au serveur).
    const h = new URLSearchParams(location.hash.slice(1));
    let touched = false;
    (["partner1", "partner2"] as const).forEach((f, i) => {
      const v = (h.get("p" + (i + 1)) || "").trim().slice(0, 40);
      if (v && !s[f]) { s = { ...s, [f]: v }; touched = true; }
    });
    const hp = PRESETS.find((x) => x.id === h.get("s"));
    if (hp) { s = applyPreset(s, hp); touched = true; }
    // Depuis le générateur de texte (/outils/generateur-texte-faire-part/) : sous-titre et message choisis par le couple.
    const sub = (h.get("sub") || "").trim(), msg = (h.get("msg") || "").trim();
    if (sub || msg) { s = sanitizeConfig({ ...s, ...(sub ? { subtitle: sub } : {}), ...(msg ? { message: msg } : {}) }); touched = true; }
    if (touched) { restoredDraft = false; try { history.replaceState(null, "", location.pathname + location.search); } catch {} }
    setState(s); setStep(st); setRestored(restoredDraft); setReady(true);
    if (touched) { dirty.current = true; timer.current = window.setTimeout(writeDraft, 300); }
  }, [writeDraft]);

  useEffect(() => {
    if (window.top !== window.self) { document.body.textContent = ""; return; } // anti-clickjacking
    cleanupLegacy(); consumeRedirect();
    const u = auth.user(); setUser(u);
    const unsub = auth.subscribe(() => setUser(auth.user()));
    if (!u) {
      startNew();
      if (auth.takeRedirectError() && pendingGet()) { setStep(TOTAL - 1); setGate(true); }
      return unsub;
    }
    api.myInvitation().then((inv) => {
      if (inv) { pendingDel(); enterEdit(inv, pendingGet()); return; }
      startNew();
      // Retour d'une connexion par lien email demandée au moment de publier : on termine la publication.
      if (pendingGet() && auth.justSignedIn) setAutoPublish(true); else pendingDel();
    }).catch((e: ApiError) => {
      startNew();
      if (!e?.signedOut) setNotice("Impossible de vérifier votre compte pour l’instant. Vous pouvez continuer votre brouillon.");
    });
    return unsub;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Validation ----------
  const validate = useCallback((n: number): string => {
    const s = stateRef.current, id = STEPS[n].id;
    if (id === "names" && (!s.partner1.trim() || !s.partner2.trim())) return "Indiquez les deux prénoms.";
    if (id === "date") {
      const y = /^(\d+)-/.exec(s.date || "");
      if (y && +y[1] > MAX_YEAR) return "L’année ne peut pas dépasser " + MAX_YEAR + " : vérifiez la date.";
      if (!s.date && dateRef.current?.validity.badInput) return "La date est incomplète : vérifiez le jour, le mois et l’année.";
      const d = eventDate(s);
      if (!d) return "Indiquez la date du mariage.";
      if (!editingRef.current && d < today()) return "Cette date est déjà passée : vérifiez l’année.";
    }
    if (id === "venue") {
      if (!s.venueName.trim()) return "Indiquez le nom du lieu.";
      if (s.mapsUrl.trim() && !isAllowedMapsUrl(s.mapsUrl.trim())) return "Ce lien n’est pas reconnu. Collez un lien Google Maps, Apple Plans, OpenStreetMap ou Waze (commençant par https://), ou laissez le champ vide.";
    }
    if (id === "custom" && pendingPhotos > 0) return "Patientez quelques secondes, les photos sont en cours de préparation.";
    if (id === "texts") {
      for (const [k, name] of [["lodging", "hébergements"], ["gifts", "cagnotte"]] as const) {
        const sec = s.sections[k];
        if (sec.on && (sec.url || "").trim() && !isValidLink((sec.url || "").trim())) return "Le lien « " + name + " » n’est pas valide : il doit commencer par https://";
      }
    }
    if (id === "rsvp") {
      if (!s.rsvp.deadline && deadlineRef.current?.validity.badInput) return "La date limite de réponse est incomplète.";
      if (s.rsvp.deadline) {
        const dl = parseDate(s.rsvp.deadline), wd = eventDate(s);
        if (!dl) return "La date limite de réponse n’est pas valide.";
        if (!editingRef.current && dl < today()) return "La date limite de réponse est déjà passée.";
        if (wd && dl > wd) return "La date limite de réponse doit précéder le mariage.";
      }
    }
    return "";
  }, [pendingPhotos]);

  const go = useCallback((n: number) => {
    setDir(n > stepRef.current ? 1 : -1); setStep(n); setMsg("");
    window.scrollTo({ top: 0 });
    setTimeout(() => titleRef.current?.focus({ preventScroll: true }), 40);
  }, []);
  const next = useCallback(() => {
    const e = validate(stepRef.current);
    if (e) { setMsg(e); return; }
    if (stepRef.current < TOTAL - 1) go(stepRef.current + 1);
  }, [validate, go]);
  useEffect(() => { if (STEPS[step].id === "custom" || STEPS[step].id === "style") loadAllFonts(); }, [step]);

  // ---------- Publication ----------
  const cleanForPublish = useCallback((): Config => {
    let cfg = sanitizeConfig({ ...stateRef.current, partner1: stateRef.current.partner1.trim(), partner2: stateRef.current.partner2.trim() });
    cfg.sections.program.items = cfg.sections.program.items.filter((it) => it.label.trim());
    (["lodging", "gifts"] as const).forEach((k) => { cfg.sections[k].url = (cfg.sections[k].url || "").trim(); });
    if (!cfg.tz) { try { cfg.tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch {} }
    cfg = sanitizeConfig(cfg); // revalide le fuseau
    const prev = stateRef.current.meta;
    cfg.meta = { durationSec: editingRef.current ? prev?.durationSec ?? null : Math.round(activeMs.current / 1000), updatedAt: new Date().toISOString(),
      // Provenance du couple (coefficient viral), conservée lors des modifications.
      src: editingRef.current ? prev?.src || "" : source() };
    return cfg;
  }, []);

  const finishPublish = useCallback((slug: string, seconds: number | null) => {
    setPublished({ slug, seconds }); setRitual(!editingRef.current); setGate(false);
    clearTimeout(timer.current); storeDel(DRAFT_KEY); pendingDel();
    window.scrollTo({ top: 0 });
  }, []);

  const openAuth = useCallback(() => {
    writeDraft(); pendingSet(); track("auth_gate", { once: true }); setGate(true);
  }, [writeDraft]);

  const publish = useCallback(async () => {
    if (!auth.user()) { openAuth(); return; }
    setMsg(""); setBusy(true);
    const cfg = cleanForPublish(), seconds = cfg.meta?.durationSec ?? null;
    const fail = (e: ApiError) => {
      setBusy(false);
      if (e?.signedOut) { setUser(null); openAuth(); return; }
      if (e?.onePerAccount) { afterSignIn(); return; } // créé entre-temps ailleurs : on ouvre celui qui existe
      setMsg(userError(e));
    };
    if (editingRef.current) {
      try { await api.updateInvitation(cfg); setBusy(false); finishPublish(editingRef.current.slug, 0); } catch (e) { fail(e as ApiError); }
      return;
    }
    for (let tries = 0; tries < 4; tries++) {
      // Suffixe aléatoire de 8 caractères (~10^12 possibilités) : les liens ne sont pas devinables.
      const slug = (slugify(stateRef.current.partner1 + "-" + stateRef.current.partner2) || "faire-part") + "-" + randomKey(8);
      try { await api.createInvitation(slug, cfg); setBusy(false); finishPublish(slug, seconds); return; }
      catch (e) { if (!(e as ApiError)?.conflict || tries === 3) { fail(e as ApiError); return; } }
    }
  }, [cleanForPublish, finishPublish, openAuth]); // eslint-disable-line react-hooks/exhaustive-deps

  // Juste après la connexion : si ce compte a déjà un faire-part, on l'ouvre (un seul par compte) ; sinon on publie.
  const afterSignIn = useCallback(async () => {
    setUser(auth.user()); setGate(false); setBusy(true); setMsg("Connexion réussie, publication en cours…");
    try {
      const inv = await api.myInvitation();
      setBusy(false); setMsg("");
      if (inv) { pendingDel(); enterEdit(inv, true); return; }
      publish();
    } catch (e) { setBusy(false); setMsg(userError(e)); }
  }, [enterEdit, publish]);

  const [autoPublish, setAutoPublish] = useState(false);
  useEffect(() => {
    if (!autoPublish || !ready) return;
    setAutoPublish(false);
    for (let i = 0; i < TOTAL; i++) if (validate(i)) { pendingDel(); return; }
    setStep(TOTAL - 1); publish();
  }, [autoPublish, ready, validate, publish]);

  const tryPublish = () => {
    for (let i = 0; i < TOTAL; i++) { const e = validate(i); if (e) { if (i !== step) go(i); setMsg(e); return; } }
    publish();
  };

  // ---------- Aperçu ----------
  const preview = useMemo(() => sanitizeConfig(state), [state]);
  const replayIntro = useCallback(() => setReplayKey((k) => k + 1), []);
  const api_: EditorApi = { state, update, editing: !!editing, pendingPhotos, setPendingPhotos, replayIntro, dateRef, deadlineRef, next };
  const presetMatch = matchingPreset(preview);

  // Entrée = étape suivante (sauf dans les zones de texte et le programme).
  function onKey(e: React.KeyboardEvent) {
    const t = e.target as HTMLInputElement;
    if (e.key !== "Enter" || e.nativeEvent.isComposing || t.tagName !== "INPUT" || /^(checkbox|radio|file|button)$/.test(t.type)) return;
    if (t.closest("[data-program]")) return;
    e.preventDefault();
    if (step < TOTAL - 1) next(); else tryPublish();
  }

  if (!ready) {
    return (
      <div className="grid min-h-dvh place-items-center" role="status" aria-label="Chargement">
        <span className="size-10 animate-pulse rounded-full bg-muted" />
      </div>
    );
  }

  const phone = (ref: React.RefObject<HTMLDivElement | null>, intro = true) => (
    <Iphone screenRef={ref} screenClassName="overflow-y-auto overscroll-contain [scrollbar-width:none]">
      <InvitationView cfg={preview} mode="preview" preview introOnMount={false} intro={intro} autoOpen={900} replayKey={replayKey} scroller={ref} showReplay={false} showRespond={false} namesTag="p" />
    </Iphone>
  );

  // ---------- Écran final (publié) ----------
  if (published) {
    const url = publicLink(published.slug);
    return (
      <div className="paper-grain min-h-dvh">
        <Toaster position="top-center" toastOptions={{ classNames: { toast: "!rounded-[20px] !shadow-lift !border-border !font-sans" } }} />
        <AnimatePresence>{ritual && <PublishRitual cfg={preview} onDone={() => setRitual(false)} />}</AnimatePresence>
        <Header user={user} progress={1} hideAccount noBar />
        <main id="done" className="mx-auto grid max-w-5xl gap-12 px-5 pb-24 pt-6 lg:grid-cols-[1fr_340px] lg:items-start lg:pt-14">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ritual ? 2.7 : 0, duration: 0.5 }} className="flex flex-col gap-8">
            <div>
              <p className="t-label mb-3">{editing ? "C’est enregistré" : "C’est prêt"}</p>
              <h1 id="done-title" tabIndex={-1} className="t-display !text-[clamp(40px,6vw,60px)] outline-none">
                {editing ? "Vos modifications sont en ligne" : "Votre faire-part est prêt à partir"}
              </h1>
              <p className="t-lead mt-4" id="done-time">{editing ? "Même lien, même faire-part : vos invités voient déjà la nouvelle version." : duration(published.seconds)}</p>
            </div>
            <div className="flex flex-col gap-3">
              <h2 className="text-[15px] font-medium">Le lien à envoyer à vos invités</h2>
              <ShareKit url={url} cfg={preview} slug={published.slug} />
              <p className="done-note text-[14px] text-muted-foreground">Collez-le dans un message, un email ou un groupe WhatsApp : vos invités répondent directement dessus.{user?.email ? ` Vous retrouverez ce faire-part et les réponses en vous connectant avec ${user.email}, depuis n’importe quel appareil.` : ""}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg"><a id="go-mine" href="/mon-faire-part/">Voir les réponses de mes invités</a></Button>
              <Button asChild variant="outline" size="lg"><a id="public-open" href={url} target="_blank" rel="noopener">Ouvrir le faire-part</a></Button>
              <Button asChild variant="ghost" size="lg"><a id="edit-again" href="/creer/">Modifier</a></Button>
            </div>
          </motion.div>
          <div className="hidden w-[300px] lg:block">{phone(scroller, false)}</div>
        </main>
      </div>
    );
  }

  const S = STEPS[step];
  const variants = { enter: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * 28 }), center: { opacity: 1, x: 0 }, exit: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * -28 }) };

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(440px,40%)_1fr]" onKeyDown={onKey}>
      <Toaster position="top-center" toastOptions={{ classNames: { toast: "!rounded-[20px] !shadow-lift !border-border !font-sans" } }} />
      <div className="relative flex min-h-dvh flex-col">
        <Header user={user} progress={(step + 1) / TOTAL} saved={!editing && saved} />
        <main id="wizard" className="mx-auto flex w-full max-w-[560px] flex-1 flex-col px-5 pb-40 pt-4 sm:px-8 lg:pt-10">
          {(restored || notice || editing) && (
            <div className="mb-6 flex flex-col gap-2">
              {editing && <p className="t-label !text-gold-ink">Modifier mon faire-part</p>}
              {restored && (
                <p id="draft-note" className="flex flex-wrap items-center gap-x-2 rounded-2xl bg-muted/70 px-4 py-3 text-[14px] text-muted-foreground">
                  Votre brouillon a été restauré.
                  <button type="button" id="reset-draft" className="font-medium text-foreground underline decoration-foreground/25 underline-offset-4" onClick={() => { storeDel(DRAFT_KEY); location.replace("/creer/"); }}>Recommencer à zéro</button>
                </p>
              )}
              {notice && <p id="notice" role="status" className="rounded-2xl bg-muted/70 px-4 py-3 text-[14px] text-muted-foreground">{notice}</p>}
            </div>
          )}
          <p className="t-label mb-3" aria-live="polite"><span className="sr-only">Étape </span>{step + 1} / {TOTAL} · {S.label}</p>
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.section key={S.id} data-step={step + 1} custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}>
              {S.id === "names" && <StepNames ed={api_} titleRef={titleRef} />}
              {S.id === "date" && <StepDate ed={api_} titleRef={titleRef} />}
              {S.id === "venue" && <StepVenue ed={api_} titleRef={titleRef} />}
              {S.id === "style" && <StepStyle ed={api_} titleRef={titleRef} current={presetMatch?.id} />}
              {S.id === "custom" && <StepCustomize ed={api_} titleRef={titleRef} />}
              {S.id === "texts" && <StepTexts ed={api_} titleRef={titleRef} />}
              {S.id === "rsvp" && <StepRsvp ed={api_} titleRef={titleRef} />}
              {S.id === "review" && <StepReview ed={api_} titleRef={titleRef} phone={wide ? null : phone(drawerScroller)} />}
            </motion.section>
          </AnimatePresence>
          <p id="step-msg" role="alert" className="form-msg mt-5 min-h-[1.4em] text-[15px] text-destructive">{msg}</p>
        </main>

        {/* Barre flottante : Retour / Continuer (verre) */}
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 pb-safe lg:absolute">
          <div className="pointer-events-auto mx-auto flex w-full max-w-[560px] items-center gap-2 px-4 sm:px-8">
            <div className="glass flex w-full items-center gap-2 rounded-full p-1.5">
              {step > 0
                ? <Button id="back" variant="ghost" className="shrink-0 px-4" onClick={() => go(step - 1)}><ArrowLeft aria-hidden="true" /> Retour</Button>
                : <span className="w-2" />}
              {!wide && step < TOTAL - 1 && (
                <Button id="show-preview" variant="ghost" size="icon" className="ml-auto shrink-0" onClick={() => setPreviewOpen(true)} aria-label="Voir l’aperçu"><Eye aria-hidden="true" /></Button>
              )}
              {step < TOTAL - 1
                ? <Button id="next" className={cn(wide && "ml-auto", "min-w-[132px] shrink-0")} onClick={next}>Continuer <ArrowRight aria-hidden="true" /></Button>
                : <Button id="publish" className="ml-auto min-w-0 shrink" onClick={tryPublish} disabled={busy}>{busy ? "Publication…" : editing ? "Enregistrer les modifications" : "Publier mon faire-part"}</Button>}
            </div>
          </div>
        </div>
      </div>

      {/* Aperçu en direct : à droite sur grand écran (60 %), en panneau plein écran d'un geste sur mobile */}
      {wide && (
        <aside id="preview-pane" aria-label="Aperçu du faire-part" className="paper-grain sticky top-0 hidden h-dvh flex-col items-center justify-center gap-5 bg-[radial-gradient(120%_80%_at_50%_30%,#F3EDE3,#EAE2D5)] px-8 lg:flex">
          <div style={{ width: "min(360px, calc((100dvh - 150px) * 433 / 882))" }}>{phone(scroller)}</div>
          {preview.intro !== "aucune" && (
            <Button id="replay-intro" variant="glass" size="sm" onClick={replayIntro}><RotateCcw aria-hidden="true" /> Revoir l’ouverture</Button>
          )}
        </aside>
      )}
      {!wide && (
        <Drawer open={previewOpen} onOpenChange={setPreviewOpen}>
          <DrawerContent className="h-[92dvh]">
            <DrawerTitle className="sr-only">Aperçu du faire-part</DrawerTitle>
            <div className="flex items-center justify-between px-5 pb-3 pt-1">
              {preview.intro !== "aucune" ? <Button variant="ghost" size="sm" onClick={replayIntro}><RotateCcw aria-hidden="true" /> Revoir l’ouverture</Button> : <span />}
              <Button id="close-preview" variant="ghost" size="icon-sm" onClick={() => setPreviewOpen(false)} aria-label="Fermer l’aperçu"><X aria-hidden="true" /></Button>
            </div>
            <div className="mx-auto w-full max-w-[340px] flex-1 px-4 pb-6" style={{ maxWidth: "min(340px, calc((92dvh - 110px) * 433 / 882))" }}>{phone(drawerScroller)}</div>
          </DrawerContent>
        </Drawer>
      )}

      {/* Au moment de publier : le compte, dans un panneau qui monte du bas (mobile) ou une fenêtre (ordinateur) */}
      {wide ? (
        <Dialog open={gate} onOpenChange={(o) => { if (!o) { pendingDel(); setGate(false); } }}>
          <DialogContent id="auth-step" className="sm:max-w-[440px]">
            <DialogTitle className="sr-only">Votre compte</DialogTitle>
            <AuthPanel title="Dernière étape : votre compte" text="Il sert à retrouver votre faire-part, à le modifier et à voir les réponses de vos invités. Votre faire-part est publié juste après."
              returnTo={location.href.split("#")[0].split("?")[0]} onSignedIn={afterSignIn} />
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={gate} onOpenChange={(o) => { if (!o) { pendingDel(); setGate(false); } }} repositionInputs={false}>
          <DrawerContent id="auth-step">
            <DrawerTitle className="sr-only">Votre compte</DrawerTitle>
            <div className="mx-auto w-full max-w-[440px] overflow-y-auto px-6 pb-8 pt-3">
              <AuthPanel title="Dernière étape : votre compte" text="Il sert à retrouver votre faire-part, à le modifier et à voir les réponses de vos invités. Votre faire-part est publié juste après."
                returnTo={location.href.split("#")[0].split("?")[0]} onSignedIn={afterSignIn} />
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}

function Header({ user, progress, saved, hideAccount, noBar }: { user: User | null; progress: number; saved?: boolean; hideAccount?: boolean; noBar?: boolean }) {
  return (
    <header className="sticky top-0 z-20 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[560px] items-center justify-between gap-4 px-5 sm:px-8 lg:max-w-none">
        <a href="/" className="flex items-center gap-2 font-serif text-[22px] font-medium tracking-[-0.01em]"><BrandMark className="size-8" />Maison Meli</a>
        <div className="flex items-center gap-4 text-[14px]">
          <AnimatePresence>
            {saved && (
              <motion.span key="s" className="flex items-center gap-1 text-muted-foreground" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} aria-live="polite">
                <Check className="size-3.5" aria-hidden="true" /> Enregistré
              </motion.span>
            )}
          </AnimatePresence>
          {!hideAccount && <a id="mine-link" href="/mon-faire-part/" className="font-medium text-foreground/80 hover:text-foreground">{user ? "Mon faire-part" : "Se connecter"}</a>}
        </div>
      </div>
      {noBar ? <div className="h-px w-full bg-foreground/[0.06]" aria-hidden="true" /> : (
        <div className="h-[2px] w-full bg-foreground/[0.06]" aria-hidden="true">
          <motion.div className="h-full bg-foreground" initial={false} animate={{ width: progress * 100 + "%" }} transition={{ type: "spring", stiffness: 200, damping: 30 }} />
        </div>
      )}
    </header>
  );
}


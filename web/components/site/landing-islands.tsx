"use client";

// Îlots interactifs de la page d'accueil. Le reste de la page est rendu côté serveur (HTML statique, aucun JavaScript).
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m as motion, useInView, useReducedMotion } from "motion/react";
import { ArrowRight, Check } from "lucide-react";
import { PRESETS, sampleConfig } from "@/lib/invitation";
import { loadFont } from "@/lib/fonts";
import { editorHref, landing, useLanding } from "@/lib/landing-store";
import { source, track } from "@/lib/track";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Iphone } from "@/components/magic/iphone";
import { ContainerScroll } from "@/components/aceternity/container-scroll";
import { InvitationView } from "@/components/invitation/invitation-view";
import { InvitationBody } from "@/components/invitation/invitation-body";
import { Envelope } from "@/components/invitation/envelope";
import { styleAttrs } from "@/components/invitation/ornaments";

function useSignedIn() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem("fp:session") || "null"); setOn(!!(s && s.user && typeof s.user.id === "string")); } catch {}
  }, []);
  return on;
}

// Met à jour les liens rendus côté serveur (cartes d'ambiance, boutons « Créer ») avec les prénoms saisis.
export function LinkSync() {
  const { p1, p2, style } = useLanding();
  useEffect(() => {
    document.querySelectorAll<HTMLAnchorElement>("a[data-create]").forEach((a) => { a.href = editorHref(p1.trim(), p2.trim(), style || undefined); });
    document.querySelectorAll<HTMLAnchorElement>("a[data-style]").forEach((a) => { a.href = editorHref(p1.trim(), p2.trim(), a.dataset.style); });
    // Miniatures des ambiances (HTML statique) : les prénoms saisis remplacent l'exemple.
    document.querySelectorAll<HTMLElement>("#ambiances .mini-names").forEach((el) => {
      const first = el.firstChild, last = el.lastChild;
      if (first?.nodeType === 3) first.textContent = (p1.trim() || "Camille") + " ";
      if (last?.nodeType === 3 && last !== first) last.textContent = " " + (p2.trim() || "Hugo");
    });
  }, [p1, p2, style]);
  useEffect(() => { track("landing_view", { src: source() }); }, []);
  return null;
}

export function NavAccount() {
  const on = useSignedIn();
  return <a href="admin.html" id="nav-mine" className="rounded-full px-3 py-2 text-foreground/75 hover:text-foreground">{on ? "Mon faire-part" : "Se connecter"}</a>;
}

// Les polices des ambiances ne sont chargées qu'à l'approche de la section (une seule pour le haut de page).
export function FontWarmer() {
  const ref = useRef<HTMLSpanElement>(null);
  const near = useInView(ref, { margin: "600px", once: true });
  useEffect(() => { if (near) PRESETS.forEach((p) => loadFont(p.font)); }, [near]);
  return <span ref={ref} aria-hidden="true" />;
}

// ---------------------------------------------------------------- Héros : le faire-part vivant
export function Hero() {
  const { p1, p2, style } = useLanding();
  const preset = PRESETS.find((p) => p.id === style) || PRESETS[0];
  const cfg = useMemo(() => sampleConfig({ p1: p1.trim(), p2: p2.trim() }, preset), [p1, p2, preset]);
  const screen = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [replay, setReplay] = useState(0);
  const signedIn = useSignedIn();
  // L'enveloppe s'ouvre quand le téléphone est réellement à l'écran (sur mobile, il est sous le texte).
  const phoneBox = useRef<HTMLDivElement>(null);
  const seen = useInView(phoneBox, { amount: 0.55, once: true });
  const warmed = useRef(false);
  const warm = () => { if (!warmed.current) { warmed.current = true; PRESETS.forEach((p) => loadFont(p.font)); } };
  const href = editorHref(p1.trim(), p2.trim(), style || undefined);
  const go = (e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); location.href = href; } };

  return (
    <div className="relative mx-auto grid max-w-[1180px] items-center gap-14 px-5 pb-20 pt-28 sm:px-8 md:pt-36 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pb-28">
      <div className="flex flex-col items-start">
        <p className="t-label mb-5 flex items-center gap-2"><span className="inline-block size-1.5 rounded-full bg-accent" aria-hidden="true" />Faire-part de mariage digital · gratuit</p>
        <h1 id="h-hero" className="t-display max-w-[13ch]">Le faire-part de mariage qui fait dire «&nbsp;oh&nbsp;»</h1>
        <p className="t-lead mt-6 max-w-[34ch]">Écrivez vos prénoms, choisissez une ambiance, partagez un lien. Vos invités ouvrent l’enveloppe sur leur téléphone et vous répondent en un geste.</p>
        <div id="start" data-hero-cta role="group" aria-label="Commencer mon faire-part" className="mt-9 flex w-full max-w-[520px] flex-col gap-2 rounded-[28px] border border-white/70 bg-card/80 p-2 shadow-lift backdrop-blur sm:flex-row sm:items-center sm:rounded-full">
          <div className="flex min-w-0 flex-1 items-center">
            <label className="sr-only" htmlFor="p1">Premier prénom</label>
            <input id="p1" value={p1} onChange={(e) => landing.set({ p1: e.target.value })} onKeyDown={go} maxLength={40} autoComplete="off" autoCapitalize="words" placeholder="Camille"
              className="h-12 w-full min-w-0 flex-1 rounded-full bg-transparent px-4 font-serif text-[22px] outline-none placeholder:text-foreground/30 focus-visible:bg-muted/50" />
            <span aria-hidden="true" className="font-serif text-[24px] italic text-accent">&amp;</span>
            <label className="sr-only" htmlFor="p2">Second prénom</label>
            <input id="p2" value={p2} onChange={(e) => landing.set({ p2: e.target.value })} onKeyDown={go} maxLength={40} autoComplete="off" autoCapitalize="words" placeholder="Hugo"
              className="h-12 w-full min-w-0 flex-1 rounded-full bg-transparent px-4 font-serif text-[22px] outline-none placeholder:text-foreground/30 focus-visible:bg-muted/50" />
          </div>
          <Button asChild size="lg" className="h-12"><a href={href} data-create id="cta-hero">Créer mon faire-part <ArrowRight /></a></Button>
        </div>
        <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[14px] text-muted-foreground">
          {["Gratuit, sans carte bancaire", "Prêt en 3 minutes", "Modifiable après l’envoi"].map((t) => <span key={t} className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-gold-ink" aria-hidden="true" />{t}</span>)}
        </p>
        {signedIn && <p className="mt-3 text-[14px]"><a href="admin.html" id="back-link" className="font-medium underline decoration-foreground/25 underline-offset-4">Retrouver mon faire-part et les réponses</a></p>}
      </div>

      <div className="flex flex-col items-center gap-6">
        <ContainerScroll className="w-[min(320px,76vw)]">
          <div ref={phoneBox}>
            <Iphone screenRef={screen} screenClassName="overflow-y-auto overscroll-contain [scrollbar-width:none]" id="demo-phone">
              <InvitationView cfg={cfg} mode="preview" preview autoOpen={seen ? (reduce ? 300 : 700) : undefined} replayKey={replay} scroller={screen} showReplay={false} showRespond={false} withRsvp={false} namesTag="p" />
            </Iphone>
          </div>
        </ContainerScroll>
        <div className="flex flex-col items-center gap-3">
          <p id="demo-label" className="text-[13px] text-muted-foreground">Essayez une ambiance</p>
          <div id="demo-pills" role="radiogroup" aria-labelledby="demo-label" className="flex max-w-[440px] flex-wrap justify-center gap-1" onPointerEnter={warm} onFocus={warm}>
            {PRESETS.map((p) => {
              const on = p.id === preset.id, c = sampleConfig({}, p);
              return (
                <button key={p.id} type="button" role="radio" aria-checked={on} aria-label={p.label} title={p.label}
                  onClick={() => { warm(); landing.set({ style: p.id }); if (screen.current) screen.current.scrollTop = 0; setReplay((r) => r + 1); }}
                  className={cn("pill relative grid size-8 place-items-center rounded-full transition-transform duration-200 active:scale-90", on ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : "hover:scale-110")}>
                  <span className="fp block size-6 rounded-full shadow-[inset_0_0_0_1px_rgba(28,26,23,.1)]" {...styleAttrs(c)} style={{ background: "var(--paper)" }}>
                    <span className="absolute inset-[30%] rounded-full" style={{ background: "var(--accent-deep)" }} />
                  </span>
                </button>
              );
            })}
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p key={preset.id} className="font-serif text-[18px] italic" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>{preset.label}</motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// Mobile : « Créer mon faire-part » flottant, en verre, une fois le héros dépassé.
export function FloatingCta() {
  const { p1, p2, style } = useLanding();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = document.querySelector("[data-hero-cta]"); if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el); return () => io.disconnect();
  }, []);
  return (
    <AnimatePresence>
      {show && (
        <motion.div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-safe md:hidden" initial={{ y: 90, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 90, opacity: 0 }}>
          <a href={editorHref(p1.trim(), p2.trim(), style || undefined)} data-create className="glass mb-1 inline-flex h-14 items-center gap-2 rounded-full px-7 text-[16px] font-medium">Créer mon faire-part <ArrowRight className="size-[18px]" /></a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------- Ce que vivent vos invités (récit au scroll)
export function GuestsStory({ steps }: { steps: { k: string; t: string; d: string }[] }) {
  const { p1, p2, style } = useLanding();
  const preset = PRESETS.find((p) => p.id === style) || PRESETS[0];
  const cfg = useMemo(() => sampleConfig({ p1: p1.trim(), p2: p2.trim() }, preset), [p1, p2, preset]);
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const near = useInView(box, { margin: "400px", once: true }); // les téléphones ne sont montés qu'à l'approche
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i)); }), { rootMargin: "-45% 0px -45% 0px" });
    refs.current.forEach((r) => r && io.observe(r)); return () => io.disconnect();
  }, []);
  return (
    <div ref={box} className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-24">
      <div className="sticky top-28 hidden h-[calc(100dvh-160px)] max-h-[680px] items-center justify-center lg:flex">
        <div className="w-[min(300px,calc((100dvh-180px)*433/882))]">{near && <StoryPhone cfg={cfg} step={active} />}</div>
      </div>
      <div className="flex flex-col gap-16 lg:gap-0">
        {steps.map((s, i) => (
          <div key={i} data-i={i} ref={(el) => { refs.current[i] = el; }} className="flex flex-col gap-8 lg:min-h-[75dvh] lg:justify-center">
            <div>
              <p className="t-label mb-3 !text-gold-ink">{String(i + 1).padStart(2, "0")} · {s.k}</p>
              <h3 className="font-serif text-[clamp(30px,3.4vw,40px)] font-medium leading-[1.1] tracking-[-0.015em]">{s.t}</h3>
              <p className="t-lead mt-4 max-w-[42ch]">{s.d}</p>
            </div>
            <div className="mx-auto w-[min(260px,66vw)] lg:hidden">{near ? <StoryPhone cfg={cfg} step={i} /> : <Iphone />}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
function StoryPhone({ cfg, step }: { cfg: ReturnType<typeof sampleConfig>; step: number }) {
  const [k, setK] = useState(0);
  return (
    <Iphone screenClassName="overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={step} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
          {step === 0 && <Envelope key={k} cfg={{ ...cfg, intro: "enveloppe" }} mode="contained" onDone={() => setTimeout(() => setK((x) => x + 1), 900)} />}
          {step === 1 && <div className="h-full overflow-hidden"><InvitationBody cfg={cfg} preview namesTag="p" rsvp={null} /></div>}
          {step === 2 && (
            <div className="fp h-full" {...styleAttrs(cfg)}>
              <section className="sec-rsvp alt flex h-full flex-col justify-center" style={{ padding: "2rem 1rem" }} aria-hidden="true">
                <div className="form-wrap">
                  <div className="rq-progress"><span style={{ width: "40%" }} /></div>
                  <p className="rq-count">Question 2 sur 5</p>
                  <p className="rq-title">Serez-vous des nôtres ?</p>
                  <div className="rq-cards">
                    <span className="rq-card is-on"><span className="rq-card-t">Oui, avec plaisir</span><span className="rq-card-s">Je serai là</span><span className="rq-card-dot"><Check /></span></span>
                    <span className="rq-card"><span className="rq-card-t">Je ne pourrai pas</span><span className="rq-card-s">Avec regret</span><span className="rq-card-dot" /></span>
                  </div>
                </div>
              </section>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </Iphone>
  );
}

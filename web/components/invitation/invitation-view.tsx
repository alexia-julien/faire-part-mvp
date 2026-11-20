"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, m as motion } from "motion/react";
import { RotateCcw } from "lucide-react";
import type { Config, RsvpData } from "@/lib/invitation";
import { loadFont } from "@/lib/fonts";
import { Envelope } from "./envelope";
import { InvitationBody } from "./invitation-body";
import { RsvpFlow } from "./rsvp-flow";

type Props = {
  cfg: Config;
  /** Page publique (plein écran) ou aperçu dans un conteneur défilable. */
  mode?: "page" | "preview";
  /** Aperçu : rendu figé (formulaire inactif). */
  preview?: boolean;
  /** Jouer l'ouverture au montage. Changer replayKey la rejoue. */
  intro?: boolean;
  /** false : pas d'ouverture au premier affichage (aperçu de l'éditeur), seulement sur demande (replayKey). */
  introOnMount?: boolean;
  replayKey?: number;
  autoOpen?: number;
  namesTag?: "h1" | "p";
  previous?: Partial<RsvpData> | null;
  madeWith?: string;
  onMadeWith?: () => void;
  onSubmit?: (data: RsvpData) => Promise<void>;
  /** Conteneur défilable de l'aperçu (pour bloquer son défilement pendant l'ouverture). */
  scroller?: React.RefObject<HTMLElement | null>;
  showReplay?: boolean;
  showRespond?: boolean;
  /** false : vitrine (page d'accueil), le formulaire de réponse n'est pas monté. */
  withRsvp?: boolean;
};

// Lumière sur la dorure : le reflet suit l'inclinaison du téléphone (gyroscope, autorisé par le tap d'ouverture),
// ou le doigt / la souris en repli. Aucun effet si le faire-part n'a pas de dorure ou si le mouvement est réduit.
function useFoilLight(root: React.RefObject<HTMLDivElement | null>, enabled: boolean) {
  useEffect(() => {
    const el = root.current;
    if (!el || !enabled || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0, tx = 0.5;
    const apply = () => { raf = 0; el.style.setProperty("--light", (tx * 100).toFixed(1) + "%"); };
    const set = (v: number) => { tx = Math.max(0, Math.min(1, v)); if (!raf) raf = requestAnimationFrame(apply); };
    const onTilt = (e: DeviceOrientationEvent) => { if (e.gamma != null) set(0.5 + e.gamma / 70); };
    const onMove = (e: PointerEvent) => { const r = el.getBoundingClientRect(); set((e.clientX - r.left) / Math.max(1, r.width)); };
    window.addEventListener("deviceorientation", onTilt);
    el.addEventListener("pointermove", onMove);
    return () => { window.removeEventListener("deviceorientation", onTilt); el.removeEventListener("pointermove", onMove); cancelAnimationFrame(raf); };
  }, [root, enabled]);
}

export function InvitationView({
  cfg, mode = "page", preview = false, intro = true, introOnMount = true, replayKey = 0, autoOpen, namesTag, previous, madeWith, onMadeWith, onSubmit,
  scroller, showReplay = mode === "page", showRespond = mode === "page", withRsvp = true,
}: Props) {
  const hasIntro = cfg.intro !== "aucune";
  const [introOn, setIntroOn] = useState(introOnMount && intro && hasIntro);
  const [screenH, setScreenH] = useState<number | undefined>();
  const [revealKey, setRevealKey] = useState(0);
  const [rsvpVisible, setRsvpVisible] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  useEffect(() => { loadFont(cfg.font); }, [cfg.font]);

  // Rejouer l'ouverture (bouton « Revoir », changement d'introduction dans l'éditeur).
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (hasIntro && intro) setIntroOn(true);
  }, [replayKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!hasIntro) setIntroOn(false); }, [hasIntro]);

  // Pendant l'ouverture : page (ou aperçu) bloquée, contenu inerte.
  useEffect(() => {
    if (!introOn) return;
    const el = mode === "page" ? document.documentElement : scroller?.current;
    if (!el) return;
    el.classList.add("fp-locked");
    if (mode !== "page") { el.scrollTop = 0; setScreenH(el.clientHeight); }
    return () => el.classList.remove("fp-locked");
  }, [introOn, mode, scroller]);

  // La révélation des prénoms démarre pendant le fondu de l'enveloppe (une seule fois par ouverture).
  const revealed = useRef(false);
  const onReveal = useCallback(() => { if (revealed.current) return; revealed.current = true; setRevealKey((k) => k + 1); }, []);
  const done = useCallback(() => { setIntroOn(false); }, []);
  useEffect(() => { if (introOn) revealed.current = false; }, [introOn]);
  // iOS : l'accès au gyroscope se demande pendant un geste de l'utilisateur, donc au tap d'ouverture.
  const onOpen = useCallback(() => {
    const D = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
    if (mode === "page" && cfg.foil !== "aucune" && D?.requestPermission) D.requestPermission().catch(() => {});
  }, [mode, cfg.foil]);

  useFoilLight(root, cfg.foil !== "aucune");

  // Bouton « Répondre » flottant : masqué quand la section réponse est à l'écran.
  useEffect(() => {
    if (!showRespond) return;
    const target = root.current?.querySelector(".sec-rsvp");
    if (!target || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setRsvpVisible(e.isIntersecting), { threshold: 0.15 });
    io.observe(target);
    return () => io.disconnect();
  }, [showRespond, cfg]);

  // « Revoir l'ouverture » (page invitée) : visible en haut du faire-part, effacé ensuite pour ne rien recouvrir.
  const [away, setAway] = useState(false);
  useEffect(() => {
    if (mode !== "page" || !showReplay) return;
    const f = () => setAway(window.scrollY > window.innerHeight * 0.5);
    f(); window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, [mode, showReplay]);

  const couple = (cfg.partner1 || "") + " & " + (cfg.partner2 || "");
  const reveal = revealKey > 0 || (!intro || !hasIntro);
  const respond = () => root.current?.querySelector(".sec-rsvp")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className={"fp-stage" + (mode === "preview" ? " in-preview" : "")}>
      <div inert={introOn || undefined}>
        <InvitationBody
          ref={root}
          revealKey={revealKey}
          cfg={cfg}
          preview={preview}
          namesTag={namesTag}
          reveal={reveal && revealKey > 0}
          rsvp={withRsvp ? <RsvpFlow cfg={cfg} preview={preview} previous={previous} couple={couple} madeWith={madeWith} onMadeWith={onMadeWith} onSubmit={onSubmit} /> : <p className="preview-note" style={{ margin: 0 }}>Vos invités répondent ici, une question à la fois.</p>}
        />
      </div>

      <AnimatePresence>
        {introOn && <Envelope key={"e" + replayKey} cfg={cfg} mode={mode === "page" ? "fixed" : "contained"} autoOpen={autoOpen} onOpen={onOpen} onReveal={onReveal} onDone={done} height={mode === "page" ? undefined : screenH} />}
      </AnimatePresence>

      {!introOn && (showReplay || showRespond) && (
        <div className={"fp-float" + (mode === "preview" ? " in-preview" : "")} {...{ "data-theme": cfg.theme }}>
          <AnimatePresence>
            {showRespond && !rsvpVisible && (
              <motion.button key="r" type="button" className="fp-respond glass" onClick={respond}
                initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.96 }}>
                Répondre
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      )}
      {!introOn && showReplay && hasIntro && (
        <button type="button" data-theme={cfg.theme} className={"fp-replay glass" + (mode === "preview" ? " in-preview" : "") + (away ? " is-away" : "")} tabIndex={away ? -1 : undefined} onClick={() => setIntroOn(true)} aria-label="Revoir l’ouverture">
          <RotateCcw aria-hidden="true" /> <span>Revoir l’ouverture</span>
        </button>
      )}
    </div>
  );
}

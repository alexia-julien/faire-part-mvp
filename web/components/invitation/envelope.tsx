"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { m as motion, useReducedMotion } from "motion/react";
import { formatDate, initial, type Config } from "@/lib/invitation";
import { styleAttrs } from "./ornaments";

// Le moment signature : l'ouverture de l'enveloppe (≈ 2 s de chorégraphie, puis la révélation des prénoms sur la page).
// 1. enveloppe texturée, cachet de cire aux initiales ; 2. au tap, le cachet se fend, le rabat s'ouvre en 3D ;
// 3. la carte glisse hors de l'enveloppe, qui descend et s'efface ; la carte s'agrandit jusqu'à devenir la page.
// Passable à tout moment (tap, Échap, « Passer »). Mouvement réduit : simple fondu.
// Une mécanique, neuf matières : papier, cachet et doublure viennent de l'ambiance (styles/invitation.css).

const EASE = [0.32, 0.72, 0, 1] as const;
const OPEN_MS = 1900;

type Props = {
  cfg: Config;
  /** "fixed" : plein écran (page invité). "contained" : dans un aperçu (téléphone de la landing, éditeur). */
  mode?: "fixed" | "contained";
  /** Ouverture automatique après ce délai (ms) — page d'accueil. */
  autoOpen?: number;
  onOpen?: () => void;
  /** Début du fondu final : la page peut commencer à révéler les prénoms. */
  onReveal?: () => void;
  onDone: () => void;
  /** Hauteur de l'écran d'aperçu (mode contenu). */
  height?: number;
};

export function Envelope({ cfg, mode = "fixed", autoOpen, onOpen, onReveal, onDone, height }: Props) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<"closed" | "opening" | "leaving">("closed");
  const timers = useRef<number[]>([]);
  const finished = useRef(false);
  const btn = useRef<HTMLButtonElement>(null);
  const monogram = cfg.intro === "monogramme";

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    timers.current.forEach(clearTimeout);
    onReveal?.();
    onDone();
  }, [onDone, onReveal]);

  const open = useCallback(() => {
    if (phase !== "closed") { finish(); return; } // deuxième tap pendant l'animation : on passe directement
    onOpen?.();
    const leaving = () => { setPhase("leaving"); onReveal?.(); };
    if (reduce) { leaving(); timers.current.push(window.setTimeout(finish, 320)); return; }
    setPhase("opening");
    timers.current.push(window.setTimeout(leaving, monogram ? 700 : OPEN_MS - 380));
    timers.current.push(window.setTimeout(finish, monogram ? 1100 : OPEN_MS));
  }, [phase, reduce, finish, onOpen, onReveal, monogram]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { if (phase === "closed") open(); else finish(); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, finish, phase]);

  useEffect(() => {
    if (autoOpen == null && !monogram) return;
    const t = window.setTimeout(() => open(), autoOpen ?? (reduce ? 600 : 2200));
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const ini1 = initial(cfg.partner1) || "A", ini2 = initial(cfg.partner2) || "J";
  const date = formatDate(cfg, false);
  const opening = phase !== "closed";
  // L'enveloppe (fond, poche, rabat) descend et s'efface pendant que la carte grandit.
  const leave = opening ? { y: "70%", opacity: 0 } : { y: "0%", opacity: 1 };
  const leaveT = opening ? { delay: 1.15, duration: 0.55, ease: EASE } : { duration: 0 };

  return (
    <motion.div
      className={"fp fp-intro" + (mode === "contained" ? " in-preview" : "") + (monogram ? " fp-intro-monogramme" : " fp-intro-enveloppe")}
      {...styleAttrs(cfg)}
      style={mode === "contained" ? { height: height ? height + "px" : "100%" } : undefined}
      initial={false}
      animate={{ opacity: phase === "leaving" ? 0 : 1 }}
      transition={{ duration: reduce ? 0.3 : 0.38, ease: "easeOut" }}
      onClick={() => { if (opening) finish(); }}
    >
      <motion.p className="intro-kicker" animate={{ opacity: opening ? 0 : 1, y: opening ? -8 : 0 }} transition={{ duration: 0.3 }}>
        Vous avez reçu une invitation
      </motion.p>

      {monogram ? (
        <button ref={btn} type="button" className="mono" aria-label="Ouvrir l’invitation" onClick={(e) => { e.stopPropagation(); open(); }}>
          <motion.span className="mono-letters" initial={reduce ? false : { opacity: 0, filter: "blur(6px)", scale: 0.96 }} animate={opening ? { opacity: 0, scale: 1.08 } : { opacity: 1, filter: "blur(0px)", scale: 1 }} transition={{ duration: opening ? 0.5 : 1.1, ease: EASE }}>
            {ini1}<span className="amp">&amp;</span>{ini2}
          </motion.span>
          {date && <motion.span className="mono-date" initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: opening ? 0 : 1, y: 0 }} transition={{ delay: opening ? 0 : 0.5, duration: 0.6 }}>{date}</motion.span>}
        </button>
      ) : (
        <motion.button ref={btn} type="button" className={"env" + (opening ? " is-open" : "")} aria-label="Ouvrir l’invitation" onClick={(e) => { e.stopPropagation(); open(); }}
          animate={phase === "closed" && !reduce ? { y: [0, -5, 0] } : { y: 0 }}
          transition={phase === "closed" ? { duration: 3.2, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}>
          <motion.span className="env-back" animate={leave} transition={leaveT} />
          <motion.span
            className="env-card"
            animate={opening ? { y: ["0%", "0%", "-64%", "-46%"], scale: [1, 1, 1, 3.4], opacity: [1, 1, 1, 0] } : { y: "0%", scale: 1, opacity: 1 }}
            transition={opening ? { duration: OPEN_MS / 1000, times: [0, 0.36, 0.66, 1], ease: EASE } : { duration: 0 }}
          >
            <span className="env-card-names">{cfg.partner1 || "Prénom"} <span className="amp">&amp;</span> {cfg.partner2 || "Prénom"}</span>
            {date && <span className="env-card-date">{date}</span>}
          </motion.span>
          <motion.span className="env-front" animate={leave} transition={leaveT} />
          <motion.span className="env-flap" style={{ transformOrigin: "50% 0%" }}
            animate={opening ? { rotateX: 180, ...leave } : { rotateX: 0 }}
            transition={opening ? { rotateX: { delay: 0.22, duration: 0.62, ease: EASE }, y: leaveT, opacity: leaveT } : { duration: 0 }}>
            <span className="env-flap-in" />
          </motion.span>
          <span className="env-seal" aria-hidden="true">
            <motion.span className="seal-half seal-l" animate={opening ? { rotate: -22, x: -14, y: 10, opacity: 0 } : { rotate: 0, x: 0, y: 0, opacity: 1 }} transition={{ duration: 0.5, ease: EASE }}>
              <Seal a={ini1} b={ini2} />
            </motion.span>
            <motion.span className="seal-half seal-r" animate={opening ? { rotate: 22, x: 14, y: 10, opacity: 0 } : { rotate: 0, x: 0, y: 0, opacity: 1 }} transition={{ duration: 0.5, ease: EASE }}>
              <Seal a={ini1} b={ini2} />
            </motion.span>
          </span>
          <span className="env-glint" aria-hidden="true" />
        </motion.button>
      )}

      <motion.p className="intro-hint" animate={{ opacity: opening ? 0 : 1 }} transition={{ duration: 0.25 }}>
        {monogram ? "Touchez pour ouvrir" : "Touchez l’enveloppe pour l’ouvrir"}
      </motion.p>
      <button type="button" className="intro-skip" onClick={(e) => { e.stopPropagation(); finish(); }}>Passer</button>
    </motion.div>
  );
}

// Cachet de cire : bord irrégulier, anneau estampé, initiales en relief.
function Seal({ a, b }: { a: string; b: string }) {
  return (
    <svg viewBox="0 0 120 120" className="seal-svg">
      <path className="seal-wax" d="M111.9 60C111.9 66.2 107.3 72.5 104.7 78.5C102.1 84.6 100.7 92.1 96.3 96.3C92 100.6 84.4 101.5 78.3 104.3C72.3 107.1 66.2 112.9 60 113.2C53.8 113.5 46.6 109.1 41 105.9C35.3 102.7 30.8 98.3 26.2 93.8C21.6 89.4 16 85 13.3 79.3C10.6 73.7 9.7 66.4 9.8 60C9.8 53.6 11 46.5 13.7 40.8C16.4 35.2 21.5 30.3 26.1 26.1C30.8 21.9 36 18.7 41.6 15.6C47.3 12.5 53.6 8.1 60 7.5C66.4 6.8 74.4 8.5 80.1 11.5C85.8 14.6 89.9 20.9 94.1 25.9C98.3 30.9 102.2 35.6 105.1 41.3C108.1 47 112 53.8 111.9 60Z" />
      <circle className="seal-ring" cx="60" cy="60" r="38" />
      <text className="seal-text" x="60" y="70" textAnchor="middle">{a}<tspan className="seal-amp" dx="2" dy="-2">&amp;</tspan><tspan dx="2" dy="2">{b}</tspan></text>
    </svg>
  );
}

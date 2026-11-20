"use client";

import { useEffect, useRef } from "react";
import { m as motion, useReducedMotion } from "motion/react";
import confetti from "canvas-confetti";
import { formatDate, initial, type Config } from "@/lib/invitation";
import { styleAttrs } from "@/components/invitation/ornaments";

// Le rituel de publication : la carte se glisse dans l'enveloppe, le rabat se referme, un cachet de cire la scelle.
// Une seule pluie de confettis or et ivoire. Passable d'un tap ; mouvement réduit = simple fondu.
const EASE = [0.32, 0.72, 0, 1] as const;

export function PublishRitual({ cfg, onDone }: { cfg: Config; onDone: () => void }) {
  const reduce = useReducedMotion();
  const done = useRef(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const finish = () => { if (!done.current) { done.current = true; onDone(); } };

  useEffect(() => {
    const t1 = window.setTimeout(() => {
      if (reduce) return;
      // Sans « worker » (la CSP interdit les scripts blob:) : le canevas est animé sur le fil principal, une seule fois.
      const fire = confetti.create(canvas.current!, { resize: true, useWorker: false });
      fire({ particleCount: 70, spread: 70, startVelocity: 32, gravity: 0.9, scalar: 0.9, ticks: 180, origin: { y: 0.52 },
        colors: ["#B8975A", "#D9C08A", "#F3E6C4", "#FAF7F2", "#E9DCC3"], disableForReducedMotion: true });
    }, 1550);
    const t2 = window.setTimeout(finish, reduce ? 700 : 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const date = formatDate(cfg, false);
  return (
    <motion.div className="fp publish-ritual fixed inset-0 z-[80] flex flex-col items-center justify-center gap-8 bg-background px-6" {...styleAttrs(cfg)}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.45 } }} onClick={finish} role="status" aria-live="polite">
      <canvas ref={canvas} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />
      <p className="intro-kicker">Mise sous pli…</p>
      <div className="env is-sealing">
        <span className="env-back" />
        <motion.span className="env-card" initial={reduce ? false : { y: "-78%" }} animate={{ y: "0%" }} transition={{ delay: 0.2, duration: 0.8, ease: EASE }}>
          <span className="env-card-names">{cfg.partner1} <span className="amp">&amp;</span> {cfg.partner2}</span>
          {date && <span className="env-card-date">{date}</span>}
        </motion.span>
        <span className="env-front" />
        <motion.span className="env-flap" style={{ transformOrigin: "50% 0%", zIndex: 4 }} initial={reduce ? false : { rotateX: 180 }} animate={{ rotateX: 0 }} transition={{ delay: 0.95, duration: 0.55, ease: EASE }}>
          <span className="env-flap-in" />
        </motion.span>
        <motion.span className="env-seal" initial={reduce ? false : { scale: 1.7, opacity: 0, rotate: -12 }} animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ delay: 1.45, type: "spring", stiffness: 420, damping: 16 }} aria-hidden="true">
          <svg viewBox="0 0 120 120" className="seal-svg">
            <path className="seal-wax" d="M111.9 60C111.9 66.2 107.3 72.5 104.7 78.5C102.1 84.6 100.7 92.1 96.3 96.3C92 100.6 84.4 101.5 78.3 104.3C72.3 107.1 66.2 112.9 60 113.2C53.8 113.5 46.6 109.1 41 105.9C35.3 102.7 30.8 98.3 26.2 93.8C21.6 89.4 16 85 13.3 79.3C10.6 73.7 9.7 66.4 9.8 60C9.8 53.6 11 46.5 13.7 40.8C16.4 35.2 21.5 30.3 26.1 26.1C30.8 21.9 36 18.7 41.6 15.6C47.3 12.5 53.6 8.1 60 7.5C66.4 6.8 74.4 8.5 80.1 11.5C85.8 14.6 89.9 20.9 94.1 25.9C98.3 30.9 102.2 35.6 105.1 41.3C108.1 47 112 53.8 111.9 60Z" />
            <circle className="seal-ring" cx="60" cy="60" r="38" />
            <text className="seal-text" x="60" y="70" textAnchor="middle">{initial(cfg.partner1)}<tspan className="seal-amp" dx="2" dy="-2">&amp;</tspan><tspan dx="2" dy="2">{initial(cfg.partner2)}</tspan></text>
          </svg>
        </motion.span>
      </div>
      <motion.p className="intro-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.7 }}>Votre faire-part est prêt à partir</motion.p>
    </motion.div>
  );
}

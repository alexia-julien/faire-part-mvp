"use client";

import { useEffect } from "react";
import { LazyMotion, MotionConfig } from "motion/react";
import { startSessionClock } from "@/lib/track";
import { startErrorLog } from "@/lib/feedback";

const features = () => import("@/lib/motion-features").then((r) => r.default);

// Motion respecte prefers-reduced-motion partout ; ressort doux par défaut pour les transitions d'interface.
// strict : seuls les composants légers « m » sont autorisés (le moteur complet n'est jamais embarqué).
export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => { startErrorLog(); startSessionClock(); }, []);
  return (
    <LazyMotion features={features} strict>
      <MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 380, damping: 36, mass: 0.9 }}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}

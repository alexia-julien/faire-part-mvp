"use client";

import { useRef, type ReactNode } from "react";
import { m as motion, useReducedMotion, useScroll, useTransform } from "motion/react";

// Inspiré de « Container Scroll Animation » (Aceternity UI), réécrit et restylé : pas de fond sombre, pas de cadre
// « tech ». Le téléphone est légèrement incliné vers l'arrière et se redresse à mesure que l'on fait défiler la page.
// Aucun détournement du défilement : la transformation suit simplement la position de scroll.
export function ContainerScroll({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  // Héros : l'inclinaison suit les 420 premiers pixels de défilement de la page.
  const { scrollY } = useScroll();
  const rotateX = useTransform(scrollY, [0, 420], [14, 0]);
  const scale = useTransform(scrollY, [0, 420], [0.95, 1]);
  const y = useTransform(scrollY, [0, 420], [0, -10]);
  return (
    <div ref={ref} className={className} style={{ perspective: "1400px" }}>
      <motion.div style={reduce ? undefined : { rotateX, scale, y, transformOrigin: "50% 100%" }}>{children}</motion.div>
    </div>
  );
}

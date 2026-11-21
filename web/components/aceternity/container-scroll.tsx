"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Inspiré de « Container Scroll Animation » (Aceternity UI), réécrit et restylé : pas de fond sombre, pas de cadre
// « tech ». Le téléphone est légèrement incliné vers l'arrière et se redresse à mesure que l'on fait défiler la page.
// Aucun détournement du défilement : la transformation suit simplement la position de scroll.
// Sans le moteur de Motion (useScroll/useTransform tiraient ~100 Ko de JavaScript) : un écouteur de défilement passif
// qui écrit la transformation une fois par image. Mouvement réduit : aucune transformation.
const RANGE = 420; // l'inclinaison suit les 420 premiers pixels de défilement de la page

export function ContainerScroll({ children, className }: { children: ReactNode; className?: string }) {
  const inner = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { el.style.transform = "none"; return; }
    let raf = 0;
    const apply = () => {
      raf = 0;
      const p = Math.min(1, Math.max(0, window.scrollY / RANGE));
      el.style.transform = `translateY(${(-10 * p).toFixed(2)}px) scale(${(0.95 + 0.05 * p).toFixed(4)}) rotateX(${(14 * (1 - p)).toFixed(2)}deg)`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);
  return (
    <div className={className} style={{ perspective: "1400px" }}>
      <div ref={inner} style={{ transformOrigin: "50% 100%", willChange: "transform", transform: "translateY(0px) scale(0.95) rotateX(14deg)" }}>{children}</div>
    </div>
  );
}

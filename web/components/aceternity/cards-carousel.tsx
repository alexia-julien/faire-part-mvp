"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Inspiré de « Apple Cards Carousel » (Aceternity UI), réécrit et restylé : défilement horizontal natif
// (doigt, trackpad, clavier), accroche douce sur chaque carte, flèches en verre sur ordinateur.
export function CardsCarousel({ children, label, className }: { children: ReactNode[]; label: string; className?: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const update = () => {
    const el = track.current; if (!el) return;
    setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
  };
  useEffect(() => { update(); }, []);
  const by = (d: number) => {
    const el = track.current; if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    el.scrollBy({ left: d * ((card?.offsetWidth || 300) + 16) * (el.clientWidth > 900 ? 2 : 1), behavior: "smooth" });
  };
  return (
    <div className={cn("relative", className)}>
      <div ref={track} onScroll={update} role="region" aria-roledescription="carrousel" aria-label={label} tabIndex={0}
        className="relative flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-5 pb-6 pt-2 outline-none [scrollbar-width:none] sm:px-8 lg:px-[max(32px,calc((100vw-1180px)/2))] [&::-webkit-scrollbar]:hidden">
        {children.map((c, i) => (
          <div key={i} data-card role="group" aria-roledescription="carte" aria-label={`${i + 1} sur ${children.length}`} className="shrink-0 snap-start scroll-ml-5 sm:scroll-ml-8">{c}</div>
        ))}
      </div>
      <div className="mx-auto mt-2 hidden max-w-[1180px] justify-end gap-2 px-8 md:flex">
        <button type="button" onClick={() => by(-1)} disabled={edge.start} aria-label="Ambiances précédentes"
          className="glass grid size-11 place-items-center rounded-full transition-opacity disabled:opacity-35"><ArrowLeft className="size-[18px]" /></button>
        <button type="button" onClick={() => by(1)} disabled={edge.end} aria-label="Ambiances suivantes"
          className="glass grid size-11 place-items-center rounded-full transition-opacity disabled:opacity-35"><ArrowRight className="size-[18px]" /></button>
      </div>
    </div>
  );
}

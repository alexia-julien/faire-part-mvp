"use client";

// Démo vivante d'une ambiance (pages /ambiances/… et /faire-part-mariage-whatsapp/) : le vrai faire-part dans un
// téléphone, l'enveloppe s'ouvre quand il arrive à l'écran. Rendu figé (pas de formulaire de réponse).
import { useMemo, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { RotateCcw } from "lucide-react";
import { PRESETS, sampleConfig } from "@/lib/invitation";
import { Iphone } from "@/components/magic/iphone";
import { InvitationView } from "@/components/invitation/invitation-view";

export function AmbianceDemo({ preset, p1, p2, label }: { preset: string; p1?: string; p2?: string; label: string }) {
  const p = PRESETS.find((x) => x.id === preset) || PRESETS[0];
  const cfg = useMemo(() => sampleConfig({ p1, p2 }, p), [p, p1, p2]);
  const screen = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const seen = useInView(box, { amount: 0.5, once: true });
  const reduce = useReducedMotion();
  const [replay, setReplay] = useState(0);
  return (
    <figure className="flex flex-col items-center gap-4">
      <div ref={box} className="w-[min(300px,74vw)]">
        <Iphone screenRef={screen} screenClassName="overflow-y-auto overscroll-contain [scrollbar-width:none]">
          <InvitationView cfg={cfg} mode="preview" preview autoOpen={seen ? (reduce ? 300 : 700) : undefined} replayKey={replay} scroller={screen} showReplay={false} showRespond={false} withRsvp={false} namesTag="p" />
        </Iphone>
      </div>
      <figcaption className="flex items-center gap-3 text-[13px] text-muted-foreground">
        {label}
        <button type="button" onClick={() => { if (screen.current) screen.current.scrollTop = 0; setReplay((r) => r + 1); }} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-foreground/80 hover:text-foreground">
          <RotateCcw className="size-3.5" aria-hidden="true" />Revoir l’ouverture
        </button>
      </figcaption>
    </figure>
  );
}

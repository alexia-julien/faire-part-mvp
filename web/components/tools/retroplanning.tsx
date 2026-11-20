"use client";

import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtLong, plan, type Kind } from "@/lib/retroplanning";

const KINDS: [Kind, string][] = [["standard", "Mariage standard"], ["vacances", "Été, pont ou vacances"], ["etranger", "À l’étranger, invités éloignés"]];

export function Retroplanning() {
  const [date, setDate] = useState("");
  const [kind, setKind] = useState<Kind>("standard");
  const steps = useMemo(() => plan(date, kind), [date, kind]);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="rounded-[28px] border border-border bg-background p-5 shadow-soft sm:p-8">
      <form className="grid gap-6 md:grid-cols-[auto_1fr] md:items-end" onSubmit={(e) => e.preventDefault()}>
        <label className="flex flex-col gap-1.5 text-[14px] font-medium">Date du mariage
          <input id="r-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-12 rounded-[14px] border border-border bg-card px-4 text-[16px] outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </label>
        <fieldset>
          <legend className="mb-2 text-[14px] font-medium">Type de mariage</legend>
          <div className="flex flex-wrap gap-2">
            {KINDS.map(([v, l]) => (
              <label key={v} className="cursor-pointer rounded-full border border-border px-4 py-2 text-[15px] has-[:checked]:border-foreground has-[:checked]:bg-foreground has-[:checked]:text-background has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
                <input type="radio" name="kind" value={v} checked={kind === v} onChange={() => setKind(v)} className="sr-only" />{l}
              </label>
            ))}
          </div>
        </fieldset>
      </form>
      <div aria-live="polite" className="mt-8">
        {!steps.length ? <p className="text-[15px] text-muted-foreground">Indiquez la date de votre mariage pour voir votre rétroplanning.</p> : (
          <ol id="r-steps" className="flex flex-col divide-y divide-border rounded-[20px] border border-border bg-card">
            {steps.map((s) => (
              <li key={s.id} data-step={s.id} className="grid gap-1 px-5 py-4 sm:grid-cols-[220px_1fr] sm:gap-6">
                <p className={"font-medium first-letter:uppercase " + (s.date < today ? "text-muted-foreground line-through" : "")}><time dateTime={s.date}>{fmtLong(s.date)}</time></p>
                <div><p className="font-medium">{s.label}{s.date < today && s.id !== "j" ? " (date passée : faites-le dès que possible)" : ""}</p><p className="text-[15px] text-muted-foreground">{s.note}</p></div>
              </li>
            ))}
          </ol>
        )}
      </div>
      <Button asChild size="lg" className="mt-6"><a href="/creer/" data-create>Créer mon faire-part <ArrowRight /></a></Button>
    </div>
  );
}

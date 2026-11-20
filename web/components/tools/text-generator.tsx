"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyText } from "@/lib/share";
import { editorLink, generate, type Ceremony, type GenInput, type Tone } from "@/lib/text-generator";

const field = "h-12 w-full min-w-0 rounded-[14px] border border-border bg-card px-4 text-[16px] outline-none focus-visible:ring-2 focus-visible:ring-ring";
const TONES: [Tone, string][] = [["classique", "Classique"], ["moderne", "Moderne"], ["humour", "Avec humour"], ["formel", "Très formel"]];
const CERS: [Ceremony, string][] = [["civil", "Civile"], ["religieux", "Religieuse"], ["laique", "Laïque"]];

function Chips<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-[14px] font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([v, l]) => (
          <label key={v} className="cursor-pointer rounded-full border border-border px-4 py-2 text-[15px] has-[:checked]:border-foreground has-[:checked]:bg-foreground has-[:checked]:text-background has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
            <input type="radio" name={label} value={v} checked={value === v} onChange={() => onChange(v)} className="sr-only" />{l}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function TextGenerator() {
  const [i, setI] = useState<GenInput>({ p1: "", p2: "", date: "", time: "15:00", place: "", tone: "classique", ceremony: "civil", byParents: false, parents: "", noKids: false, kitty: false, small: false, variant: 0 });
  const set = (patch: Partial<GenInput>) => setI((x) => ({ ...x, ...patch }));
  const out = useMemo(() => generate(i), [i]);
  const [copied, setCopied] = useState(false);
  return (
    <div className="grid gap-8 rounded-[28px] border border-border bg-background p-5 shadow-soft sm:p-8 lg:grid-cols-2">
      <form className="flex min-w-0 flex-col gap-6" onSubmit={(e) => e.preventDefault()} aria-label="Votre mariage">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex min-w-0 flex-col gap-1.5 text-[14px] font-medium">Premier prénom<input id="g-p1" className={field} value={i.p1} maxLength={40} placeholder="Camille" onChange={(e) => set({ p1: e.target.value })} /></label>
          <label className="flex min-w-0 flex-col gap-1.5 text-[14px] font-medium">Second prénom<input id="g-p2" className={field} value={i.p2} maxLength={40} placeholder="Thomas" onChange={(e) => set({ p2: e.target.value })} /></label>
          <label className="flex min-w-0 flex-col gap-1.5 text-[14px] font-medium">Date<input id="g-date" type="date" className={field} value={i.date} onChange={(e) => set({ date: e.target.value })} /></label>
          <label className="flex min-w-0 flex-col gap-1.5 text-[14px] font-medium">Heure<input id="g-time" type="time" className={field} value={i.time} onChange={(e) => set({ time: e.target.value })} /></label>
        </div>
        <label className="flex min-w-0 flex-col gap-1.5 text-[14px] font-medium">Lieu<input id="g-place" className={field} value={i.place} maxLength={80} placeholder="Domaine des Tilleuls, Gordes" onChange={(e) => set({ place: e.target.value })} /></label>
        <Chips label="Ton" value={i.tone} options={TONES} onChange={(tone) => set({ tone, variant: 0 })} />
        <Chips label="Cérémonie" value={i.ceremony} options={CERS} onChange={(ceremony) => set({ ceremony })} />
        <div className="flex flex-col gap-3 text-[15px]">
          <label className="flex items-center gap-3"><input type="checkbox" className="size-5 accent-foreground" checked={i.byParents} onChange={(e) => set({ byParents: e.target.checked })} />Les parents annoncent le mariage</label>
          {i.byParents && <input aria-label="Noms des parents" className={field} value={i.parents} maxLength={160} placeholder="Anne et Jacques Dumas, Sylvie et Henri Perrin" onChange={(e) => set({ parents: e.target.value })} />}
          <label className="flex items-center gap-3"><input type="checkbox" className="size-5 accent-foreground" checked={i.small} onChange={(e) => set({ small: e.target.checked })} />Mariage en petit comité</label>
          <label className="flex items-center gap-3"><input type="checkbox" className="size-5 accent-foreground" checked={i.noKids} onChange={(e) => set({ noKids: e.target.checked })} />Mariage sans enfants</label>
          <label className="flex items-center gap-3"><input type="checkbox" className="size-5 accent-foreground" checked={i.kitty} onChange={(e) => set({ kitty: e.target.checked })} />Mentionner une cagnotte</label>
        </div>
      </form>
      <div className="flex min-w-0 flex-col gap-4">
        <p className="text-[14px] font-medium" id="g-out-label">Votre texte</p>
        <output id="g-out" aria-labelledby="g-out-label" aria-live="polite" className="block min-h-[260px] whitespace-pre-line rounded-[20px] border border-dashed border-foreground/20 bg-card px-6 py-6 text-center font-serif text-[21px] leading-[1.5]">{out.full}</output>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => set({ variant: i.variant + 1 })} disabled={i.tone === "formel" && i.byParents}><RefreshCw /> Une autre version</Button>
          <Button type="button" variant="outline" id="g-copy" onClick={async () => { if (await copyText(out.full)) { setCopied(true); setTimeout(() => setCopied(false), 2000); } }}><Copy /> {copied ? "Copié !" : "Copier"}</Button>
        </div>
        <Button asChild size="lg" className="h-auto min-h-12 whitespace-normal py-3 text-center"><a id="g-use" href={editorLink(i, out)}>Mettre ce texte dans mon faire-part <ArrowRight /></a></Button>
        <p className="text-[13px] text-muted-foreground">Rien n’est enregistré : le texte est calculé dans votre navigateur. Dans le faire-part, la date et le lieu s’affichent sous le texte, avec le plan et le compte à rebours.</p>
      </div>
    </div>
  );
}

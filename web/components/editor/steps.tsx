"use client";

import { useRef, useState, type ReactNode, type RefObject } from "react";
import { AnimatePresence, m as motion } from "motion/react";
import { Check, ImagePlus, Star, Trash2, Plus, X } from "lucide-react";
import {
  applyPreset, DECORS, FOILS, FONTS, INTROS, PALETTES, PRESETS, resizeImage, sanitizeConfig, sectionDefaults, SHAPES, today,
  type Config, type Section,
} from "@/lib/invitation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { MiniCard } from "@/components/invitation/mini-card";
import { ShineBorder } from "@/components/magic/shine-border";
import type { EditorApi } from "./editor";

type P = { ed: EditorApi; titleRef: RefObject<HTMLHeadingElement | null> };
const isoToday = () => { const t = today(); return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0"); };

function Title({ titleRef, children, sub }: { titleRef: RefObject<HTMLHeadingElement | null>; children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-8">
      <h1 ref={titleRef} tabIndex={-1} className="t-section !text-[clamp(34px,4.6vw,46px)] outline-none">{children}</h1>
      {sub && <p className="mt-3 text-[16px] leading-relaxed text-muted-foreground">{sub}</p>}
    </div>
  );
}
function Field({ label, opt, htmlFor, children, hint }: { label: string; opt?: boolean; htmlFor?: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor} className="text-[14px] font-medium">{label}{opt && <span className="font-normal text-muted-foreground"> (facultatif)</span>}</Label>
      {children}
      {hint && <p className="text-[13px] leading-snug text-muted-foreground">{hint}</p>}
    </div>
  );
}
function ToggleRow({ id, label, sub, checked, onChange, disabled, children }: { id: string; label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; children?: ReactNode }) {
  return (
    <div className={cn("rounded-[20px] border border-border bg-card px-4 shadow-soft transition-colors", checked && children ? "pb-4" : "", disabled && "opacity-50")}>
      <label htmlFor={id} className={cn("flex min-h-[60px] cursor-pointer items-center justify-between gap-4", disabled && "cursor-not-allowed")}>
        <span className="flex flex-col"><span className="font-medium">{label}</span>{sub && <span className="text-[13px] text-muted-foreground">{sub}</span>}</span>
        <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
      </label>
      <AnimatePresence initial={false}>
        {checked && children && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }} className="overflow-hidden">
            <div className="flex flex-col gap-3 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 1. Les prénoms
export function StepNames({ ed, titleRef }: P) {
  const s = ed.state;
  return (
    <>
      <Title titleRef={titleRef} sub="Vos prénoms s’écrivent en direct sur le faire-part.">Qui se marie ?</Title>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Premier prénom" htmlFor="p1"><Input id="p1" data-bind="partner1" maxLength={40} autoComplete="off" autoCapitalize="words" placeholder="Alexia" value={s.partner1} onChange={(e) => ed.update((c) => ({ ...c, partner1: e.target.value }))} /></Field>
        <Field label="Second prénom" htmlFor="p2"><Input id="p2" data-bind="partner2" maxLength={40} autoComplete="off" autoCapitalize="words" placeholder="Julien" value={s.partner2} onChange={(e) => ed.update((c) => ({ ...c, partner2: e.target.value }))} /></Field>
      </div>
    </>
  );
}

// 2. La date
export function StepDate({ ed, titleRef }: P) {
  const s = ed.state;
  return (
    <>
      <Title titleRef={titleRef} sub="L’heure est facultative : sans elle, vos invités voient seulement le jour.">Quand ?</Title>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Date du mariage" htmlFor="date-input"><Input ref={ed.dateRef} id="date-input" data-bind="date" type="date" min={isoToday()} max="2050-12-31" value={s.date} onChange={(e) => ed.update((c) => ({ ...c, date: e.target.value }))} /></Field>
        <Field label="Heure de la cérémonie" opt htmlFor="time-input"><Input id="time-input" data-bind="time" type="time" value={s.time} onChange={(e) => ed.update((c) => ({ ...c, time: e.target.value }))} /></Field>
      </div>
    </>
  );
}

// 3. Le lieu
export function StepVenue({ ed, titleRef }: P) {
  const s = ed.state;
  return (
    <>
      <Title titleRef={titleRef}>Où ça se passe ?</Title>
      <div className="flex flex-col gap-5">
        <Field label="Nom du lieu" htmlFor="venue"><Input id="venue" data-bind="venueName" maxLength={80} placeholder="Domaine de l’Abbaye" value={s.venueName} onChange={(e) => ed.update((c) => ({ ...c, venueName: e.target.value }))} /></Field>
        <Field label="Adresse" htmlFor="address"><Textarea id="address" data-bind="venueAddress" maxLength={200} rows={2} placeholder={"Lieu-dit Vauluisant\n89190 Courgenay"} value={s.venueAddress} onChange={(e) => ed.update((c) => ({ ...c, venueAddress: e.target.value }))} /></Field>
        <Field label="Lien Google Maps" opt htmlFor="maps" hint="Google Maps, Apple Plans, OpenStreetMap ou Waze. Sans lien, nous le créons à partir du nom et de l’adresse.">
          <Input id="maps" data-bind="mapsUrl" type="url" inputMode="url" maxLength={300} placeholder="https://maps.app.goo.gl/…" value={s.mapsUrl} onChange={(e) => ed.update((c) => ({ ...c, mapsUrl: e.target.value }))} />
        </Field>
      </div>
    </>
  );
}

// 4. L'ambiance : neuf collections, un tap règle tout
export function StepStyle({ ed, titleRef, current }: P & { current?: string }) {
  const s = sanitizeConfig(ed.state);
  return (
    <>
      <Title titleRef={titleRef} sub="Couleurs, typographie, ornements, papier et cachet : tout se règle d’un geste. Vous pourrez affiner ensuite.">Choisissez une ambiance</Title>
      <div className="presets grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Ambiance">
        {PRESETS.map((p) => {
          const on = current === p.id, c = sanitizeConfig({ ...applyPreset(s, p), partner1: s.partner1, partner2: s.partner2 });
          return (
            <label key={p.id} className={cn("preset group relative flex cursor-pointer flex-col gap-2 rounded-[20px] bg-card p-2 pb-3 shadow-soft transition-transform duration-200 active:scale-[0.98]", on ? "ring-1 ring-accent/40" : "hover:shadow-lift")}>
              <input type="radio" name="preset" value={p.id} checked={on} className="sr-only" onChange={() => { ed.update((x) => applyPreset(x, p)); ed.replayIntro(); }} />
              <MiniCard cfg={c} className="rounded-[14px] shadow-[0_1px_2px_rgba(28,26,23,.06)]" />
              <span className="px-1.5 text-[15px] font-medium leading-tight">{p.label}</span>
              <span className="-mt-1.5 px-1.5 text-[12px] leading-snug text-muted-foreground">{p.tagline}</span>
              {on && <><ShineBorder shineColor={["#B8975A", "#F3E6C4", "#B8975A"]} borderWidth={1.5} duration={10} />
                <span className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-foreground text-background"><Check className="size-3.5" aria-hidden="true" /></span></>}
            </label>
          );
        })}
      </div>
      {!current && <p className="mt-4 text-[14px] text-muted-foreground">Style personnalisé : choisissez une ambiance pour revenir à une collection.</p>}
    </>
  );
}

// 5. Personnaliser : photos, puis les réglages fins
export function StepCustomize({ ed, titleRef }: P) {
  const s = ed.state;
  const [photoMsg, setPhotoMsg] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const MAX = 3;
  function add(files: FileList | null) {
    const list = Array.from(files || []).slice(0, Math.max(0, MAX - s.photos.length - ed.pendingPhotos));
    if (input.current) input.current.value = "";
    if (!list.length) return;
    const errors: string[] = [];
    ed.setPendingPhotos((n) => n + list.length); setPhotoMsg("Préparation des photos…");
    // Chaque photo est traitée séparément, et ajoutée dans l'ordre choisi par l'utilisateur.
    Promise.all(list.map((f) => resizeImage(f).catch((e) => { errors.push(e?.message || "Photo non utilisable."); return null; }))).then((res) => {
      ed.update((c) => { const photos = [...c.photos]; res.forEach((r) => { if (r && photos.length < MAX) photos.push(r); }); return { ...c, photos }; });
      ed.setPendingPhotos((n) => n - list.length);
      setPhotoMsg(errors[0] || "");
    });
  }
  const set = (k: keyof Config, v: unknown) => { ed.update((c) => ({ ...c, [k]: v })); if (k === "intro" && v !== "aucune") ed.replayIntro(); };
  return (
    <>
      <Title titleRef={titleRef} sub="Tout est facultatif : votre ambiance est déjà réglée.">Vos photos, votre style</Title>
      <div className="flex flex-col gap-3">
        <span className="text-[14px] font-medium">Photos <span className="font-normal text-muted-foreground">(1 à 3, la première est la photo principale)</span></span>
        <div id="thumbs" className="grid grid-cols-3 gap-3">
          {s.photos.map((src, i) => (
            <div key={src.slice(-24) + i} className="thumb group relative aspect-square overflow-hidden rounded-[16px] bg-muted shadow-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={"Photo " + (i + 1)} className="size-full object-cover" />
              {i === 0 ? <span className="absolute bottom-2 left-2 rounded-full bg-foreground/80 px-2 py-0.5 text-[11px] text-background">Principale</span>
                : <button type="button" className="main-btn absolute left-2 top-2 grid size-8 place-items-center rounded-full bg-white/85 text-foreground shadow-soft" aria-label={"Mettre la photo " + (i + 1) + " en photo principale"}
                  onClick={() => ed.update((c) => { const p = [...c.photos]; p.unshift(p.splice(i, 1)[0]); return { ...c, photos: p }; })}><Star className="size-4" /></button>}
              <button type="button" className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-white/85 text-foreground shadow-soft" aria-label={"Supprimer la photo " + (i + 1)}
                onClick={() => ed.update((c) => ({ ...c, photos: c.photos.filter((_, j) => j !== i) }))}><Trash2 className="size-4" /></button>
            </div>
          ))}
          {s.photos.length + ed.pendingPhotos < MAX && (
            <label id="add-photo" className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[16px] border border-dashed border-foreground/20 bg-card text-[13px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground">
              <ImagePlus className="size-6" aria-hidden="true" /> Ajouter
              <input ref={input} id="photo-input" type="file" accept="image/*" multiple className="sr-only" onChange={(e) => add(e.target.files)} />
            </label>
          )}
        </div>
        <p id="photo-msg" role="status" className="min-h-[1.2em] text-[13px] text-muted-foreground">{photoMsg}</p>
        {s.photos.length > 0 && (
          <div id="shape-field" className="flex flex-col gap-2">
            <span className="text-[14px] font-medium" id="lab-shape">Forme de la photo principale</span>
            <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-labelledby="lab-shape">
              {SHAPES.map((x) => (
                <label key={x.id} className={cn("shape-card flex cursor-pointer flex-col items-center gap-2 rounded-[16px] border bg-card p-3 text-[13px] transition-colors", s.photoShape === x.id ? "border-foreground/50" : "border-border")}>
                  <input type="radio" name="style-shape" value={x.id} className="sr-only" checked={s.photoShape === x.id} onChange={() => set("photoShape", x.id)} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.photos[0]} alt="" className={cn("h-14 object-cover", x.id === "arche" ? "w-11 rounded-t-full rounded-b-md" : x.id === "cercle" ? "w-14 rounded-full" : "w-16 rounded-md")} />
                  {x.label}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-8">
        <p className="mb-3 text-[14px] font-medium">Affiner le style</p>
        <Tabs defaultValue="colors" className="@container">
          <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-[16px] bg-muted p-1 group-data-[orientation=horizontal]/tabs:h-auto @[31rem]:grid-cols-5">
            {[["colors", "Couleurs"], ["font", "Typographie"], ["decor", "Ornements"], ["finish", "Finitions"], ["intro", "Ouverture"]].map(([v, l]) => (
              <TabsTrigger key={v} value={v} id={"tab-" + v} className="h-10 min-w-0 rounded-[12px] px-2 py-2 text-[14px] data-[state=active]:bg-card data-[state=active]:shadow-soft">{l}</TabsTrigger>
            ))}
          </TabsList>
          <TabsContent forceMount value="colors" className="mt-4 data-[state=inactive]:hidden">
            <div id="pick-theme" className="grid grid-cols-3 gap-2.5 sm:grid-cols-4" role="radiogroup" aria-label="Couleurs">
              {PALETTES.map((x) => (
                <Pick key={x.id} name="style-theme" value={x.id} on={s.theme === x.id} onPick={() => set("theme", x.id)}>
                  <span className="block size-10 rounded-full shadow-[inset_0_0_0_1px_rgba(28,26,23,.08)]" style={{ background: `conic-gradient(from 200deg,${x.sw[0]} 0 50%,${x.sw[1]} 50% 78%,${x.deep} 78% 100%)` }} />
                  <span>{x.label}</span>
                </Pick>
              ))}
            </div>
          </TabsContent>
          <TabsContent forceMount value="font" className="mt-4 data-[state=inactive]:hidden">
            <div id="pick-font" className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Typographie">
              {FONTS.map((x) => (
                <Pick key={x.id} name="style-font" value={x.id} on={s.font === x.id} onPick={() => set("font", x.id)}>
                  <span className="fp font-sample block w-full py-1 text-[22px] leading-tight !bg-transparent" data-font={x.id} style={{ fontFamily: "var(--names)", containerType: "normal" }}>{(s.partner1 || "Camille") + " & " + (s.partner2 || "Hugo")}</span>
                  <span>{x.label}</span>
                </Pick>
              ))}
            </div>
          </TabsContent>
          <TabsContent forceMount value="decor" className="mt-4 data-[state=inactive]:hidden">
            <div id="pick-decor" className="grid grid-cols-3 gap-2.5 sm:grid-cols-5" role="radiogroup" aria-label="Ornements">
              {DECORS.map((x) => (
                <Pick key={x.id} name="style-decor" value={x.id} on={s.decor === x.id} onPick={() => set("decor", x.id)}>
                  <MiniCard cfg={sanitizeConfig({ ...ed.state, decor: x.id })} className="w-full rounded-[10px]" />
                  <span>{x.label}</span>
                </Pick>
              ))}
            </div>
          </TabsContent>
          <TabsContent forceMount value="finish" className="mt-4 flex flex-col gap-4 data-[state=inactive]:hidden">
            <span className="text-[14px] font-medium" id="lab-foil">Impression des prénoms</span>
            <div id="pick-foil" className="grid grid-cols-4 gap-2.5" role="radiogroup" aria-labelledby="lab-foil">
              {FOILS.map((x) => (
                <Pick key={x.id} name="style-foil" value={x.id} on={s.foil === x.id} onPick={() => set("foil", x.id)}>
                  <span className="block size-10 rounded-full" style={{ background: `linear-gradient(135deg,${x.sw.join(",")})` }} />
                  <span>{x.label}</span>
                </Pick>
              ))}
            </div>
            <ToggleRow id="texture" label="Papier texturé" sub="Un grain fin, comme un papier coton" checked={s.texture} onChange={(v) => set("texture", v)} />
          </TabsContent>
          <TabsContent forceMount value="intro" className="mt-4 data-[state=inactive]:hidden">
            <p className="mb-3 text-[14px] text-muted-foreground">Ce que voient vos invités en ouvrant le lien, avant le faire-part.</p>
            <div id="pick-intro" className="grid gap-2.5" role="radiogroup" aria-label="Ouverture">
              {INTROS.map((x) => (
                <Pick key={x.id} name="style-intro" value={x.id} on={s.intro === x.id} onPick={() => set("intro", x.id)} row>
                  <span className="flex flex-col items-start text-left"><span className="text-[15px] font-medium text-foreground">{x.label}</span><span>{x.hint}</span></span>
                </Pick>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function Pick({ name, value, on, onPick, children, row }: { name: string; value: string; on: boolean; onPick: () => void; children: ReactNode; row?: boolean }) {
  return (
    <label className={cn("flex cursor-pointer gap-2 rounded-[16px] border bg-card p-3 text-[13px] text-muted-foreground transition-[border-color,transform] duration-200 active:scale-[0.97] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent",
      row ? "items-center justify-between" : "flex-col items-center text-center", on ? "border-foreground/50 text-foreground" : "border-border hover:border-foreground/20")}>
      <input type="radio" name={name} value={value} checked={on} onChange={onPick} className="sr-only" />
      {children}
      {row && <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border", on ? "border-foreground bg-foreground text-background" : "border-border")}>{on && <Check className="size-3.5" />}</span>}
    </label>
  );
}

// 6. Textes et sections
export function StepTexts({ ed, titleRef }: P) {
  const s = ed.state;
  const sec = <K extends keyof Config["sections"]>(id: K, patch: Partial<Config["sections"][K]>) =>
    ed.update((c) => ({ ...c, sections: { ...c.sections, [id]: { ...c.sections[id], ...patch } } }));
  // Première activation : contenu pré-rempli (sans écraser ce que l'utilisateur a déjà tapé).
  function toggle(id: keyof Config["sections"], on: boolean) {
    ed.update((c) => {
      const cur = c.sections[id] as Section & { items?: { time: string; label: string }[] };
      const n: Record<string, unknown> = { ...cur, on };
      if (on) {
        const d = sectionDefaults(id, c) as Section & { items?: { time: string; label: string }[] };
        if (id === "program") { if (!cur.items?.length) n.items = d.items; } else if (!cur.text) n.text = d.text;
      }
      return { ...c, sections: { ...c.sections, [id]: n } };
    });
  }
  const items = s.sections.program.items;
  return (
    <>
      <Title titleRef={titleRef} sub="Activez seulement ce qui vous sert : chaque section est déjà pré-remplie.">Vos mots</Title>
      <div className="flex flex-col gap-5">
        <Field label="Phrase d’introduction" htmlFor="subtitle"><Input id="subtitle" data-bind="subtitle" maxLength={100} value={s.subtitle} onChange={(e) => ed.update((c) => ({ ...c, subtitle: e.target.value }))} /></Field>
        <Field label="Message d’accueil" htmlFor="message"><Textarea id="message" data-bind="message" maxLength={600} rows={3} value={s.message} onChange={(e) => ed.update((c) => ({ ...c, message: e.target.value }))} /></Field>
        <div className="sections mt-2 flex flex-col gap-2.5">
          <ToggleRow id="sw-countdown" label="Compte à rebours" sub="Sous la date" checked={s.countdown} onChange={(v) => ed.update((c) => ({ ...c, countdown: v }))} />
          <ToggleRow id="sw-story" label="Notre histoire" checked={s.sections.story.on} onChange={(v) => toggle("story", v)}>
            <Textarea data-sec="story.text" aria-label="Votre histoire" maxLength={1500} rows={4} placeholder="Racontez en quelques mots votre rencontre, la demande…" value={s.sections.story.text} onChange={(e) => sec("story", { text: e.target.value })} />
          </ToggleRow>
          <ToggleRow id="sw-program" label="Programme" checked={s.sections.program.on} onChange={(v) => toggle("program", v)}>
            <div data-program className="flex flex-col gap-2" id="program-items">
              {items.map((it, i) => (
                <div key={i} className="prog-row grid grid-cols-[minmax(112px,32%)_1fr_auto] gap-2">
                  <Input type="time" aria-label={"Heure de l’étape " + (i + 1)} value={it.time} onChange={(e) => sec("program", { items: items.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)) })} />
                  <Input aria-label={"Libellé de l’étape " + (i + 1)} maxLength={60} placeholder="Ex. : Cérémonie" value={it.label} onChange={(e) => sec("program", { items: items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                  <Button type="button" variant="ghost" size="icon" aria-label={"Supprimer l’étape " + (i + 1)} onClick={() => sec("program", { items: items.filter((_, j) => j !== i) })}><X /></Button>
                </div>
              ))}
              {items.length < 8 && <Button type="button" id="program-add" variant="outline" size="sm" className="self-start" onClick={() => sec("program", { items: [...items, { time: "", label: "" }] })}><Plus /> Ajouter une étape</Button>}
            </div>
          </ToggleRow>
          <ToggleRow id="sw-dress" label="Dress code" checked={s.sections.dress.on} onChange={(v) => toggle("dress", v)}>
            <Textarea data-sec="dress.text" aria-label="Dress code" maxLength={600} rows={2} value={s.sections.dress.text} onChange={(e) => sec("dress", { text: e.target.value })} />
          </ToggleRow>
          <ToggleRow id="sw-lodging" label="Hébergement" checked={s.sections.lodging.on} onChange={(v) => toggle("lodging", v)}>
            <Textarea data-sec="lodging.text" aria-label="Hébergement" maxLength={1200} rows={3} value={s.sections.lodging.text} onChange={(e) => sec("lodging", { text: e.target.value })} />
            <Input data-sec="lodging.url" type="url" inputMode="url" maxLength={300} aria-label="Lien vers une liste d’hébergements (facultatif)" placeholder="Lien vers une liste d’hébergements (facultatif)" value={s.sections.lodging.url || ""} onChange={(e) => sec("lodging", { url: e.target.value })} />
          </ToggleRow>
          <ToggleRow id="sw-practical" label="Infos pratiques" sub="Accès, parking, enfants…" checked={s.sections.practical.on} onChange={(v) => toggle("practical", v)}>
            <Textarea data-sec="practical.text" aria-label="Infos pratiques" maxLength={1200} rows={3} value={s.sections.practical.text} onChange={(e) => sec("practical", { text: e.target.value })} />
          </ToggleRow>
          <ToggleRow id="sw-gifts" label="Liste de mariage" checked={s.sections.gifts.on} onChange={(v) => toggle("gifts", v)}>
            <Textarea data-sec="gifts.text" aria-label="Liste de mariage" maxLength={600} rows={2} value={s.sections.gifts.text} onChange={(e) => sec("gifts", { text: e.target.value })} />
            <Input data-sec="gifts.url" type="url" inputMode="url" maxLength={300} aria-label="Lien de la cagnotte ou de la liste (facultatif)" placeholder="Lien de la cagnotte ou de la liste (facultatif)" value={s.sections.gifts.url || ""} onChange={(e) => sec("gifts", { url: e.target.value })} />
          </ToggleRow>
        </div>
      </div>
    </>
  );
}

// 7. Ce que l'on demande aux invités
export function StepRsvp({ ed, titleRef }: P) {
  const r = ed.state.rsvp;
  const set = (k: keyof Config["rsvp"], v: boolean | string) => ed.update((c) => {
    const rsvp = { ...c.rsvp, [k]: v };
    if (!rsvp.guests && !rsvp.children) rsvp.companions = false; // les accompagnants supposent un nombre de personnes
    return { ...c, rsvp };
  });
  const groups: [string, [keyof Config["rsvp"], string, string?][]][] = [
    ["Organisation", [["guests", "Nombre de personnes"], ["children", "Nombre d’enfants"], ["companions", "Noms des accompagnants"], ["diet", "Régime alimentaire et allergies", "En pastilles, pour le traiteur"], ["brunch", "Brunch du lendemain"], ["message", "Un petit mot pour vous"]]],
    ["Coordonnées", [["email", "Email"], ["phone", "Téléphone"], ["address", "Adresse postale", "Pour les remerciements"]]],
  ];
  return (
    <>
      <Title titleRef={titleRef} sub="Le nom et la présence sont toujours demandés. Vos invités répondent une question à la fois.">Que voulez-vous savoir ?</Title>
      <div className="flex flex-col gap-6">
        {groups.map(([g, list]) => (
          <div key={g} className="flex flex-col gap-2.5">
            <p className="t-label">{g}</p>
            {list.map(([k, l, sub]) => (
              <ToggleRow key={k} id={"rsvp-" + k} label={l} sub={k === "companions" && !(r.guests || r.children) ? "Activez d’abord le nombre de personnes ou d’enfants" : sub}
                checked={!!r[k]} onChange={(v) => set(k, v)} disabled={k === "companions" && !(r.guests || r.children)} />
            ))}
          </div>
        ))}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Question personnalisée" opt htmlFor="custom-q"><Input id="custom-q" maxLength={80} placeholder="Une chanson qui vous fera danser ?" value={r.customLabel} onChange={(e) => set("customLabel", e.target.value)} /></Field>
          <Field label="Date limite de réponse" opt htmlFor="deadline-input"><Input ref={ed.deadlineRef} id="deadline-input" type="date" min={isoToday()} max="2050-12-31" value={r.deadline} onChange={(e) => set("deadline", e.target.value)} /></Field>
        </div>
      </div>
    </>
  );
}

// 8. Aperçu final
export function StepReview({ ed, titleRef, phone }: P & { phone: ReactNode }) {
  const s = sanitizeConfig(ed.state);
  return (
    <>
      <Title titleRef={titleRef} sub={ed.editing ? "Vos changements seront publiés sur le même lien. Les réponses déjà reçues sont conservées." : "Relisez-le tranquillement. Il reste modifiable à tout moment, même après l’envoi."}>
        {ed.editing ? "Prêt à enregistrer ?" : "Votre faire-part est prêt"}
      </Title>
      {phone && <div className="mx-auto mb-8 w-[min(300px,78vw)]">{phone}</div>}
      <dl className="flex flex-col divide-y divide-border rounded-[20px] border border-border bg-card px-5 shadow-soft">
        {[["Les mariés", s.partner1 + " & " + s.partner2], ["La date", s.date ? new Date(s.date + "T12:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + (s.time ? " · " + s.time.replace(":", "h") : "") : "—"], ["Le lieu", s.venueName || "—"], ["L’ambiance", PRESETS.find((p) => p.theme === s.theme && p.font === s.font)?.label || "Personnalisée"]].map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 py-3.5"><dt className="text-[14px] text-muted-foreground">{k}</dt><dd className="text-right font-medium">{v}</dd></div>
        ))}
      </dl>
      <p className="legal-note mt-6 text-[13px] leading-relaxed text-muted-foreground">
        {ed.editing ? "" : "Pour publier, vous vous connectez ou créez votre compte (email ou Google). "}Les informations saisies sont enregistrées pour afficher votre faire-part. <a href="confidentialite.html" target="_blank" rel="noopener" className="underline underline-offset-4">Confidentialité</a>
      </p>
    </>
  );
}

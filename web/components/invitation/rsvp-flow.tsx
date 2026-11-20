"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m as motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Minus, Plus } from "lucide-react";
import { EMAIL_RE, PHONE_RE, type Config, type RsvpData } from "@/lib/invitation";

// Réponse de l'invité, une question à la fois (grandes zones tactiles, régimes en pastilles).
// Après l'envoi (ou au retour, si ce navigateur a déjà répondu) : remerciement personnalisé, rappel de la réponse,
// « Modifier ma réponse » (formulaire pré-rempli, la nouvelle réponse remplace l'ancienne côté couple — US-13) et,
// seulement à ce moment-là, le lien discret « Créez le vôtre avec Maison Meli » (US-14).

export const DIETS = ["Végétarien", "Végétalien", "Sans gluten", "Sans lactose", "Sans porc", "Halal", "Casher", "Sans fruits à coque"];

type Draft = {
  name: string; attendance: "" | "yes" | "no"; guests: number; children: number; companions: string;
  dietTags: string[]; dietNote: string; brunch: "" | "yes" | "no"; email: string; phone: string; address: string; custom: string; message: string;
  website: string;
};
const empty = (): Draft => ({ name: "", attendance: "", guests: 1, children: 0, companions: "", dietTags: [], dietNote: "", brunch: "", email: "", phone: "", address: "", custom: "", message: "", website: "" });

function fromData(d: Partial<RsvpData> | null): Draft {
  const x = empty();
  if (!d) return x;
  x.name = String(d.name || ""); x.attendance = d.attendance === "yes" || d.attendance === "no" ? d.attendance : "";
  x.guests = Math.max(1, Math.min(20, Number(d.guests) || 1)); x.children = Math.max(0, Math.min(20, Number(d.children) || 0));
  x.companions = String(d.companions || ""); x.brunch = d.brunch === "yes" || d.brunch === "no" ? d.brunch : "";
  x.email = String(d.email || ""); x.phone = String(d.phone || ""); x.address = String(d.address || ""); x.custom = String(d.custom || ""); x.message = String(d.message || "");
  const parts = String(d.diet || "").split(/\s*[,—]\s*/).map((s) => s.trim()).filter(Boolean);
  x.dietTags = parts.filter((p) => DIETS.includes(p)); x.dietNote = parts.filter((p) => !DIETS.includes(p)).join(", ");
  return x;
}
function toData(x: Draft): RsvpData {
  const yes = x.attendance === "yes", plus = x.guests > 1 || x.children > 0;
  const diet = [...x.dietTags, x.dietNote.trim()].filter(Boolean).join(", ").slice(0, 300);
  return {
    name: x.name.trim().slice(0, 120), attendance: x.attendance as "yes" | "no",
    guests: yes ? Math.max(1, Math.min(20, x.guests || 1)) : 0,
    children: yes ? Math.max(0, Math.min(20, x.children)) : 0,
    companions: yes && plus ? x.companions.trim().slice(0, 300) : "",
    diet: yes ? diet : "",
    brunch: yes ? x.brunch : "",
    email: x.email.trim().slice(0, 200), phone: x.phone.trim().slice(0, 30), address: x.address.trim().slice(0, 300),
    custom: x.custom.trim().slice(0, 500), message: x.message.trim().slice(0, 1000),
  };
}

type StepId = "name" | "attendance" | "count" | "diet" | "brunch" | "contact" | "custom" | "message" | "recap";

type Props = {
  cfg: Config;
  preview?: boolean;
  previous?: Partial<RsvpData> | null;
  couple?: string;
  madeWith?: string;
  onMadeWith?: () => void;
  onSubmit?: (data: RsvpData) => Promise<void>;
};

export function RsvpFlow({ cfg, preview, previous, couple, madeWith, onMadeWith, onSubmit }: Props) {
  const r = cfg.rsvp, reduce = useReducedMotion();
  const [mode, setMode] = useState<"form" | "thanks">(!preview && previous?.name ? "thanks" : "form");
  const [fresh, setFresh] = useState(false);
  const [editing, setEditing] = useState(false);
  const [sent, setSent] = useState<Partial<RsvpData> | null>(previous || null);
  const [x, setX] = useState<Draft>(empty);
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => { setX((o) => ({ ...o, [k]: v })); setMsg(""); };

  const yes = x.attendance === "yes", plus = x.guests > 1 || x.children > 0;
  // Tant que la présence n'est pas choisie, le parcours compté est celui du « Oui » : le total ne grimpe jamais en cours de route
  // (il ne peut que baisser si l'invité répond « Non »). Les accompagnants sont demandés sur le même écran que le nombre de personnes.
  const going = x.attendance !== "no";
  const steps = useMemo<StepId[]>(() => {
    const s: StepId[] = ["name", "attendance"];
    if (going && (r.guests || r.children)) s.push("count");
    if (going && r.diet) s.push("diet");
    if (going && r.brunch) s.push("brunch");
    if (r.email || r.phone || r.address) s.push("contact");
    if (r.customLabel) s.push("custom");
    if (r.message) s.push("message");
    s.push("recap");
    return s;
  }, [going, r]);
  const step = steps[Math.min(i, steps.length - 1)];

  // Focus sur le premier champ de chaque nouvelle question (pas au premier affichage : le clavier ne doit pas s'ouvrir).
  const moved = useRef(false);
  useEffect(() => {
    if (!moved.current || mode !== "form") return;
    const t = setTimeout(() => {
      const el = box.current?.querySelector<HTMLElement>("[data-autofocus]") || box.current?.querySelector<HTMLElement>(".rq-title");
      el?.focus({ preventScroll: true });
    }, 60);
    return () => clearTimeout(t);
  }, [i, mode]);

  function validate(id: StepId): string {
    if (id === "name" && !x.name.trim()) return "Merci d’indiquer votre nom.";
    if (id === "attendance" && !x.attendance) return "Merci d’indiquer si vous serez présent(e).";
    if (id === "brunch" && !x.brunch) return "";
    if (id === "contact") {
      if (x.email.trim() && !EMAIL_RE.test(x.email.trim())) return "L’adresse email ne semble pas valide.";
      if (x.phone.trim() && !PHONE_RE.test(x.phone.trim())) return "Le numéro de téléphone ne semble pas valide.";
    }
    return "";
  }
  function go(d: number) {
    if (preview) return;
    if (d > 0) { const e = validate(step); if (e) { setMsg(e); return; } }
    moved.current = true; setDir(d); setMsg(""); setI((v) => Math.max(0, Math.min(steps.length - 1, v + d)));
  }
  function choose(k: "attendance" | "brunch", v: "yes" | "no") {
    if (preview) return;
    set(k, v);
    // Choix fait : on avance tout seul, après un court instant pour voir la sélection.
    setTimeout(() => { moved.current = true; setDir(1); setI((n) => n + 1); }, reduce ? 0 : 260);
  }
  async function submit() {
    if (preview || !onSubmit || busy) return;
    if (x.website) return; // anti-spam : champ piège rempli par les robots
    for (const id of steps) { const e = validate(id); if (e) { setMsg(e); setI(steps.indexOf(id)); return; } }
    const data = toData(x);
    setBusy(true); setMsg("");
    try {
      await onSubmit(data);
      setSent(data); setFresh(true); setEditing(false); setMode("thanks");
    } catch (err) {
      const m = String((err as Error)?.message || "");
      setMsg(/invalid email/.test(m) ? "L’adresse email ne semble pas valide." : /invalid phone/.test(m) ? "Le numéro de téléphone ne semble pas valide."
        : /rate limit/.test(m) ? "Trop de réponses envoyées depuis cette connexion. Réessayez dans une heure." : "Oups, l’envoi a échoué. Merci de réessayer dans un instant.");
    } finally { setBusy(false); }
  }
  function edit() {
    setX(fromData(sent)); setI(0); setDir(-1); setEditing(true); setMode("form"); moved.current = true;
  }
  function onKey(e: React.KeyboardEvent) {
    const t = e.target as HTMLElement;
    if (e.key === "Enter" && !e.nativeEvent.isComposing && t.tagName === "INPUT" && (t as HTMLInputElement).type !== "checkbox") {
      e.preventDefault();
      if (step === "recap") submit(); else go(1);
    }
  }

  if (mode === "thanks" && sent) {
    const first = String(sent.name || "").trim().split(" ")[0];
    const isYes = sent.attendance === "yes", n = (Number(sent.guests) || 1) + (Number(sent.children) || 0);
    return (
      <div className="rsvp-thanks" tabIndex={-1} ref={(el) => { if (el && fresh) el.focus({ preventScroll: true }); }}>
        <motion.div className="thanks-seal" aria-hidden="true" initial={reduce || !fresh ? false : { scale: 1.8, rotate: -18, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
          <Check strokeWidth={2.2} />
        </motion.div>
        <motion.div initial={reduce || !fresh ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.5 }}>
          {fresh ? (
            <>
              <h3>Merci {first} !</h3>
              <p>{couple ? `${couple} ont bien reçu votre réponse.` : "Votre réponse est bien enregistrée."} {isYes ? "À très vite !" : "Vous nous manquerez."}</p>
            </>
          ) : <h3>Vous avez déjà répondu</h3>}
          <p className="answer-recap">{sent.name}{sent.attendance ? " · " + (isYes ? "Présent(e)" + (n > 1 ? ", " + n + " personnes" : "") : "Absent(e)") : ""}</p>
          <button type="button" className="maps-btn edit-rsvp" onClick={edit}>Modifier ma réponse</button>
        </motion.div>
        {madeWith && <p className="made-with"><a href={madeWith} data-made-with onClick={() => onMadeWith?.()}>Créez le vôtre avec Maison Meli</a></p>}
      </div>
    );
  }

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * 24 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * -24 }),
  };
  const total = steps.length, pct = ((Math.min(i, total - 1) + 1) / total) * 100;

  return (
    <div className="rsvp-flow" ref={box} onKeyDown={onKey}>
      {editing && <p className="preview-note edit-note">Modifiez ce qui a changé : votre nouvelle réponse remplacera la précédente.</p>}
      <div className="rq-progress" aria-hidden="true"><span style={{ width: pct + "%" }} /></div>
      <div className="hp" aria-hidden="true"><label>Ne pas remplir<input type="text" name="website" tabIndex={-1} autoComplete="off" value={x.website} onChange={(e) => set("website", e.target.value)} /></label></div>
      <fieldset className="rq-fields" disabled={preview} aria-label="Votre réponse">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div key={step} className="rq" custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}>
            <p className="rq-count">Question {Math.min(i, total - 1) + 1} sur {total}</p>
            {step === "name" && (<>
              <label className="rq-title" htmlFor="f-name">Comment vous appelez-vous ?</label>
              <input id="f-name" name="name" type="text" className="rq-input" maxLength={120} autoComplete="name" placeholder="Prénom et nom" value={x.name} onChange={(e) => set("name", e.target.value)} data-autofocus />
            </>)}
            {step === "attendance" && (<>
              <p className="rq-title" id="lab-att" tabIndex={-1}>Serez-vous des nôtres ?</p>
              <div className="rq-cards" role="radiogroup" aria-labelledby="lab-att">
                <Choice name="attendance" value="yes" checked={x.attendance === "yes"} onPick={() => choose("attendance", "yes")} title="Oui, avec plaisir" sub="Je serai là" />
                <Choice name="attendance" value="no" checked={x.attendance === "no"} onPick={() => choose("attendance", "no")} title="Je ne pourrai pas" sub="Avec regret" />
              </div>
            </>)}
            {step === "count" && (<>
              <p className="rq-title" tabIndex={-1}>Combien serez-vous ?</p>
              {r.guests && <Stepper id="f-guests" label={r.children ? "Adultes (vous inclus)" : "Personnes (vous inclus)"} min={1} value={x.guests} onChange={(v) => set("guests", v)} />}
              {r.children && <Stepper id="f-children" label="Enfants" min={0} value={x.children} onChange={(v) => set("children", v)} />}
              {r.companions && plus && (
                <motion.div initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                  <label className="rq-sub" htmlFor="f-companions">Qui vous accompagne ? <span>(prénoms et noms)</span></label>
                  <textarea id="f-companions" name="companions" className="rq-input" maxLength={300} rows={2} placeholder="Paul Martin, Léa Martin…" value={x.companions} onChange={(e) => set("companions", e.target.value)} />
                </motion.div>
              )}
            </>)}
            {step === "diet" && (<>
              <p className="rq-title" id="lab-diet" tabIndex={-1}>Un régime ou une allergie ?</p>
              <div className="rq-chips" role="group" aria-labelledby="lab-diet">
                {DIETS.map((d) => {
                  const on = x.dietTags.includes(d);
                  return (
                    <button key={d} type="button" className="rq-chip" aria-pressed={on} onClick={() => set("dietTags", on ? x.dietTags.filter((t) => t !== d) : [...x.dietTags, d])}>
                      {on && <Check aria-hidden="true" />}{d}
                    </button>
                  );
                })}
              </div>
              <label className="rq-sub" htmlFor="f-diet">Autre précision <span>(facultatif)</span></label>
              <input id="f-diet" name="diet" type="text" className="rq-input" maxLength={200} placeholder="Allergie aux crustacés…" value={x.dietNote} onChange={(e) => set("dietNote", e.target.value)} />
            </>)}
            {step === "brunch" && (<>
              <p className="rq-title" id="lab-brunch" tabIndex={-1}>Serez-vous au brunch du lendemain ?</p>
              <div className="rq-cards" role="radiogroup" aria-labelledby="lab-brunch">
                <Choice name="brunch" value="yes" checked={x.brunch === "yes"} onPick={() => choose("brunch", "yes")} title="Oui" sub="Avec plaisir" />
                <Choice name="brunch" value="no" checked={x.brunch === "no"} onPick={() => choose("brunch", "no")} title="Non" sub="Pas cette fois" />
              </div>
            </>)}
            {step === "contact" && (<>
              <p className="rq-title" tabIndex={-1}>Pour vous tenir informé(e)</p>
              {r.email && <><label className="rq-sub" htmlFor="f-email">Email</label><input id="f-email" name="email" type="email" inputMode="email" className="rq-input" maxLength={200} autoComplete="email" value={x.email} onChange={(e) => set("email", e.target.value)} data-autofocus /></>}
              {r.phone && <><label className="rq-sub" htmlFor="f-phone">Téléphone</label><input id="f-phone" name="phone" type="tel" className="rq-input" maxLength={30} autoComplete="tel" value={x.phone} onChange={(e) => set("phone", e.target.value)} /></>}
              {r.address && <><label className="rq-sub" htmlFor="f-address">Adresse postale</label><textarea id="f-address" name="address" className="rq-input" maxLength={300} rows={2} autoComplete="street-address" value={x.address} onChange={(e) => set("address", e.target.value)} /></>}
            </>)}
            {step === "custom" && (<>
              <label className="rq-title" htmlFor="f-custom">{r.customLabel}</label>
              <input id="f-custom" name="custom" type="text" className="rq-input" maxLength={500} value={x.custom} onChange={(e) => set("custom", e.target.value)} data-autofocus />
            </>)}
            {step === "message" && (<>
              <label className="rq-title" htmlFor="f-msg">Un petit mot pour les mariés ?</label>
              <textarea id="f-msg" name="message" className="rq-input" maxLength={1000} rows={4} placeholder="Facultatif" value={x.message} onChange={(e) => set("message", e.target.value)} data-autofocus />
            </>)}
            {step === "recap" && (<>
              <p className="rq-title" tabIndex={-1}>Tout est juste ?</p>
              <dl className="rq-recap">
                <div><dt>Nom</dt><dd>{x.name || "—"}</dd></div>
                <div><dt>Présence</dt><dd>{yes ? "Oui, avec plaisir" : x.attendance === "no" ? "Je ne pourrai pas" : "—"}</dd></div>
                {yes && (r.guests || r.children) && <div><dt>Personnes</dt><dd>{x.guests + (r.children ? ` adulte${x.guests > 1 ? "s" : ""}, ${x.children} enfant${x.children > 1 ? "s" : ""}` : "")}</dd></div>}
                {yes && r.companions && plus && x.companions.trim() && <div><dt>Accompagnants</dt><dd>{x.companions.trim()}</dd></div>}
                {yes && r.diet && (x.dietTags.length > 0 || x.dietNote) && <div><dt>Régime</dt><dd>{[...x.dietTags, x.dietNote].filter(Boolean).join(", ")}</dd></div>}
                {yes && r.brunch && x.brunch && <div><dt>Brunch</dt><dd>{x.brunch === "yes" ? "Oui" : "Non"}</dd></div>}
                {r.email && x.email.trim() && <div><dt>Email</dt><dd>{x.email.trim()}</dd></div>}
                {r.phone && x.phone.trim() && <div><dt>Téléphone</dt><dd>{x.phone.trim()}</dd></div>}
                {r.address && x.address.trim() && <div><dt>Adresse</dt><dd>{x.address.trim()}</dd></div>}
                {r.customLabel && x.custom.trim() && <div><dt>{r.customLabel}</dt><dd>{x.custom.trim()}</dd></div>}
                {r.message && x.message.trim() && <div><dt>Votre mot</dt><dd>{x.message.trim()}</dd></div>}
              </dl>
            </>)}
          </motion.div>
        </AnimatePresence>
        <p className="form-msg" role="status">{msg}</p>
        <div className="rq-nav">
          {i > 0 ? <button type="button" className="rq-back" onClick={() => go(-1)}><ArrowLeft aria-hidden="true" /> Retour</button> : <span />}
          {step === "recap"
            ? <button type="button" className="btn" onClick={submit} disabled={busy}>{busy ? "Envoi…" : "Envoyer ma réponse"}</button>
            : step === "attendance" || (step === "brunch" && !x.brunch)
              ? (x.attendance || step === "brunch" ? <button type="button" className="btn btn-quiet" onClick={() => go(1)}>Continuer <ArrowRight aria-hidden="true" className="btn-ic" /></button> : <span />)
              : <button type="button" className="btn" onClick={() => go(1)}>Continuer <ArrowRight aria-hidden="true" className="btn-ic" /></button>}
        </div>
      </fieldset>
    </div>
  );
}

function Choice({ name, value, checked, onPick, title, sub }: { name: string; value: string; checked: boolean; onPick: () => void; title: string; sub: string }) {
  return (
    <label className={"rq-card" + (checked ? " is-on" : "")}>
      <input type="radio" name={name} value={value} checked={checked} onChange={onPick} onClick={() => { if (checked) onPick(); }} />
      <span className="rq-card-t">{title}</span>
      <span className="rq-card-s">{sub}</span>
      <span className="rq-card-dot" aria-hidden="true">{checked && <Check />}</span>
    </label>
  );
}

function Stepper({ id, label, value, min, onChange }: { id: string; label: string; value: number; min: number; onChange: (v: number) => void }) {
  return (
    <div className="rq-stepper">
      <label htmlFor={id}>{label}</label>
      <div className="rq-stepper-c">
        <button type="button" aria-label={"Moins — " + label} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}><Minus /></button>
        <input id={id} name={id.slice(2)} type="number" inputMode="numeric" min={min} max={20} value={value} onChange={(e) => onChange(Math.max(min, Math.min(20, parseInt(e.target.value, 10) || min)))} />
        <button type="button" aria-label={"Plus — " + label} onClick={() => onChange(Math.min(20, value + 1))} disabled={value >= 20}><Plus /></button>
      </div>
    </div>
  );
}

"use client";

// Retours utilisateurs (26/11/2026, plan validé par Julien) :
//  * RatingCard : « Comment s’est passée la création ? » de 0 à 10, puis un avis libre dont la question dépend de la note.
//    Sur l'écran de succès après publication, puis un seul rappel dans « Mon faire-part » si la carte a été ignorée.
//  * ReportButton / ReportDialog : signaler un bug, un mécontentement ou une idée, avec ou sans compte.
//    Jamais sur le faire-part que voient les invités.
// Chaque envoi prévient Julien par e-mail (voir private.notify_feedback dans supabase/schema.sql).
import { useEffect, useId, useState } from "react";
import { AnimatePresence, m as motion } from "motion/react";
import { Check, LifeBuoy, X } from "lucide-react";
import { toast } from "sonner";
import { api, userError, type ApiError, type FeedbackKind, type MyRating } from "@/lib/api";
import { auth } from "@/lib/auth";
import { feedbackContext, ratingPrompt } from "@/lib/feedback";
import { track } from "@/lib/track";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const card = "rounded-[20px] border border-border bg-card p-5 shadow-soft sm:p-6";

// ---------------------------------------------------------------- Note de la création
export function RatingCard({ origin, initial, onClose, onSignedOut, className }: {
  origin: "succes" | "tableau"; initial?: MyRating; onClose?: () => void; onSignedOut?: () => void; className?: string;
}) {
  const [score, setScore] = useState<number | null>(initial?.score ?? null);
  const [msg, setMsg] = useState(initial?.message ?? "");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const id = useId();
  useEffect(() => { track("feedback_shown", { once: true }); }, []);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (score == null) return;
    setBusy(true);
    try {
      await api.submitFeedback({ kind: "rating", score, message: msg, context: feedbackContext() });
      setDone(true);
    } catch (err) {
      if ((err as ApiError)?.signedOut) onSignedOut?.();
      toast.error(userError(err));
    } finally { setBusy(false); }
  }

  if (done) {
    return (
      <motion.section id="rating-card" data-origin={origin} aria-live="polite" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn(card, className)}>
        <p id="rating-thanks" className="flex items-center gap-2 font-medium"><Check className="size-4 text-accent" aria-hidden="true" />Merci, c’est noté.</p>
        <p className="mt-1 text-[14px] text-muted-foreground">
          {score! >= 9 ? "Ça nous fait très plaisir. " : "Votre retour nous aide à améliorer Maison Meli. "}
          Vous pourrez changer votre note depuis « Mon faire-part ».
        </p>
      </motion.section>
    );
  }

  return (
    <section id="rating-card" data-origin={origin} aria-labelledby={id + "-t"} className={cn(card, "relative", className)}>
      {onClose && (
        <button type="button" id="rating-later" onClick={onClose} aria-label="Plus tard"
          className="absolute right-3 top-3 grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground">
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
      <p className="t-label mb-2">Votre avis</p>
      <h2 id={id + "-t"} className="pr-8 font-serif text-[24px] leading-tight">Comment s’est passée la création ?</h2>
      <p className="mt-1 text-[14px] text-muted-foreground">De 0 à 10. Un geste suffit, et il nous aide beaucoup.</p>
      <form onSubmit={send} className="mt-4 flex flex-col gap-4">
        <div>
          <div role="radiogroup" aria-labelledby={id + "-t"} id="rating-scale" className="grid grid-cols-6 gap-1.5 sm:grid-cols-11">
            {Array.from({ length: 11 }, (_, n) => (
              <button key={n} type="button" role="radio" aria-checked={score === n} aria-label={n + " sur 10"} data-score={n}
                onClick={() => setScore(n)}
                className={cn("h-11 rounded-xl border text-[15px] font-medium tabular-nums transition-colors duration-150",
                  score === n ? "border-foreground bg-foreground text-background" : "border-border bg-background/60 hover:border-foreground/40")}>
                {n}
              </button>
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[12px] text-muted-foreground" aria-hidden="true">
            <span>0 · Très difficile</span><span>10 · Un jeu d’enfant</span>
          </div>
        </div>
        <AnimatePresence initial={false}>
          {score != null && (
            <motion.div key="more" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex flex-col gap-3 overflow-hidden">
              <label className="flex flex-col gap-1.5 text-[14px]">
                <span id="rating-question" className="font-medium">{ratingPrompt(score)} <span className="font-normal text-muted-foreground">(facultatif)</span></span>
                <Textarea id="rating-message" value={msg} maxLength={2000} rows={3} className="min-h-20 text-[16px]" onChange={(e) => setMsg(e.target.value)} />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button id="rating-send" type="submit" disabled={busy}>{busy ? "Envoi…" : "Envoyer"}</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </section>
  );
}

// Dans « Mon faire-part » une fois la note donnée : une ligne discrète pour la modifier.
export function RatingSummary({ rating, onSignedOut }: { rating: NonNullable<MyRating>; onSignedOut?: () => void }) {
  const [open, setOpen] = useState(false);
  if (open) return <RatingCard origin="tableau" initial={rating} onClose={() => setOpen(false)} onSignedOut={onSignedOut} />;
  return (
    <p id="rating-summary" className="text-[14px] text-muted-foreground">
      Votre note de la création : <strong className="font-medium text-foreground">{rating.score}/10</strong>.{" "}
      <button type="button" id="rating-edit" className="underline underline-offset-4 hover:text-foreground" onClick={() => setOpen(true)}>Modifier</button>
    </p>
  );
}

// ---------------------------------------------------------------- Signaler un problème
const KINDS: { v: Exclude<FeedbackKind, "rating">; label: string; question: string; hint: string }[] = [
  { v: "bug", label: "Quelque chose ne marche pas", question: "Que s’est-il passé ?", hint: "Ce que vous faisiez, ce qui s’est passé, ce que vous attendiez…" },
  { v: "unhappy", label: "Ça ne me plaît pas", question: "Qu’est-ce qui vous déplaît ?", hint: "Dites-le franchement, c’est comme ça qu’on s’améliore." },
  { v: "idea", label: "Une idée", question: "Votre idée", hint: "Ce qui vous manquerait, ce qui serait plus simple…" },
];

export function ReportDialog({ open, onOpenChange, context }: { open: boolean; onOpenChange: (o: boolean) => void; context?: () => { step?: string; editing?: boolean } }) {
  const [kind, setKind] = useState<Exclude<FeedbackKind, "rating">>("bug");
  const [msg, setMsg] = useState("");
  const [email, setEmail] = useState("");
  const [hp, setHp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const id = useId();
  const K = KINDS.find((k) => k.v === kind)!;

  useEffect(() => {
    if (!open) return;
    setEmail((e) => e || auth.user()?.email || ""); setError("");
  }, [open]);
  const reset = () => { setKind("bug"); setMsg(""); setHp(""); setSent(false); setError(""); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (msg.trim().length < 3) { setError("Décrivez le problème en quelques mots."); return; }
    setBusy(true); setError("");
    try {
      await api.submitFeedback({ kind, message: msg, email, hp, context: feedbackContext(context?.() || {}) });
      setSent(true);
    } catch (err) { setError(userError(err)); }
    finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setTimeout(reset, 300); }}>
      <DialogContent id="report-dialog" className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[480px]">
        {sent ? (
          <div className="flex flex-col gap-3" aria-live="polite">
            <DialogTitle className="font-serif text-[28px] font-normal leading-tight">Merci, message reçu</DialogTitle>
            <DialogDescription id="report-thanks" className="text-[15px]">
              {email.trim() ? `Nous le lisons rapidement et vous répondons à ${email.trim()}.` : "Nous le lisons rapidement. Merci de nous aider à améliorer Maison Meli."}
            </DialogDescription>
            <Button id="report-close" className="mt-2 self-start" onClick={() => { onOpenChange(false); setTimeout(reset, 300); }}>Fermer</Button>
          </div>
        ) : (
          <form id="report-form" onSubmit={submit} className="flex flex-col gap-4" noValidate>
            <div>
              <DialogTitle className="font-serif text-[28px] font-normal leading-tight">Un souci ?</DialogTitle>
              <DialogDescription className="mt-1 text-[15px]">Dites-nous ce qui ne va pas : chaque message est lu.</DialogDescription>
            </div>
            <div role="radiogroup" aria-label="Type de message" id="report-kind" className="flex flex-col gap-1.5">
              {KINDS.map((k) => (
                <button key={k.v} type="button" role="radio" aria-checked={kind === k.v} data-kind={k.v} onClick={() => setKind(k.v)}
                  className={cn("flex h-11 items-center gap-3 rounded-xl border px-4 text-left text-[15px] transition-colors",
                    kind === k.v ? "border-foreground bg-foreground/[0.03] font-medium" : "border-border hover:border-foreground/30")}>
                  <span className={cn("grid size-4 shrink-0 place-items-center rounded-full border", kind === k.v ? "border-foreground" : "border-foreground/30")} aria-hidden="true">
                    {kind === k.v && <span className="size-2 rounded-full bg-foreground" />}
                  </span>
                  {k.label}
                </button>
              ))}
            </div>
            <label className="flex flex-col gap-1.5 text-[14px] font-medium">{K.question}
              <Textarea id="report-message" value={msg} maxLength={2000} rows={4} placeholder={K.hint} className="min-h-28 text-[16px] font-normal"
                aria-invalid={!!error && msg.trim().length < 3} onChange={(e) => { setMsg(e.target.value); if (error) setError(""); }} />
            </label>
            <label className="flex flex-col gap-1.5 text-[14px] font-medium">
              <span>Votre e-mail <span className="font-normal text-muted-foreground">(facultatif, pour vous répondre)</span></span>
              <Input id="report-email" type="email" inputMode="email" autoComplete="email" value={email} maxLength={254} onChange={(e) => setEmail(e.target.value)} />
            </label>
            {/* Champ piège : invisible pour une personne, rempli par les robots. */}
            <input aria-hidden="true" tabIndex={-1} autoComplete="off" name="website" value={hp} onChange={(e) => setHp(e.target.value)}
              className="absolute -left-[9999px] h-px w-px opacity-0" />
            {error && <p id="report-error" role="alert" className="text-[14px] text-destructive">{error}</p>}
            <p className="text-[12px] text-muted-foreground">Pour reproduire le problème, nous joignons la page, l’appareil et les éventuelles erreurs techniques. <a href="/confidentialite/#retours" className="underline underline-offset-2">En savoir plus</a></p>
            <Button id="report-send" type="submit" disabled={busy} className="self-start">{busy ? "Envoi…" : "Envoyer"}</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Bouton d'ouverture. « header » : discret dans un en-tête (icône seule sur téléphone) ; « link » : lien de pied de page.
export function ReportButton({ variant = "header", context, className }: { variant?: "header" | "link"; context?: () => { step?: string; editing?: boolean }; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {variant === "link" ? (
        <button type="button" data-report className={cn("text-left hover:text-foreground", className)} onClick={() => setOpen(true)}>Signaler un problème</button>
      ) : (
        <button type="button" data-report onClick={() => setOpen(true)}
          className={cn("inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-2 font-medium sm:px-2.5 text-foreground/70 hover:bg-foreground/[0.05] hover:text-foreground", className)}>
          <LifeBuoy className="size-4" aria-hidden="true" /><span className="max-sm:sr-only">Un souci ?</span>
        </button>
      )}
      <ReportDialog open={open} onOpenChange={setOpen} context={context} />
    </>
  );
}

"use client";

// Blocs ajoutés au tableau de suivi après l'audit du 21/11/2026 :
//  * ManualRsvp : le couple saisit une réponse reçue par téléphone (PRD, risque « invités âgés »).
//  * DigestToggle : récapitulatif e-mail quotidien des nouvelles réponses, désactivable (US-17).
//  * PremiumDoor : test « fausse porte » du Pack Premium (PRD, modèle économique), mesure l'intérêt avant de coder le paiement.
import { useEffect, useId, useState } from "react";
import { BellRing, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api, userError, type ApiError } from "@/lib/api";
import { track } from "@/lib/track";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const card = "rounded-[20px] border border-border bg-card p-5 shadow-soft";

export function ManualRsvp({ onAdded, onSignedOut }: { onAdded: () => void; onSignedOut: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ name: "", attendance: "yes", guests: 1, children: 0, diet: "" });
  const id = useId();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) { toast.error("Indiquez le nom de l’invité."); return; }
    setBusy(true);
    try {
      await api.addRsvp({ ...f, name: f.name.trim() });
      toast.success("Réponse ajoutée.");
      setF({ name: "", attendance: "yes", guests: 1, children: 0, diet: "" }); setOpen(false); onAdded();
    } catch (err) { if ((err as ApiError)?.signedOut) onSignedOut(); else toast.error(userError(err)); }
    finally { setBusy(false); }
  }
  return (
    <section id="manual-box" aria-labelledby={id + "-t"} className={card}>
      <h2 id={id + "-t"} className="font-medium"><Plus className="mr-2 inline size-4 align-[-2px]" aria-hidden="true" />Une réponse reçue par téléphone ?</h2>
      {!open ? (
        <>
          <p className="mt-2 text-[14px] text-muted-foreground">Ajoutez-la vous-même : elle sera comptée avec les autres.</p>
          <Button id="manual-open" variant="outline" size="sm" className="mt-3" onClick={() => setOpen(true)}>Ajouter une réponse</Button>
        </>
      ) : (
        <form id="manual-form" onSubmit={submit} className="mt-3 flex flex-col gap-3 text-[14px]">
          <label className="flex flex-col gap-1.5">Nom de l’invité
            <Input id="manual-name" value={f.name} maxLength={120} autoComplete="off" onChange={(e) => setF({ ...f, name: e.target.value })} />
          </label>
          <div role="radiogroup" aria-label="Présence" className="flex h-11 items-center gap-1 rounded-full bg-muted p-1">
            {[["yes", "Vient"], ["no", "Ne vient pas"]].map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={f.attendance === v} data-att={v} onClick={() => setF({ ...f, attendance: v })}
                className={cn("h-9 flex-1 rounded-full text-[14px] font-medium", f.attendance === v ? "bg-card shadow-soft" : "text-muted-foreground")}>{l}</button>
            ))}
          </div>
          {f.attendance === "yes" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">Adultes
                <Input id="manual-guests" type="number" min={1} max={20} inputMode="numeric" value={f.guests} onChange={(e) => setF({ ...f, guests: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })} />
              </label>
              <label className="flex flex-col gap-1.5">Enfants
                <Input id="manual-children" type="number" min={0} max={20} inputMode="numeric" value={f.children} onChange={(e) => setF({ ...f, children: Math.max(0, Math.min(20, Number(e.target.value) || 0)) })} />
              </label>
              <label className="col-span-2 flex flex-col gap-1.5">Régime ou allergie <span className="text-muted-foreground">(facultatif)</span>
                <Input id="manual-diet" value={f.diet} maxLength={300} onChange={(e) => setF({ ...f, diet: e.target.value })} />
              </label>
            </div>
          )}
          <div className="flex gap-2">
            <Button id="manual-save" type="submit" size="sm" disabled={busy}>Ajouter</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          </div>
        </form>
      )}
    </section>
  );
}

export function DigestToggle({ onSignedOut }: { onSignedOut: () => void }) {
  const [on, setOn] = useState<boolean | null>(null);
  const id = useId();
  useEffect(() => { api.notify().then(setOn, () => setOn(null)); }, []);
  async function change(v: boolean) {
    const prev = on; setOn(v);
    try { setOn(await api.notify(v)); toast.success(v ? "Vous recevrez un récapitulatif par e-mail." : "Récapitulatif par e-mail désactivé."); }
    catch (err) { setOn(prev); if ((err as ApiError)?.signedOut) onSignedOut(); else toast.error(userError(err)); }
  }
  return (
    <section id="digest-box" aria-labelledby={id + "-t"} className={card}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id={id + "-t"} className="font-medium"><BellRing className="mr-2 inline size-4 align-[-2px]" aria-hidden="true" />Récapitulatif par e-mail</h2>
          <p className="mt-1 text-[14px] text-muted-foreground">Un e-mail le matin quand de nouveaux invités ont répondu, jamais plus d’un par jour.</p>
        </div>
        <Switch id="digest" aria-labelledby={id + "-t"} className="mt-1" checked={!!on} disabled={on === null} onCheckedChange={change} />
      </div>
    </section>
  );
}

export function PremiumDoor({ email, origin }: { email?: string; origin: "editeur" | "tableau" }) {
  // Rendu seulement côté navigateur (écran final de l'éditeur, tableau connecté) : lecture directe du stockage local.
  const [state, setState] = useState<"idle" | "open" | "sent">(() => {
    try { return typeof window !== "undefined" && localStorage.getItem("fp:premium-sent") ? "sent" : "idle"; } catch { return "idle"; }
  });
  const [value, setValue] = useState(email || "");
  const [busy, setBusy] = useState(false);
  const id = useId();
  async function send(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try { await api.premiumInterest(value, origin); setState("sent"); try { localStorage.setItem("fp:premium-sent", "1"); } catch {} }
    catch (err) { toast.error(userError(err)); }
    finally { setBusy(false); }
  }
  return (
    <section id="premium-box" aria-labelledby={id + "-t"} className={cn(card, "relative overflow-hidden")}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_100%_0%,rgba(184,151,90,0.14),transparent_70%)]" />
      <div className="relative">
        <p className="t-label">Bientôt</p>
        <h2 id={id + "-t"} className="mt-1 font-serif text-[24px] leading-tight"><Sparkles className="mr-2 inline size-4 align-[2px] text-gold-ink" aria-hidden="true" />Le Pack Premium</h2>
        <p className="mt-2 text-[14px] text-muted-foreground">Un faire-part 100 % à vous : sans mention Maison Meli, adresse personnalisée (maison-meli.com/camille-et-thomas), programme sur plusieurs temps. Un seul paiement, pas d’abonnement. Le faire-part gratuit reste complet.</p>
        {state === "sent" ? (
          <p id="premium-done" role="status" className="mt-3 text-[14px] font-medium">Merci ! Vous serez prévenu(e) en premier, avec le prix de lancement.</p>
        ) : state === "idle" ? (
          <Button id="premium-open" variant="outline" size="sm" className="mt-3" onClick={() => { setState("open"); track("premium_click"); }}>Passer en Premium</Button>
        ) : (
          <form id="premium-form" onSubmit={send} className="mt-3 flex flex-col gap-2 text-[14px]">
            <p>Le Pack Premium n’est pas encore ouvert. Laissez votre email : vous serez prévenu(e) dès son lancement.</p>
            <div className="flex gap-2">
              <Input id="premium-email" type="email" required autoComplete="email" aria-label="Votre email" value={value} onChange={(e) => setValue(e.target.value)} placeholder="vous@exemple.fr" />
              <Button id="premium-send" type="submit" size="sm" className="h-12" disabled={busy}>Me prévenir</Button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m as motion } from "motion/react";
import { ArrowLeft, Mail } from "lucide-react";
import { auth, hasGoogle, renderGoogleButton, type User } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";

// Connexion ou création du compte : code à 6 chiffres reçu par email, ou Google (bouton officiel).
// Pas de mot de passe. Le compte est créé au premier code s'il n'existe pas.
export function AuthPanel({ title, text, returnTo, onSignedIn, noSignup }: { title: string; text?: string; returnTo?: string; onSignedIn: (u: User) => void; noSignup?: boolean }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [google, setGoogle] = useState(true);
  const holder = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLHeadingElement>(null);

  useEffect(() => { const e = auth.takeRedirectError(); if (e) setMsg(e); head.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    if (!hasGoogle() || !holder.current) return;
    renderGoogleButton(holder.current, (tok, nonce) => {
      setBusy(true); setMsg("");
      auth.googleIdToken(tok, nonce).then(onSignedIn, (e) => setMsg(e.message)).finally(() => setBusy(false));
    }, () => setGoogle(false));
  }, [onSignedIn]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault(); if (busy) return;
    setBusy(true); setMsg("");
    try { await auth.sendCode(email, returnTo, !noSignup); setStep("code"); setCode(""); }
    catch (err) { setMsg((err as Error).message); }
    finally { setBusy(false); }
  }
  async function verify(value = code) {
    if (busy) return;
    setBusy(true); setMsg("");
    try { onSignedIn(await auth.verifyCode(email, value)); }
    catch (err) { setMsg((err as Error).message); setCode(""); }
    finally { setBusy(false); }
  }
  async function localGoogle() {
    setBusy(true);
    try { onSignedIn(await auth.googleIdToken("local", "local")); } finally { setBusy(false); }
  }

  return (
    <div className="auth flex flex-col gap-5">
      <div>
        <h2 ref={head} tabIndex={-1} className="t-section !text-[30px] outline-none">{title}</h2>
        {text && <p className="mt-2 text-[15px] text-muted-foreground">{text}</p>}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {step === "email" ? (
          <motion.div key="email" className="flex flex-col gap-4" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
            {google && (hasGoogle()
              ? <div ref={holder} className="auth-google-holder flex min-h-[44px] justify-center" aria-busy={busy} />
              : <Button type="button" variant="outline" className="auth-google w-full" onClick={localGoogle} disabled={busy}>Continuer avec Google</Button>)}
            {google && <div className="flex items-center gap-3 text-[13px] text-muted-foreground"><span className="h-px flex-1 bg-border" />ou<span className="h-px flex-1 bg-border" /></div>}
            <form className="flex flex-col gap-3" noValidate onSubmit={send}>
              <Label htmlFor="auth-email" className="text-[14px] font-medium">Votre adresse email</Label>
              <Input id="auth-email" type="email" inputMode="email" autoComplete="email" maxLength={320} placeholder="prenom@exemple.fr" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Button type="submit" disabled={busy} className="w-full"><Mail aria-hidden="true" /> Recevoir mon code</Button>
              <p className="text-[13px] leading-snug text-muted-foreground">Pas de mot de passe : nous vous envoyons un code à 6 chiffres. Si vous n’avez pas encore de compte, il est créé à ce moment-là.</p>
            </form>
          </motion.div>
        ) : (
          <motion.form key="code" className="flex flex-col gap-4" noValidate onSubmit={(e) => { e.preventDefault(); verify(); }}
            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
            <p className="auth-sent text-[15px]">Code envoyé à <strong className="font-medium">{email.trim()}</strong>.</p>
            <Label htmlFor="auth-code" className="text-[14px] font-medium">Code reçu par email</Label>
            <InputOTP id="auth-code" maxLength={6} value={code} onChange={setCode} autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="^[0-9]*$"
              onComplete={(v: string) => verify(v)} containerClassName="justify-center">
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
              </InputOTPGroup>
            </InputOTP>
            <Button type="submit" disabled={busy || code.length < 6} className="w-full">{busy ? "Vérification…" : "Valider"}</Button>
            <p className="text-[13px] text-muted-foreground">Rien reçu ? Regardez dans les courriers indésirables. Le lien contenu dans l’email fonctionne aussi.</p>
            <button type="button" className="inline-flex items-center gap-1.5 self-start text-[14px] font-medium text-foreground/80 hover:text-foreground" onClick={() => { setMsg(""); setStep("email"); }}>
              <ArrowLeft className="size-4" aria-hidden="true" /> Changer d’adresse ou renvoyer un code
            </button>
          </motion.form>
        )}
      </AnimatePresence>
      <p className="form-msg min-h-[1.25em] text-[14px] text-destructive" role="alert">{msg}</p>
    </div>
  );
}

// Comptes : connexion par code reçu par email ou par Google (Supabase Auth, appelé directement, sans bibliothèque).
// Google passe par le bouton officiel (Google Identity Services) depuis maison-meli.com : Google renvoie un jeton
// d'identité que Supabase vérifie. Pas de redirection par supabase.co : Google affiche « Maison Meli ».
// Mode local (tests) : un faux service accepte le code 123456. La session vit dans le stockage du navigateur ;
// le serveur vérifie le jeton à chaque appel (lib/api.ts).
import { CONFIG, IS_REMOTE } from "./config";

const BASE = IS_REMOTE ? CONFIG.supabaseUrl.replace(/\/$/, "") + "/auth/v1" : "";
const KEY = "fp:session";
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@.]{2,24}$/;

export type User = { id: string; email: string };
type Session = { access_token: string; refresh_token: string; user: User; expires_at: number };
type HttpError = Error & { status?: number; code?: string };

function read(): Session | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    return s && typeof s.access_token === "string" && typeof s.refresh_token === "string" && s.user && typeof s.user.id === "string" ? s : null;
  } catch { return null; }
}
function write(s: Session | null) { try { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY); } catch {} }
// Contenu du jeton, lu pour l'affichage uniquement : la vérification est faite par le serveur.
function claims(jwt: string): Record<string, unknown> | null {
  try {
    const p = String(jwt).split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(Array.prototype.map.call(atob(p), (c: string) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")));
  } catch { return null; }
}
type Tokens = { access_token?: unknown; refresh_token?: unknown; user?: { id?: string; email?: string }; expires_at?: unknown; expires_in?: unknown };
function store(t: Tokens | null): Session | null {
  if (!t || typeof t.access_token !== "string" || typeof t.refresh_token !== "string") return null;
  const c = claims(t.access_token) || {};
  const user = { id: String(t.user?.id || c.sub || ""), email: String(t.user?.email || c.email || "").slice(0, 320) };
  if (!user.id || c.is_anonymous) return null;
  const s: Session = { access_token: t.access_token, refresh_token: t.refresh_token, user,
    expires_at: Number(t.expires_at) || Number(c.exp) || Math.floor(Date.now() / 1000) + (Number(t.expires_in) || 3600) };
  write(s); return s;
}
async function call(path: string, body: unknown, token?: string) {
  const r = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: CONFIG.supabaseKey, Authorization: "Bearer " + (token || CONFIG.supabaseKey) },
    body: JSON.stringify(body || {}),
  });
  const t = await r.text();
  let b: Record<string, unknown> | null = null; try { b = t ? JSON.parse(t) : null; } catch {}
  if (!r.ok) {
    const err: HttpError = new Error(String((b && (b.msg || b.message || b.error_description || b.error)) || "HTTP " + r.status));
    err.status = r.status; err.code = String((b && (b.error_code || b.code)) || "");
    throw err;
  }
  return b;
}

// Retour d'une connexion par redirection (lien cliqué dans l'email) : jetons dans le fragment de l'adresse.
let justSignedIn = false, redirectError = "", consumed = false;
export function consumeRedirect() {
  if (consumed || typeof window === "undefined") return;
  consumed = true;
  const h = new URLSearchParams(location.hash.slice(1));
  if (!h.get("access_token") && !h.get("error") && !h.get("error_description")) return;
  if (IS_REMOTE && h.get("access_token") && h.get("refresh_token")) {
    justSignedIn = !!store({ access_token: h.get("access_token"), refresh_token: h.get("refresh_token"), expires_at: h.get("expires_at"), expires_in: h.get("expires_in") });
  } else if (h.get("error") || h.get("error_description")) {
    redirectError = /expired|invalid/i.test(h.get("error_code") || h.get("error_description") || "")
      ? "Ce lien de connexion a expiré ou a déjà servi. Demandez un nouveau code." : "La connexion n’a pas abouti. Réessayez.";
  }
  try { history.replaceState(null, "", location.pathname + location.search); } catch { location.hash = ""; }
}

let refreshing: Promise<string | null> | null = null;
function fresh(): Promise<string | null> {
  const s = read();
  if (!s) return Promise.resolve(null);
  if (!IS_REMOTE || s.expires_at - Date.now() / 1000 > 60) return Promise.resolve(s.access_token);
  if (!refreshing) {
    refreshing = call("/token?grant_type=refresh_token", { refresh_token: s.refresh_token }).then((t) => {
      const n = store(t as Tokens); return n ? n.access_token : null;
    }, (e: HttpError) => {
      if (e && e.status && e.status >= 400 && e.status < 500) { write(null); return null; } // session révoquée : déconnecté
      return s.expires_at > Date.now() / 1000 ? s.access_token : null; // panne réseau : le jeton sert encore s'il est valide
    }).then((v) => { refreshing = null; return v; });
  }
  return refreshing;
}

function friendly(e: HttpError) {
  const m = String(e?.message || ""), code = String(e?.code || "");
  if (e?.status === 429 || /rate limit|security purposes/i.test(m)) return "Trop de demandes en peu de temps. Patientez une minute puis réessayez.";
  if (/otp_expired|expired|invalid/i.test(code + " " + m) && /otp|token|code/i.test(code + " " + m)) return "Ce code est incorrect ou a expiré. Vérifiez-le ou demandez-en un nouveau.";
  if (/not_authorized|not authorized/i.test(code + " " + m)) return "L’envoi d’emails n’est pas encore activé pour cette adresse.";
  if (/signup|disabled/i.test(code + " " + m)) return "La création de compte est momentanément indisponible.";
  return "La connexion a échoué. Vérifiez votre connexion internet et réessayez.";
}

let localPending = "";
const localUser = (email: string): User => ({ id: "local-" + email.toLowerCase().replace(/[^a-z0-9]+/g, "-"), email });
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((f) => f());

export const auth = {
  get justSignedIn() { consumeRedirect(); return justSignedIn; },
  takeRedirectError() { consumeRedirect(); const e = redirectError; redirectError = ""; return e; },
  user(): User | null { const s = read(); return s ? { id: s.user.id, email: s.user.email } : null; },
  token: fresh,
  drop() { write(null); notify(); },
  subscribe(f: () => void) { listeners.add(f); return () => { listeners.delete(f); }; },
  validEmail: (v: string) => EMAIL_RE.test(String(v || "").trim()),
  // Envoie un code à 6 chiffres (l'email contient aussi un lien qui ramène sur returnTo). Crée le compte si besoin.
  async sendCode(email: string, returnTo?: string, createUser = true) {
    email = String(email || "").trim();
    if (!EMAIL_RE.test(email)) throw new Error("Cette adresse email ne semble pas valide.");
    if (!IS_REMOTE) { localPending = email; return; }
    try { await call("/otp?redirect_to=" + encodeURIComponent(returnTo || location.href.split("#")[0]), { email, create_user: createUser }); }
    catch (e) { throw new Error(friendly(e as HttpError)); }
  },
  async verifyCode(email: string, code: string): Promise<User> {
    email = String(email || "").trim(); code = String(code || "").replace(/\s+/g, "");
    if (!/^[0-9]{6,10}$/.test(code)) throw new Error("Le code est composé de chiffres uniquement (6 en général).");
    if (!IS_REMOTE) {
      if (code !== "123456" || email !== localPending) throw new Error("Ce code est incorrect ou a expiré. Vérifiez-le ou demandez-en un nouveau.");
      const u = localUser(email); write({ access_token: "local." + u.id, refresh_token: "local", expires_at: 4102444800, user: u }); notify();
      return u;
    }
    let t;
    try { t = await call("/verify", { type: "email", email, token: code }); } catch (e) { throw new Error(friendly(e as HttpError)); }
    const s = store(t as Tokens); if (!s) throw new Error("La connexion a échoué. Réessayez.");
    notify();
    return { id: s.user.id, email: s.user.email };
  },
  // Échange le jeton d'identité Google contre une session Supabase. nonce : la valeur brute dont l'empreinte a été donnée à Google.
  async googleIdToken(idToken: string, nonce: string): Promise<User> {
    if (!IS_REMOTE) { const u = localUser("google.demo@example.com"); write({ access_token: "local." + u.id, refresh_token: "local", expires_at: 4102444800, user: u }); notify(); return u; }
    const msg = "La connexion avec Google a échoué. Réessayez ou utilisez le code par email.";
    let t;
    try { t = await call("/token?grant_type=id_token", { provider: "google", id_token: idToken, nonce }); }
    catch (e) { throw new Error((e as HttpError)?.status === 429 ? friendly(e as HttpError) : msg); }
    const s = store(t as Tokens); if (!s) throw new Error(msg);
    notify();
    return { id: s.user.id, email: s.user.email };
  },
  async signOut() {
    const s = read(); write(null); notify();
    if (!IS_REMOTE || !s) return;
    try { await call("/logout?scope=local", {}, s.access_token); } catch {}
  },
};

// ---------- Bouton officiel Google, chargé à la demande (autorisé par la CSP des pages concernées) ----------
type Gsi = { accounts: { id: { initialize: (o: unknown) => void; renderButton: (el: HTMLElement, o: unknown) => void } } };
let gsi: Promise<void> | null = null;
function loadGsi() {
  if (gsi) return gsi;
  gsi = new Promise<void>((ok, ko) => {
    const w = window as unknown as { google?: Gsi };
    if (w.google?.accounts?.id) return ok();
    const s = document.createElement("script"); s.src = "https://accounts.google.com/gsi/client"; s.async = true;
    s.onload = () => ok(); s.onerror = () => { gsi = null; ko(new Error("gsi")); };
    document.head.appendChild(s);
  });
  return gsi;
}
async function sha256hex(str: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(b), (x) => ("0" + x.toString(16)).slice(-2)).join("");
}
function randomNonce() { const a = new Uint8Array(24); crypto.getRandomValues(a); return Array.from(a, (x) => ("0" + x.toString(16)).slice(-2)).join(""); }
export const hasGoogle = () => IS_REMOTE && !!CONFIG.googleClientId;
// Affiche le bouton Google dans holder ; onToken(idToken, nonceBrut) à la connexion, onFail() s'il ne peut pas s'afficher.
export function renderGoogleButton(holder: HTMLElement, onToken: (t: string, n: string) => void, onFail: () => void) {
  const raw = randomNonce();
  Promise.all([loadGsi(), sha256hex(raw)]).then(([, hash]) => {
    const g = (window as unknown as { google: Gsi }).google;
    g.accounts.id.initialize({
      client_id: CONFIG.googleClientId, nonce: hash, ux_mode: "popup", auto_select: false,
      itp_support: true, use_fedcm_for_button: true,
      callback: (resp: { credential?: string }) => { if (resp?.credential) onToken(resp.credential, raw); },
    });
    holder.textContent = "";
    g.accounts.id.renderButton(holder, { type: "standard", theme: "outline", size: "large", text: "continue_with",
      shape: "pill", logo_alignment: "center", locale: "fr", width: Math.min(400, Math.max(200, holder.clientWidth || 320)) });
  }).catch(onFail);
}

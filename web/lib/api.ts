// Accès aux données : Supabase (fonctions RPC) ou, en mode local, stockage du navigateur. Même interface dans les deux cas.
//   * Invités (sans compte) : getInvitation, submitRsvp.
//   * Compte connecté : chaque compte a AU PLUS un faire-part ; le serveur sait lequel d'après le jeton de session.
import { CONFIG, IS_REMOTE } from "./config";
import { auth } from "./auth";

export type ApiError = Error & { conflict?: boolean; forbidden?: boolean; onePerAccount?: boolean; signedOut?: boolean; notAdmin?: boolean };
export type MyInvitation = { slug: string; config: unknown; created_at?: string; updated_at?: string; responses?: number; last_response?: string | null };
export type RsvpRow = { id: number; created_at: string; data: Record<string, unknown> };
export type AdminKpis = Record<string, number | null>;
export type AdminData = {
  periode: { from: string; to: string };
  totaux: { comptes: number; faire_part: number };
  kpis: { actuelle: AdminKpis; precedente: AdminKpis };
  jours: { jour: string; visiteurs: number; demarres: number; comptes: number; faire_part: number }[];
  appareils: { appareil: string; visiteurs: number; part_pct: number | null }[];
  sources: { source: string; visiteurs: number; demarres: number; faire_part: number; part_pct: number | null }[];
  exclusion?: { active: boolean; comptes: number; faire_part: number; visiteurs: number };
};
export type AdminAccount = {
  id: string; email: string | null; created_at: string; last_sign_in_at: string | null; provider: string;
  admin: boolean; excluded: boolean; faire_part: { slug: string; partner1: string | null; partner2: string | null }[] | null;
};
export type AdminInvitation = {
  slug: string; created_at: string; online: boolean; partner1: string | null; partner2: string | null; wedding_date: string | null;
  owner_email: string | null; ouvertures: number; reponses: number; excluded: boolean; excluded_by_account: boolean | null;
};
// Retours utilisateurs (26/11/2026) : note de la création (0-10) et signalements.
export type FeedbackKind = "rating" | "bug" | "unhappy" | "idea";
export type FeedbackInput = { kind: FeedbackKind; score?: number | null; message?: string; email?: string; context?: Record<string, unknown>; hp?: string };
export type MyRating = { score: number; message: string | null; updated_at: string } | null;
export type FeedbackStatus = "new" | "in_progress" | "done";
export type AdminFeedbackItem = {
  id: number; created_at: string; updated_at: string; kind: FeedbackKind; score: number | null; message: string | null;
  email: string | null; account: boolean; slug: string | null; context: Record<string, unknown>; status: FeedbackStatus; excluded: boolean;
};
export type AdminFeedback = {
  notes: { nombre: number; moyenne: number | null; repartition: number[] };
  signalements: number; a_traiter: number; items: AdminFeedbackItem[];
};
// Mode local : le compte de test n'est jamais administrateur.
function notAdmin(): never { const e: ApiError = new Error("not admin"); e.notAdmin = true; throw e; }

function signedOut(): ApiError { const e: ApiError = new Error("signed out"); e.signedOut = true; return e; }
async function post(fn: string, args: unknown, token: string | null) {
  const r = await fetch(CONFIG.supabaseUrl.replace(/\/$/, "") + "/rest/v1/rpc/" + fn, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: CONFIG.supabaseKey, Authorization: "Bearer " + (token || CONFIG.supabaseKey) },
    body: JSON.stringify(args || {}),
  });
  const t = await r.text();
  let body: Record<string, unknown> | null = null; try { body = t ? JSON.parse(t) : null; } catch {}
  if (!r.ok) {
    const err: ApiError = new Error(String((body && body.message) || "HTTP " + r.status));
    err.conflict = r.status === 409 || body?.code === "23505";
    err.forbidden = r.status === 401 || r.status === 403 || body?.code === "42501";
    err.onePerAccount = /one per account/i.test(err.message);
    err.notAdmin = /not admin/i.test(err.message);
    throw err;
  }
  return body as unknown;
}
// Appel public (invités) : toujours avec la clé publique, jamais avec la session.
const rpc = (fn: string, args: unknown) => post(fn, args, null);
// Appel réservé au compte connecté. Session absente, expirée ou refusée : erreur « signedOut ».
async function arpc(fn: string, args: unknown) {
  const tok = await auth.token();
  if (!tok) throw signedOut();
  try { return await post(fn, args, tok); }
  catch (e) {
    const err = e as ApiError;
    if (err?.forbidden && !err.onePerAccount && !err.notAdmin) { auth.drop(); throw signedOut(); }
    throw e;
  }
}

// --- Mode local : db = { inv: { <slug>: { owner, config, created_at, updated_at } }, rsvps: { <slug>: [...] } } ---
type LocalDb = { inv: Record<string, { owner: string; config: unknown; created_at: string; updated_at: string }>; rsvps: Record<string, RsvpRow[]> };
const DB_KEY = "fp:db";
function load(): LocalDb { try { return JSON.parse(localStorage.getItem(DB_KEY) || "null") || { inv: {}, rsvps: {} }; } catch { return { inv: {}, rsvps: {} }; } }
function save(db: LocalDb) {
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
  catch { throw new Error("Stockage local plein (essayez avec moins de photos)."); }
}
const me = () => auth.user()?.id || "";
const mySlug = (db: LocalDb) => Object.keys(db.inv).find((s) => me() && db.inv[s].owner === me()) || "";
async function asAccount<T>(fn: (db: LocalDb, slug: string) => { save?: boolean; value?: T } | void): Promise<T> {
  if (!me()) throw signedOut();
  const db = load(), out = fn(db, mySlug(db));
  if (out && out.save) save(db);
  return (out ? out.value : undefined) as T;
}

const local = {
  async getInvitation(slug: string) { return load().inv[slug]?.config ?? null; },
  async submitRsvp(slug: string, data: unknown) {
    const db = load();
    if (!db.inv[slug]) throw new Error("introuvable");
    db.rsvps[slug] = db.rsvps[slug] || [];
    const maxId = db.rsvps[slug].reduce((m, r) => Math.max(m, +r.id || 0), 0);
    db.rsvps[slug].push({ id: maxId + 1, created_at: new Date().toISOString(), data: data as Record<string, unknown> });
    save(db);
  },
  myInvitation: () => asAccount<MyInvitation | null>((db, slug) => {
    if (!slug) return { value: null };
    const i = db.inv[slug], rs = db.rsvps[slug] || [];
    return { value: { slug, config: i.config, created_at: i.created_at, updated_at: i.updated_at, responses: rs.length,
      last_response: rs.length ? rs[rs.length - 1].created_at : null } };
  }),
  createInvitation: (slug: string, config: unknown) => asAccount<void>((db, mine) => {
    let e: ApiError;
    if (mine) { e = new Error("one per account"); e.onePerAccount = true; throw e; }
    if (db.inv[slug]) { e = new Error("slug pris"); e.conflict = true; throw e; }
    const now = new Date().toISOString();
    db.inv[slug] = { owner: me(), config, created_at: now, updated_at: now }; db.rsvps[slug] = [];
    return { save: true };
  }),
  updateInvitation: (config: unknown) => asAccount<void>((db, slug) => {
    if (!slug) throw new Error("aucun faire-part");
    db.inv[slug].config = config; db.inv[slug].updated_at = new Date().toISOString();
    return { save: true };
  }),
  deleteInvitation: () => asAccount<boolean>((db, slug) => {
    if (!slug) return { value: false };
    delete db.inv[slug]; delete db.rsvps[slug];
    return { save: true, value: true };
  }),
  // Tableau de bord admin : jamais de données en mode local (le compte de test n'est pas admin).
  adminDashboard: (_from: string, _to: string, _exclude = true) => asAccount<AdminData>(notAdmin),
  adminAccounts: (_from: string, _to: string) => asAccount<AdminAccount[]>(notAdmin),
  adminInvitations: (_from: string, _to: string) => asAccount<AdminInvitation[]>(notAdmin),
  adminSetExclusion: (_kind: "account" | "slug", _id: string, _excluded: boolean) => asAccount<void>(notAdmin),
  adminFeedback: (_from: string, _to: string, _exclude = true) => asAccount<AdminFeedback>(notAdmin),
  adminSetFeedbackStatus: (_id: number, _status: FeedbackStatus) => asAccount<void>(notAdmin),
  // Retours : journal dans le navigateur (lu par les tests), mêmes règles que le serveur.
  async submitFeedback(f: FeedbackInput) {
    if (f.hp) return;
    const msg = (f.message || "").trim().slice(0, 2000);
    if (f.kind === "rating") {
      if (!me()) throw signedOut();
      if (!(Number.isInteger(f.score) && f.score! >= 0 && f.score! <= 10)) throw new Error("invalid score");
    } else if (msg.length < 3) throw new Error("message required");
    const email = (f.email || "").trim();
    if (email && !/^[^\s@]{1,64}@[^\s@]+\.[a-z]{2,24}$/i.test(email)) throw new Error("invalid email");
    let log: Record<string, unknown>[] = [];
    try { log = JSON.parse(localStorage.getItem("fp:feedback") || "[]"); } catch {}
    const row = { kind: f.kind, score: f.kind === "rating" ? f.score : null, message: msg || null, email: email || auth.user()?.email || null,
      account: me() || null, context: f.context || {}, at: new Date().toISOString() };
    if (f.kind === "rating") log = log.filter((r) => !(r.kind === "rating" && r.account === me()));
    log.push(row);
    try { localStorage.setItem("fp:feedback", JSON.stringify(log.slice(-50))); } catch {}
  },
  myRating: () => asAccount<MyRating>(() => {
    try {
      const r = (JSON.parse(localStorage.getItem("fp:feedback") || "[]") as Record<string, unknown>[]).find((x) => x.kind === "rating" && x.account === me());
      return { value: r ? { score: Number(r.score), message: (r.message as string) || null, updated_at: String(r.at) } : null };
    } catch { return { value: null }; }
  }),
  listRsvps: () => asAccount<RsvpRow[] | null>((db, slug) => ({ value: slug ? db.rsvps[slug] || [] : null })),
  deleteRsvp: (id: number) => asAccount<void>((db, slug) => {
    if (!slug) throw new Error("aucun faire-part");
    db.rsvps[slug] = (db.rsvps[slug] || []).filter((r) => r.id !== id);
    return { save: true };
  }),
  async deleteAccount() {
    await asAccount<void>((db, slug) => { if (slug) { delete db.inv[slug]; delete db.rsvps[slug]; } return { save: true }; });
    auth.drop();
  },
  addRsvp: (data: Record<string, unknown>) => asAccount<number>((db, slug) => {
    if (!slug) throw new Error("aucun faire-part");
    db.rsvps[slug] = db.rsvps[slug] || [];
    const id = db.rsvps[slug].reduce((m, r) => Math.max(m, +r.id || 0), 0) + 1;
    db.rsvps[slug].push({ id, created_at: new Date().toISOString(), data: { ...data, manual: true, rid: "manuel" + id } });
    return { save: true, value: id };
  }),
  notify: (on?: boolean) => asAccount<boolean>(() => {
    const k = "fp:notify:" + me();
    try { if (on !== undefined) localStorage.setItem(k, on ? "1" : "0"); return { value: localStorage.getItem(k) !== "0" }; }
    catch { return { value: true }; }
  }),
  async premiumInterest(email: string, _origin = "editeur") { void _origin;
    if (!/^[^\s@]{1,64}@[^\s@]+\.[a-z]{2,24}$/i.test(email.trim())) throw new Error("invalid email");
    try { localStorage.setItem("fp:premium", email.trim()); } catch {}
  },
};

// --- Mode Supabase (fonctions décrites dans supabase/schema.sql) ---
const supa = {
  getInvitation: (slug: string) => rpc("get_invitation", { p_slug: slug }),
  submitRsvp: async (slug: string, data: unknown) => { await rpc("submit_rsvp", { p_slug: slug, p_data: data }); },
  myInvitation: async (): Promise<MyInvitation | null> => {
    const v = (await arpc("account_invitation", {})) as MyInvitation | null;
    return v && typeof v === "object" && typeof v.slug === "string" ? v : null;
  },
  createInvitation: async (slug: string, config: unknown) => { await arpc("account_create_invitation", { p_slug: slug, p_config: config }); },
  updateInvitation: async (config: unknown) => { const ok = await arpc("account_update_invitation", { p_config: config }); if (!ok) throw new Error("aucun faire-part"); },
  deleteInvitation: async () => !!(await arpc("account_delete_invitation", {})),
  listRsvps: async () => (await arpc("account_rsvps", {})) as RsvpRow[] | null,
  adminDashboard: async (from: string, to: string, exclude = true) => (await arpc("admin_dashboard", { p_from: from, p_to: to, p_exclude: exclude })) as AdminData,
  adminAccounts: async (from: string, to: string) => (await arpc("admin_accounts", { p_from: from, p_to: to })) as AdminAccount[],
  adminInvitations: async (from: string, to: string) => (await arpc("admin_invitations", { p_from: from, p_to: to })) as AdminInvitation[],
  adminSetExclusion: async (kind: "account" | "slug", id: string, excluded: boolean) => { await arpc("admin_set_exclusion", { p_kind: kind, p_id: id, p_excluded: excluded }); },
  adminFeedback: async (from: string, to: string, exclude = true) => (await arpc("admin_feedback", { p_from: from, p_to: to, p_exclude: exclude })) as AdminFeedback,
  adminSetFeedbackStatus: async (id: number, status: FeedbackStatus) => { await arpc("admin_set_feedback_status", { p_id: id, p_status: status }); },
  // Retours : avec la session si la personne est connectée (le compte est relié), sinon en visiteur.
  submitFeedback: async (f: FeedbackInput) => {
    const tok = await auth.token();
    if (f.kind === "rating" && !tok) throw signedOut();
    await post("submit_feedback", { p_kind: f.kind, p_score: f.kind === "rating" ? f.score : null, p_message: f.message || null,
      p_email: f.email?.trim() || null, p_context: f.context || {}, p_hp: f.hp || null }, tok);
  },
  myRating: async () => { const v = (await arpc("account_rating", {})) as MyRating; return v && typeof v === "object" && typeof v.score === "number" ? v : null; },
  deleteRsvp: async (id: number) => { await arpc("account_delete_rsvp", { p_id: id }); },
  deleteAccount: async () => { await arpc("delete_account", {}); auth.drop(); },
  addRsvp: async (data: Record<string, unknown>) => Number(await arpc("account_add_rsvp", { p_data: data })),
  notify: async (on?: boolean) => !!(await arpc("account_notify", on === undefined ? {} : { p_digest: on })),
  // Fausse porte Premium : avec la session si le couple est connecté (le compte est alors relié), sinon en invité.
  premiumInterest: async (email: string, origin = "editeur") => {
    const tok = await auth.token();
    await post("premium_interest", { p_email: email.trim(), p_origin: origin }, tok);
  },
};

export const api = IS_REMOTE ? supa : local;

// Ménage : les anciens liens privés et espaces testeurs n'existent plus.
export function cleanupLegacy() { try { ["fp:mine", "fp:last", "fp:tester"].forEach((k) => localStorage.removeItem(k)); } catch {} }

// Alphabet de exactement 32 caractères (sans 0/o/1/l) : 256 est divisible par 32, donc aucun biais statistique.
export function randomKey(n: number) {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789", a = new Uint8Array(n); let s = "";
  crypto.getRandomValues(a);
  for (let i = 0; i < n; i++) s += chars[a[i] & 31];
  return s;
}
export const slugify = (s: string) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
// Identifiant du faire-part lu dans l'URL, validé (format strict) avant toute utilisation.
export function slugFromUrl() {
  const slug = new URLSearchParams(location.search).get("f") || (/\/f\/([a-z0-9-]+)/.exec(location.pathname) || [])[1] || "";
  return /^[a-z0-9][a-z0-9-]{2,62}$/.test(slug) ? slug : "";
}
export function publicLink(slug: string) { const u = new URL("/invitation.html", location.href); u.search = "?f=" + encodeURIComponent(slug); u.hash = ""; return u.href; }

// Messages d'erreur affichables : jamais le texte brut renvoyé par le serveur.
export function userError(e: unknown) {
  const err = e as ApiError, m = String(err?.message || "");
  if (err?.signedOut) return "Votre session a expiré : reconnectez-vous pour continuer.";
  if (err?.onePerAccount) return "Ce compte a déjà un faire-part.";
  if (/rate limit/i.test(m)) return "Trop de tentatives en peu de temps. Réessayez dans une heure.";
  if (/too large|trop/i.test(m)) return "Le faire-part est trop volumineux : essayez avec des photos plus légères.";
  if (/Stockage local plein/.test(m)) return m;
  if (/invalid email/i.test(m)) return "Cette adresse email ne semble pas valide.";
  if (/name required/i.test(m)) return "Indiquez le nom de l’invité.";
  if (/message required/i.test(m)) return "Décrivez le problème en quelques mots.";
  return "L’opération a échoué. Vérifiez votre connexion et réessayez.";
}

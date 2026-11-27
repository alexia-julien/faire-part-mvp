// Brouillon de l'éditeur (27/11/2026). Il vit dans le navigateur (fp:draft) et, dès qu'un compte est connecté,
// aussi sur le serveur (api.saveDraft) : on le retrouve sur un autre appareil et sur la page « Mon faire-part ».
// Ce module ne parle qu'au stockage du navigateur (aucun import de api ou auth : pas de dépendance circulaire).
import { sanitizeConfig, type Config } from "./invitation";

export const DRAFT_KEY = "fp:draft";
// at : dernière modification (ms) ; synced : valeur de « at » au dernier enregistrement réussi sur le compte.
export type Draft = { state: Config; step: number; activeMs: number; at: number; synced?: number };

// Un brouillon « utile » : le couple a commencé à le remplir.
export function meaningful(s: Partial<Config> | null | undefined) {
  return !!(s && ((s.partner1 || "").trim() || (s.partner2 || "").trim() || s.date || (s.venueName || "").trim() || (s.photos && s.photos.length)));
}

// Lecture validée (le contenu vient du navigateur ou du serveur : jamais de confiance sur sa forme).
export function parseDraft(raw: unknown): Draft | null {
  const d = raw as Record<string, unknown> | null;
  if (!d || typeof d !== "object" || !d.state || typeof d.state !== "object") return null;
  const meta = (d.state as Record<string, unknown>).meta as Config["meta"];
  const state = sanitizeConfig(d.state); if (meta && !state.meta) state.meta = meta;
  const num = (v: unknown, max: number) => (typeof v === "number" && isFinite(v) && v >= 0 && v <= max ? v : 0);
  return { state, step: num(d.step, 99) || 1, activeMs: num(d.activeMs, 864e5 - 1), at: num(d.at, 1e14), synced: num(d.synced, 1e14) || undefined };
}

export function readDraft(): Draft | null {
  try { return parseDraft(JSON.parse(localStorage.getItem(DRAFT_KEY) || "null")); } catch { return null; }
}
export function writeLocalDraft(d: Draft) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); return true; }
  catch { // photos trop lourdes : on garde le reste
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...d, state: { ...d.state, photos: [] } })); return true; } catch { return false; }
  }
}
export function deleteLocalDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch {} }
export function markSynced(at: number) {
  const d = readDraft(); if (d && d.at === at) writeLocalDraft({ ...d, synced: at });
}

// Le plus récent des deux (navigateur / compte). Un brouillon vide ne gagne jamais contre un brouillon rempli.
export function newest(a: Draft | null, b: Draft | null): Draft | null {
  const A = a && meaningful(a.state) ? a : null, B = b && meaningful(b.state) ? b : null;
  if (!A) return B; if (!B) return A;
  return B.at > A.at ? B : A;
}

// Déconnexion : le brouillon déjà gardé sur le compte n'a pas à rester dans ce navigateur (appareil partagé).
// S'il n'a pas pu être enregistré (hors ligne…), on le garde pour ne rien perdre.
export function forgetSyncedDraft() {
  const d = readDraft(); if (d && d.synced && d.synced >= d.at) deleteLocalDraft();
}

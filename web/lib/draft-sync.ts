// Brouillon gardé sur le compte (27/11/2026) : envoi différé depuis l'éditeur et réconciliation navigateur / compte.
import { api } from "./api";
import { auth } from "./auth";
import { markSynced, meaningful, newest, parseDraft, readDraft, writeLocalDraft, type Draft } from "./draft";

let timer = 0, lastSent = "";

async function push(d: Draft): Promise<boolean> {
  if (!auth.user() || !meaningful(d.state)) return false;
  const data = { state: d.state, step: d.step, activeMs: d.activeMs, at: d.at };
  const body = JSON.stringify(data);
  if (body === lastSent) { markSynced(d.at); return true; }
  try { await api.saveDraft(data); }
  catch (e) {
    if (!/too large/i.test(String((e as Error)?.message))) return false;
    try { await api.saveDraft({ ...data, state: { ...data.state, photos: [] } }); } catch { return false; } // photos trop lourdes : le reste
  }
  lastSent = body; markSynced(d.at);
  return true;
}

// Après chaque enregistrement local : envoi au compte quelques secondes plus tard (une seule requête par rafale de saisie).
export function scheduleDraftSync(delay = 4000) {
  if (typeof window === "undefined" || !auth.user()) return;
  clearTimeout(timer);
  timer = window.setTimeout(() => { const d = readDraft(); if (d) void push(d); }, delay);
}
// Page masquée ou quittée : on n'attend pas.
export function flushDraftSync() {
  if (!timer) return;
  clearTimeout(timer); timer = 0;
  const d = readDraft(); if (d) void push(d);
}
export function cancelDraftSync() { clearTimeout(timer); timer = 0; }

// Compte connecté sans faire-part publié : renvoie le brouillon le plus récent (navigateur ou compte).
// Celui du navigateur est rattaché au compte ; celui du compte est recopié dans le navigateur.
export async function reconcileDraft(): Promise<Draft | null> {
  let local = readDraft();
  if (local && meaningful(local.state) && !local.at) { local = { ...local, at: Date.now() }; writeLocalDraft(local); } // brouillon d'avant le 27/11
  let remote: Draft | null = null;
  try { const r = await api.myDraft(); remote = r ? parseDraft(r.data) : null; } catch { return local && meaningful(local.state) ? local : null; }
  const best = newest(local, remote);
  if (!best) return null;
  if (best === local && (!remote || local.at > remote.at)) void push(local);
  else if (best === remote && (!local || remote.at > local.at || !meaningful(local.state))) writeLocalDraft({ ...remote, synced: remote.at });
  return best;
}

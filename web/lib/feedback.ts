// Retours utilisateurs (26/11/2026) : contexte technique joint à un signalement, pour reproduire sans relancer la personne.
// Les dernières erreurs JavaScript de la page sont gardées en mémoire (jamais stockées) ; le serveur filtre tout (liste blanche).
const errors: string[] = [];
let listening = false;

export function startErrorLog() {
  if (typeof window === "undefined" || listening) return;
  listening = true;
  const push = (m: string) => { m = m.replace(/\s+/g, " ").trim().slice(0, 300); if (m && errors[errors.length - 1] !== m) { errors.push(m); if (errors.length > 5) errors.shift(); } };
  window.addEventListener("error", (e) => push(String(e.message || (e.error && e.error.message) || "Erreur")));
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason as { message?: string } | string | undefined;
    push("Promesse rejetée : " + (typeof r === "string" ? r : r?.message || "inconnue"));
  });
}

export function feedbackContext(extra: { step?: string; editing?: boolean } = {}) {
  if (typeof window === "undefined") return {};
  const c: Record<string, unknown> = {
    page: location.pathname.slice(0, 120),
    vw: Math.round(window.innerWidth), vh: Math.round(window.innerHeight),
  };
  if (extra.step) c.step = extra.step;
  if (typeof extra.editing === "boolean") c.editing = extra.editing;
  if (errors.length) c.errors = errors.slice();
  return c;
}

// Note de la création : afficher la carte une fois, et un seul rappel dans « Mon faire-part » si elle a été ignorée.
const SEEN = "fp:rate-seen", REMINDED = "fp:rate-reminded:";
export function markRatingSeen() { try { sessionStorage.setItem(SEEN, "1"); } catch {} }
export function ratingSeenThisVisit() { try { return sessionStorage.getItem(SEEN) === "1"; } catch { return false; } }
// Le rappel reste affiché pendant la visite où il apparaît (rechargements compris), puis plus jamais.
const REMINDING = "fp:rate-reminding";
export function wasReminded(uid: string) {
  try { return localStorage.getItem(REMINDED + uid) === "1" && sessionStorage.getItem(REMINDING) !== uid; } catch { return true; }
}
export function markReminded(uid: string) { try { localStorage.setItem(REMINDED + uid, "1"); sessionStorage.setItem(REMINDING, uid); } catch {} }
export function dismissReminder() { try { sessionStorage.removeItem(REMINDING); } catch {} }

export function ratingPrompt(score: number) {
  if (score <= 6) return "Qu’est-ce qui vous a freiné ?";
  if (score <= 8) return "Qu’est-ce qui manquait pour un 10 ?";
  return "Qu’avez-vous préféré ?";
}

// Mesure du funnel (PRD : « de la visite au premier RSVP, sans cookie publicitaire »).
// * Aucun cookie, aucun identifiant posé sur l'appareil. Côté serveur, un visiteur = empreinte SHA-256 de son IP.
// * On ne garde que la catégorie de provenance (seo, ia, faire-part…), jamais l'adresse de la page d'origine.
// * « Do Not Track » ou « Global Privacy Control » : aucun événement n'est envoyé depuis le navigateur.
// Les événements serveur (faire-part créé, ouvert, réponse envoyée) sont journalisés par les fonctions SQL.
import { CONFIG, IS_REMOTE } from "./config";

const EVENTS = ["landing_view", "editor_start", "auth_gate", "share", "qr_download", "cta_create"];
const SOURCES = ["direct", "seo", "ia", "faire-part", "reseaux", "email", "autre"];
const CHANNELS = ["natif", "whatsapp", "sms", "email", "copie"];
const SRC_KEY = "fp:src", SRC_DAYS = 30;

function optedOut() {
  try {
    const n = navigator as Navigator & { globalPrivacyControl?: boolean };
    return n.globalPrivacyControl === true || n.doNotTrack === "1" || (window as unknown as { doNotTrack?: string }).doNotTrack === "1";
  } catch { return false; }
}
function fromReferrer(ref: string) {
  let host = "";
  try { host = new URL(ref).hostname.toLowerCase(); } catch { return "direct"; }
  if (!host) return "direct";
  if (host === location.hostname) return "";
  if (/(^|\.)(chatgpt\.com|openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|copilot\.microsoft\.com|mistral\.ai|you\.com|phind\.com)$/.test(host)) return "ia";
  if (/(^|\.)(mail\.google\.com|outlook\.(live|office)\.com|mail\.yahoo\.com|webmail)/.test(host)) return "email";
  if (/(^|\.)(google|bing|duckduckgo|qwant|ecosia|yahoo|yandex|brave|startpage|lilo)\.[a-z.]+$/.test(host)) return "seo";
  if (/(^|\.)(facebook\.com|fb\.com|instagram\.com|pinterest\.[a-z.]+|tiktok\.com|t\.co|twitter\.com|x\.com|linkedin\.com|youtube\.com|reddit\.com|snapchat\.com|threads\.net|whatsapp\.com)$/.test(host)) return "reseaux";
  return "autre";
}
function fromParam(v: string | null) {
  v = String(v || "").toLowerCase();
  if (!v) return "";
  if (v === "faire-part" || v === "fairepart") return "faire-part";
  if (SOURCES.includes(v)) return v;
  if (/mail|newsletter/.test(v)) return "email";
  if (/facebook|instagram|pinterest|tiktok|insta|fb|social/.test(v)) return "reseaux";
  return "autre";
}
function readSrc() {
  try {
    const s = JSON.parse(localStorage.getItem(SRC_KEY) || "null");
    if (s && SOURCES.includes(s.s) && Date.now() - s.t < SRC_DAYS * 864e5) return s.s as string;
  } catch {}
  return "";
}
let current: string | null = null;
function currentSrc() {
  if (current !== null) return current;
  const q = new URLSearchParams(location.search);
  const s = fromParam(q.get("src") || q.get("utm_source")) || fromReferrer(document.referrer);
  if (s && s !== "direct") { try { localStorage.setItem(SRC_KEY, JSON.stringify({ s, t: Date.now() })); } catch {} }
  current = s;
  return s;
}
export function source() { const c = currentSrc(); return (c && c !== "direct" ? c : readSrc()) || "direct"; }

const once: Record<string, boolean> = {};
export function track(event: string, meta: { src?: string; channel?: string; once?: boolean } = {}, slug?: string) {
  if (typeof window === "undefined" || !EVENTS.includes(event) || optedOut()) return;
  const m: Record<string, string> = {};
  if (meta.src && SOURCES.includes(meta.src)) m.src = meta.src;
  if (meta.channel && CHANNELS.includes(meta.channel)) m.channel = meta.channel;
  if (meta.once) { // une seule fois par onglet pour cet événement
    const k = "fp:t:" + event;
    try { if (sessionStorage.getItem(k) || once[k]) return; sessionStorage.setItem(k, "1"); } catch { if (once[k]) return; }
    once[k] = true;
  }
  const s = /^[a-z0-9][a-z0-9-]{2,62}$/.test(slug || "") ? slug! : null;
  if (!IS_REMOTE) { // mode local : journal dans le navigateur (utilisé par les tests)
    try {
      const log = JSON.parse(localStorage.getItem("fp:events") || "[]");
      log.push({ event, slug: s, meta: m, at: new Date().toISOString() });
      localStorage.setItem("fp:events", JSON.stringify(log.slice(-300)));
    } catch {}
    return;
  }
  try {
    fetch(CONFIG.supabaseUrl.replace(/\/$/, "") + "/rest/v1/rpc/track", {
      method: "POST", keepalive: true,
      headers: { "Content-Type": "application/json", apikey: CONFIG.supabaseKey, Authorization: "Bearer " + CONFIG.supabaseKey },
      body: JSON.stringify({ p_event: event, p_slug: s, p_meta: m }),
    }).catch(() => {});
  } catch {}
}

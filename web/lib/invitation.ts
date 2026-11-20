// Modèle d'un faire-part : catalogue de styles, valeurs par défaut, validation stricte (la config vient de la base,
// donc potentiellement forgée par n'importe qui), dates, fuseaux et agenda (.ics).
// Port fidèle de l'ancien js/render.js : mêmes règles, mêmes limites, mêmes formats (compatibles avec la base existante).

export type Section = { on: boolean; text: string; url?: string };
export type ProgramItem = { time: string; label: string };
export type RsvpOptions = {
  guests: boolean; companions: boolean; children: boolean; diet: boolean; brunch: boolean;
  email: boolean; phone: boolean; address: boolean; message: boolean; customLabel: string; deadline: string;
};
export type Config = {
  v: 2;
  partner1: string; partner2: string;
  date: string; time: string;
  venueName: string; venueAddress: string; mapsUrl: string;
  subtitle: string; message: string;
  photos: string[];
  theme: string; font: string; intro: string; photoShape: string; countdown: boolean;
  decor: string; foil: string; texture: boolean;
  tz: string;
  sections: {
    story: Section; program: { on: boolean; items: ProgramItem[] }; dress: Section;
    lodging: Section; practical: Section; gifts: Section;
  };
  rsvp: RsvpOptions;
  meta?: { durationSec: number | null; updatedAt: string; src: string };
};

// ------------------------------------------------------------------ Catalogue de styles
export const PALETTES = [
  { id: "sauge", label: "Sauge", sw: ["#F6F2EA", "#8C9B7C"], deep: "#5F6E4E" },
  { id: "rose", label: "Rose poudré", sw: ["#FAF3F0", "#CE968C"], deep: "#9A5A50" },
  { id: "terracotta", label: "Terracotta", sw: ["#FAF4EE", "#D08B6C"], deep: "#9A4E33" },
  { id: "lavande", label: "Lavande", sw: ["#F6F4FA", "#A99BC9"], deep: "#65558F" },
  { id: "bordeaux", label: "Bordeaux", sw: ["#FAF6F3", "#7A2E3E"], deep: "#7A2E3E" },
  { id: "riviera", label: "Riviera", sw: ["#F3F7F8", "#7FA8B6"], deep: "#3B6876" },
  { id: "nuit", label: "Bleu nuit", sw: ["#1F2433", "#C9A86A"], deep: "#E2C58A" },
  { id: "noir", label: "Noir & or", sw: ["#141414", "#C9A86A"], deep: "#E2C58A" },
  { id: "ivoire", label: "Ivoire", sw: ["#FBF8F1", "#C2A468"], deep: "#7E6328" },
  { id: "olive", label: "Olivier", sw: ["#F5F3EA", "#8E8B57"], deep: "#5B5930" },
  { id: "porcelaine", label: "Porcelaine", sw: ["#F6F8FB", "#2F4C8C"], deep: "#2F4C8C" },
  { id: "emeraude", label: "Émeraude", sw: ["#133A31", "#C9A86A"], deep: "#E2C58A" },
] as const;

export const FONTS = [
  { id: "classique", label: "Classique", sample: "Cormorant Garamond" },
  { id: "romantique", label: "Romantique", sample: "Great Vibes" },
  { id: "moderne", label: "Moderne", sample: "DM Serif Display" },
  { id: "minimal", label: "Minimaliste", sample: "Josefin Sans" },
  { id: "calligraphie", label: "Calligraphie", sample: "Pinyon Script" },
  { id: "editorial", label: "Éditorial", sample: "Playfair Display" },
  { id: "bodoni", label: "Haute couture", sample: "Bodoni Moda" },
  { id: "artdeco", label: "Art déco", sample: "Italiana" },
] as const;

export const INTROS = [
  { id: "enveloppe", label: "Enveloppe", hint: "Vos invités ouvrent une enveloppe scellée" },
  { id: "monogramme", label: "Monogramme", hint: "Vos initiales, puis le faire-part" },
  { id: "aucune", label: "Aucune", hint: "Le faire-part s’affiche directement" },
] as const;

export const SHAPES = [
  { id: "arrondi", label: "Arrondie" }, { id: "arche", label: "Arche" }, { id: "cercle", label: "Cercle" },
] as const;

export const DECORS = [
  { id: "aucun", label: "Épuré" }, { id: "feuillage", label: "Couronne" }, { id: "botanique", label: "Botanique" },
  { id: "cadre", label: "Cadre" }, { id: "artdeco", label: "Art déco" },
] as const;

export const FOILS = [
  { id: "aucune", label: "Encre", sw: ["#6B6559", "#3A362E"] },
  { id: "or", label: "Dorure", sw: ["#A57E2E", "#F3DF9E", "#8F6B22"] },
  { id: "orrose", label: "Or rose", sw: ["#A9626B", "#F4CDC3", "#94545D"] },
  { id: "argent", label: "Argent", sw: ["#7E858C", "#F1F3F5", "#6D747B"] },
] as const;

export type Preset = {
  id: string; label: string; tagline: string;
  theme: string; font: string; intro: string; photoShape: string; decor: string; foil: string; texture: boolean;
};
// Ambiances : un clic règle tout le style de façon cohérente (comme une collection chez un papetier).
// Une seule mécanique d'ouverture pour les neuf (l'enveloppe), mais papier, cachet et dorure changent.
export const PRESETS: Preset[] = [
  { id: "champetre", label: "Champêtre", tagline: "Kraft, feuillage et cachet sauge", theme: "sauge", font: "classique", intro: "enveloppe", photoShape: "arrondi", decor: "feuillage", foil: "aucune", texture: true },
  { id: "romantique", label: "Romantique", tagline: "Papier coton, or rose", theme: "rose", font: "romantique", intro: "enveloppe", photoShape: "arche", decor: "botanique", foil: "orrose", texture: true },
  { id: "chateau", label: "Château", tagline: "Vergé ivoire, dorure à chaud", theme: "ivoire", font: "calligraphie", intro: "enveloppe", photoShape: "arche", decor: "cadre", foil: "or", texture: true },
  { id: "elegance", label: "Élégance", tagline: "Bleu nuit, filets dorés", theme: "nuit", font: "bodoni", intro: "enveloppe", photoShape: "arrondi", decor: "cadre", foil: "or", texture: false },
  { id: "gatsby", label: "Gatsby", tagline: "Noir laqué, éventail art déco", theme: "noir", font: "artdeco", intro: "enveloppe", photoShape: "arrondi", decor: "artdeco", foil: "or", texture: false },
  { id: "emeraude", label: "Jardin d’hiver", tagline: "Velours émeraude, couronne dorée", theme: "emeraude", font: "editorial", intro: "enveloppe", photoShape: "arche", decor: "feuillage", foil: "or", texture: false },
  { id: "boheme", label: "Bohème", tagline: "Terracotta, branches libres", theme: "terracotta", font: "romantique", intro: "enveloppe", photoShape: "arche", decor: "botanique", foil: "aucune", texture: true },
  { id: "porcelaine", label: "Porcelaine", tagline: "Blanc émaillé, bleu de four", theme: "porcelaine", font: "editorial", intro: "enveloppe", photoShape: "cercle", decor: "cadre", foil: "argent", texture: true },
  { id: "minimaliste", label: "Minimaliste", tagline: "Lignes nettes, air marin", theme: "riviera", font: "minimal", intro: "enveloppe", photoShape: "cercle", decor: "aucun", foil: "aucune", texture: false },
];
export const STYLE_FIELDS = ["theme", "font", "intro", "photoShape", "decor", "foil", "texture"] as const;

export const SECTIONS = [
  { id: "story", label: "Notre histoire" },
  { id: "program", label: "Programme" },
  { id: "dress", label: "Dress code" },
  { id: "lodging", label: "Hébergement" },
  { id: "practical", label: "Infos pratiques" },
  { id: "gifts", label: "Liste de mariage" },
] as const;

const ids = (list: readonly { id: string }[]) => list.map((x) => x.id);
export const labelOf = (list: readonly { id: string; label: string }[], id: string) => list.find((x) => x.id === id)?.label || "";

export function applyPreset(cfg: Config, p: Preset): Config {
  return { ...cfg, theme: p.theme, font: p.font, intro: p.intro, photoShape: p.photoShape, decor: p.decor, foil: p.foil, texture: p.texture };
}
export function matchingPreset(cfg: Config): Preset | undefined {
  return PRESETS.find((p) => STYLE_FIELDS.every((f) => (f === "texture" ? p.texture === !!cfg.texture : p[f] === cfg[f])));
}

// ------------------------------------------------------------------ Liens (listes blanches)
const pad = (n: number) => (n < 10 ? "0" : "") + n;
function safeHttps(u: string) { u = String(u || "").trim(); return /^https:\/\/[^\s"'<>]+$/i.test(u) ? u : ""; }
export function safeImg(u: string) { return /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(u || "") ? u : ""; }
// Le lien « Ouvrir dans Maps » n'accepte que des services de cartographie connus (sinon : hameçonnage possible).
const TLD = "(com|fr|de|es|it|pt|be|ch|ca|co\\.uk|com\\.br)";
const MAPS_HOST = new RegExp("^(maps\\.app\\.goo\\.gl|goo\\.gl|maps\\.google\\." + TLD + "|(www\\.)?google\\." + TLD +
  "|maps\\.apple\\.com|(www\\.)?openstreetmap\\.org|(www\\.)?waze\\.com|ul\\.waze\\.com)$", "i");
function safeMapsUrl(u: string) {
  u = safeHttps(u);
  if (!u) return "";
  try {
    const x = new URL(u);
    if (x.username || x.password || !MAPS_HOST.test(x.hostname)) return "";
    if (/^(www\.)?google\./i.test(x.hostname) && !/^\/maps/.test(x.pathname)) return "";
    if (/^goo\.gl$/i.test(x.hostname) && !/^\/maps/.test(x.pathname)) return "";
    return x.href;
  } catch { return ""; }
}
export const isAllowedMapsUrl = (u: string) => !!safeMapsUrl(u);
// Liens libres (cagnotte, hébergements) : https uniquement ; le domaine est affiché à côté du bouton.
export function safeLink(u: string): { href: string; host: string } | null {
  u = safeHttps(u);
  if (!u) return null;
  try {
    const x = new URL(u);
    if (x.username || x.password || !/\./.test(x.hostname)) return null;
    return { href: x.href, host: x.hostname.replace(/^www\./i, "") };
  } catch { return null; }
}
export const isValidLink = (u: string) => !!safeLink(u);

// ------------------------------------------------------------------ Configuration
export function defaults(): Config {
  return {
    v: 2,
    partner1: "", partner2: "",
    date: "", time: "",
    venueName: "", venueAddress: "", mapsUrl: "",
    subtitle: "vous invitent à célébrer leur mariage",
    message: "Nous serions très heureux de partager ce jour unique avec vous.",
    photos: [],
    theme: "sauge", font: "classique", intro: "enveloppe", photoShape: "arrondi", countdown: true,
    decor: "feuillage", foil: "aucune", texture: true,
    tz: "",
    sections: {
      story: { on: false, text: "" },
      program: { on: false, items: [] },
      dress: { on: false, text: "" },
      lodging: { on: false, text: "", url: "" },
      practical: { on: false, text: "" },
      gifts: { on: false, text: "", url: "" },
    },
    rsvp: { guests: true, companions: false, children: false, diet: true, brunch: false,
      email: false, phone: false, address: false, message: true, customLabel: "", deadline: "" },
  };
}

// Contenu proposé quand on active une section (modifiable ; « Notre histoire » reste vide : c'est personnel).
export function sectionDefaults(id: string, cfg?: Partial<Config>): Section | { on: boolean; items: ProgramItem[] } {
  if (id === "program") {
    const t = /^(\d{2}):(\d{2})$/.exec((cfg && cfg.time) || "") || ["", "15", "00"];
    const base = +t[1] * 60 + +t[2];
    const at = (m: number) => { m = (base + m) % 1440; return pad(Math.floor(m / 60)) + ":" + pad(m % 60); };
    return { on: true, items: [
      { time: at(0), label: "Cérémonie" }, { time: at(90), label: "Vin d’honneur" },
      { time: at(240), label: "Dîner" }, { time: at(420), label: "Soirée dansante" }] };
  }
  const texts: Record<string, string> = {
    story: "",
    dress: "Tenue chic et décontractée. Prévoyez des chaussures confortables : une partie de la fête se déroule en extérieur.",
    lodging: "Voici une sélection d’hébergements à proximité du lieu. Pensez à réserver tôt, l’été est très demandé !",
    practical: "Parking gratuit sur place.",
    gifts: "Votre présence est notre plus beau cadeau. Pour ceux qui le souhaitent, une cagnotte est à votre disposition.",
  };
  const s: Section = { on: true, text: texts[id] || "" };
  if (id === "lodging" || id === "gifts") s.url = "";
  return s;
}

type Loose = Record<string, unknown>;
const str = (v: unknown, max: number, def = "") => (typeof v === "string" ? v.slice(0, max) : def);
const obj = (v: unknown): Loose => (v && typeof v === "object" && !Array.isArray(v) ? (v as Loose) : {});
const pick = (v: unknown, list: string[], def: string) => (typeof v === "string" && list.includes(v) ? v : def);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/, TIME_RE = /^\d{2}:\d{2}$/;

// Liste blanche : on ne garde que les champs connus, avec leur type et leur longueur maximale.
// Ça évite aussi la pollution de prototype (une clé "__proto__" dans le JSON).
export function sanitizeConfig(input: unknown): Config {
  const d = defaults();
  const c = obj(input);
  const r = obj(c.rsvp), s = obj(c.sections), legacy = !("intro" in c);
  const out: Config = {
    v: 2,
    partner1: str(c.partner1, 40), partner2: str(c.partner2, 40),
    date: DATE_RE.test(str(c.date, 10)) ? (c.date as string) : "",
    time: TIME_RE.test(str(c.time, 5)) ? (c.time as string) : "",
    venueName: str(c.venueName, 80), venueAddress: str(c.venueAddress, 200), mapsUrl: str(c.mapsUrl, 300),
    subtitle: str(c.subtitle, 100, d.subtitle), message: str(c.message, 600, d.message),
    photos: Array.isArray(c.photos) ? c.photos.filter((p): p is string => typeof p === "string" && !!safeImg(p)).slice(0, 3) : [],
    theme: pick(c.theme, ids(PALETTES), "sauge"),
    font: pick(c.font, ids(FONTS), "classique"),
    // Les faire-part créés avant l'ajout des intros n'en ont pas : on ne leur en impose pas une.
    intro: pick(c.intro, ids(INTROS), legacy ? "aucune" : "enveloppe"),
    photoShape: pick(c.photoShape, ids(SHAPES), "arrondi"),
    countdown: "countdown" in c ? c.countdown === true : true,
    decor: pick(c.decor, ids(DECORS), "aucun"),
    foil: pick(c.foil, ids(FOILS), "aucune"),
    texture: c.texture === true,
    tz: /^[A-Za-z]+(\/[A-Za-z0-9_+-]+){0,2}$/.test(str(c.tz, 64)) ? (c.tz as string) : "",
    sections: d.sections, rsvp: d.rsvp,
  };
  const sec = (id: string, fields: Record<string, number>): Section => {
    const x = obj(s[id]);
    const o: Section = { on: x.on === true, text: "" };
    for (const k of Object.keys(fields)) (o as Record<string, unknown>)[k] = str(x[k], fields[k]);
    return o;
  };
  const pg = obj(s.program);
  out.sections = {
    story: sec("story", { text: 1500 }),
    dress: sec("dress", { text: 600 }),
    lodging: sec("lodging", { text: 1200, url: 300 }),
    practical: sec("practical", { text: 1200 }),
    gifts: sec("gifts", { text: 600, url: 300 }),
    program: { on: pg.on === true, items: (Array.isArray(pg.items) ? pg.items : []).slice(0, 8).map((it) => {
      const o = obj(it); return { time: TIME_RE.test(str(o.time, 5)) ? (o.time as string) : "", label: str(o.label, 60) };
    }) },
  };
  // Ancien format : « infos pratiques » était un simple texte.
  if (!s.practical && typeof c.practical === "string" && c.practical.trim()) {
    out.sections.practical = { on: true, text: c.practical.slice(0, 1200) };
  }
  const rsvp = { ...d.rsvp };
  (["guests", "companions", "children", "diet", "brunch", "email", "phone", "address", "message"] as const).forEach((k) => {
    rsvp[k] = k in r ? r[k] === true : d.rsvp[k];
  });
  rsvp.customLabel = str(r.customLabel, 80);
  rsvp.deadline = DATE_RE.test(str(r.deadline, 10)) ? (r.deadline as string) : "";
  out.rsvp = rsvp;
  if (c.meta) {
    const meta = obj(c.meta);
    out.meta = { durationSec: typeof meta.durationSec === "number" ? meta.durationSec : null, updatedAt: str(meta.updatedAt, 40),
      src: /^[a-z-]{1,12}$/.test(String(meta.src || "")) ? (meta.src as string) : "" };
  }
  return out;
}

// ------------------------------------------------------------------ Dates
export function parseDate(s: string): Date | null {
  const m = DATE_RE.test(s || "") ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(s) : null;
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return d.getMonth() === +m[2] - 1 ? d : null; // rejette les dates impossibles (31 février…)
}
export const hasTime = (cfg: Pick<Config, "time">) => TIME_RE.test(cfg.time || "");
// Date « murale » du mariage (7 août 2027, 16h00, quel que soit le pays de l'invité). Sans heure : début de journée.
export function eventDate(cfg: Pick<Config, "date" | "time">): Date | null {
  const d = parseDate(cfg.date);
  if (!d) return null;
  const t = /^(\d{2}):(\d{2})$/.exec(cfg.time || "") || ["", "00", "00"];
  d.setHours(+t[1], +t[2], 0, 0);
  return d;
}
function tzOffset(tz: string, ms: number) {
  const p: Record<string, string> = {};
  new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(ms)).forEach((x) => { p[x.type] = x.value; });
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - ms;
}
// Instant absolu (compte à rebours, agenda) : 16h00 à Paris reste 16h00 à Paris pour un invité au Brésil.
export function eventInstant(cfg: Pick<Config, "date" | "time" | "tz">): number | null {
  const d = eventDate(cfg);
  if (!d) return null;
  const guess = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes());
  try {
    const tz = cfg.tz || "Europe/Paris", off = tzOffset(tz, guess), t = guess - off, off2 = tzOffset(tz, t);
    return off2 === off ? t : guess - off2;
  } catch { return d.getTime(); }
}
export function longDate(d: Date) {
  const s = d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  return d.getDate() === 1 ? s.replace(/^1 /, "1er ") : s;
}
export function formatDate(cfg: Pick<Config, "date" | "time">, withWeekday = false) {
  const d = eventDate(cfg);
  if (!d) return "";
  const s = longDate(d);
  if (!withWeekday) return s;
  const w = d.toLocaleDateString("fr-FR", { weekday: "long" });
  return w.charAt(0).toUpperCase() + w.slice(1) + " " + s;
}
export function weekday(cfg: Pick<Config, "date" | "time">) {
  const d = eventDate(cfg);
  return d ? d.toLocaleDateString("fr-FR", { weekday: "long" }) : "";
}
export function mapsHref(cfg: Pick<Config, "mapsUrl" | "venueName" | "venueAddress">) {
  const u = safeMapsUrl(cfg.mapsUrl);
  if (u) return u;
  const q = [cfg.venueName, cfg.venueAddress].join(" ").trim();
  return q ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q) : "";
}
export const hm = (t: string) => (TIME_RE.test(t || "") ? t.replace(":", "h") : "");
export function initial(s: string) { const m = /\p{L}/u.exec(String(s || "")); return m ? m[0].toUpperCase() : ""; }
export function today() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

// ------------------------------------------------------------------ Agenda (.ics)
function icsStamp(ms: number) { return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); }
function icsEsc(s: string) { return String(s).replace(/[\\;,]/g, "\\$&").replace(/\r?\n/g, "\\n"); }
// Repli compté en octets UTF-8 (RFC 5545 : 75 octets max), sans couper un caractère en deux.
function icsFold(line: string) {
  const out: string[] = []; let cur = "", bytes = 0;
  for (const ch of line) {
    const cp = ch.codePointAt(0)!, n = cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
    if (bytes + n > 75) { out.push(cur); cur = " "; bytes = 1; }
    cur += ch; bytes += n;
  }
  out.push(cur);
  return out.join("\r\n");
}
export const slugifyLite = (s: string) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
export function buildIcs(input: unknown) {
  const cfg = sanitizeConfig(input);
  const start = eventInstant(cfg); if (start == null) return "";
  const title = "Mariage de " + cfg.partner1 + " & " + cfg.partner2;
  let when: string[];
  if (hasTime(cfg)) when = ["DTSTART:" + icsStamp(start), "DTEND:" + icsStamp(start + 6 * 3600 * 1000)];
  else {
    const d = eventDate(cfg)!, n = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    const ymd = (x: Date) => x.getFullYear() + pad(x.getMonth() + 1) + pad(x.getDate());
    when = ["DTSTART;VALUE=DATE:" + ymd(d), "DTEND;VALUE=DATE:" + ymd(n)];
  }
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Faire-part//FR", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
    "UID:" + start + "-" + slugifyLite(title) + "@faire-part", "DTSTAMP:" + icsStamp(Date.now()), ...when,
    "SUMMARY:" + icsEsc(title), "LOCATION:" + icsEsc([cfg.venueName, cfg.venueAddress].filter(Boolean).join(", ")),
    "END:VEVENT", "END:VCALENDAR"].map(icsFold).join("\r\n");
}
export function downloadIcs(cfg: Config) {
  const ics = buildIcs(cfg); if (!ics) return;
  downloadBlob(new Blob([ics], { type: "text/calendar;charset=utf-8" }), "mariage.ics");
}
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// ------------------------------------------------------------------ RSVP : mêmes règles que le serveur
export const EMAIL_RE = /^[A-Za-z0-9._%+'-]{1,64}@[A-Za-z0-9.-]{1,255}\.[A-Za-z]{2,24}$/;
export const PHONE_RE = /^[0-9 +().-]{6,30}$/;
export const RSVP_FIELDS = ["name", "attendance", "guests", "children", "companions", "brunch", "diet", "email", "phone", "address", "custom", "message"] as const;
export type RsvpData = {
  name: string; attendance: "yes" | "no"; guests: number; children: number; companions: string; diet: string;
  brunch: string; email: string; phone: string; address: string; custom: string; message: string;
};

// Exemple utilisé sur la page d'accueil et dans les miniatures.
export function sampleConfig(names?: { p1?: string; p2?: string }, preset: Preset = PRESETS[0]): Config {
  const c = defaults();
  c.partner1 = names?.p1 || "Camille"; c.partner2 = names?.p2 || "Hugo";
  c.date = "2027-06-19"; c.time = "15:30"; c.tz = "Europe/Paris";
  c.venueName = "Domaine des Tilleuls"; c.venueAddress = "Chemin des Vergers\n84220 Gordes";
  c.sections.program = sectionDefaults("program", c) as Config["sections"]["program"];
  c.sections.dress = sectionDefaults("dress", c) as Section;
  return sanitizeConfig(applyPreset(c, preset));
}

// Redimensionne une photo côté navigateur (JPEG, 1600 px max) ; plafond ~700 000 caractères par photo (limite serveur).
export function resizeImage(file: File, maxSide = 1600, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!/^image\/(jpeg|png|webp|heic|heif|gif)$/i.test(file.type)) return reject(new Error("Format de photo non pris en charge (JPEG, PNG ou WebP)."));
    if (file.size > 30 * 1024 * 1024) return reject(new Error("Photo trop volumineuse (30 Mo maximum)."));
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let side = maxSide, q = quality, out = "";
      for (let i = 0; i < 6; i++) {
        const r = Math.min(1, side / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.width * r)); c.height = Math.max(1, Math.round(img.height * r));
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        out = c.toDataURL("image/jpeg", q);
        if (out.length <= 700000) return resolve(out);
        if (q > 0.6) q -= 0.1; else side = Math.round(side * 0.8);
      }
      reject(new Error("Photo trop lourde, essayez-en une autre."));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Photo illisible (format non pris en charge ?).")); };
    img.src = url;
  });
}

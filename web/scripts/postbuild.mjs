// Après `next build` (export statique) : pose une CSP stricte dans chaque page HTML.
// La politique est une balise <meta> placée en tête de <head> : ses empreintes dépendent de chaque page, ce qu'un
// fichier _headers commun ne sait pas exprimer.
// Les seuls scripts en ligne sont ceux de Next.js (amorçage) : ils sont autorisés par leur empreinte SHA-256,
// jamais par 'unsafe-inline'. Les données structurées (application/ld+json) ne s'exécutent pas et n'en ont pas besoin.
import { createHash } from "node:crypto";
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const OUT = process.argv[2] || "out";
const LOCAL = process.env.NEXT_PUBLIC_FP_LOCAL === "1";
const STAGING = process.env.NEXT_PUBLIC_FP_ENV === "staging";
// Doit correspondre à lib/config.ts.
const PROD_SUPA = "https://pmtwhrqfdvbxbgrzcytl.supabase.co";
const STAGING_SUPA = "https://pcppyluqhsbhkjzmjpzk.supabase.co";
const SUPA = STAGING ? STAGING_SUPA : PROD_SUPA;

// /admin/ (statistiques de production) n'existe QUE sur la recette (décision de Julien du 26/11/2026) : retirée de
// l'export de production. Sur la recette, elle parle à la base de production (voir lib/config.ts).
if (!STAGING) rmSync(join(OUT, "admin"), { recursive: true, force: true });
const GSI = new Set(["creer/index.html", "mon-faire-part/index.html", "admin/index.html"]); // pages avec le bouton « Continuer avec Google »

function walk(dir) {
  return readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith(".html") ? [p] : []; });
}
let n = 0;
for (const file of walk(OUT)) {
  let html = readFileSync(file, "utf8");
  if (html.includes('http-equiv="Content-Security-Policy"')) continue;
  const hashes = [];
  for (const m of html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
    const attrs = m[1] || "", body = m[2];
    if (/\bsrc=/.test(attrs) || /application\/ld\+json/.test(attrs) || !body) continue;
    hashes.push("'sha256-" + createHash("sha256").update(body, "utf8").digest("base64") + "'");
  }
  if (/\son[a-z]+=/i.test(html.replace(/<script[\s\S]*?<\/script>/g, ""))) throw new Error("Gestionnaire d'événement en ligne dans " + file);
  const name = file.slice(OUT.length + 1), gsi = GSI.has(name);
  const csp = [
    "default-src 'none'",
    "script-src 'self' " + [...new Set(hashes)].join(" ") + (gsi ? " https://accounts.google.com/gsi/client" : ""),
    "style-src 'self' 'unsafe-inline'" + (gsi ? " https://accounts.google.com/gsi/style" : ""),
    "font-src 'self'",
    "img-src 'self' data: blob:",
    "connect-src 'self'" + (LOCAL ? "" : " " + (STAGING && name.startsWith("admin/") ? PROD_SUPA : SUPA)) + (gsi ? " https://accounts.google.com/gsi/" : ""),
    "frame-src " + (gsi ? "https://accounts.google.com/gsi/" : "'none'"),
    "manifest-src 'self'", "object-src 'none'", "base-uri 'none'", "form-action 'none'",
  ].join("; ");
  const meta = `<meta http-equiv="Content-Security-Policy" content="${csp}"/>`;
  const at = html.indexOf("<head>");
  if (at < 0) throw new Error("Pas de <head> dans " + file);
  // Juste après la déclaration d'encodage, avant tout script.
  const charset = html.indexOf("<meta charSet=\"utf-8\"/>", at);
  const pos = charset > -1 ? charset + '<meta charSet="utf-8"/>'.length : at + 6;
  html = html.slice(0, pos) + meta + html.slice(pos);
  writeFileSync(file, html); n++;
}
// invitation.html?f=… reste l'adresse des faire-part, pour toujours (liens déjà envoyés) : la page exportée en
// invitation/index.html devient invitation.html, et le dossier disparaît (une seule adresse, pas de doublon).
const inv = join(OUT, "invitation", "index.html");
if (existsSync(inv)) { cpSync(inv, join(OUT, "invitation.html")); rmSync(join(OUT, "invitation"), { recursive: true, force: true }); }
const invHtml = readFileSync(join(OUT, "invitation.html"), "utf8");
if (!/<meta name="robots" content="noindex, nofollow, noarchive"/.test(invHtml)) throw new Error("invitation.html : noindex statique absent");
// Recette : jamais indexée (en-tête sur toutes les pages, en plus du robots.txt qui interdit tout).
if (STAGING) {
  const h = join(OUT, "_headers");
  writeFileSync(h, "# Recette (staging.maison-meli.com) : rien n'est indexé.\n/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n" + (existsSync(h) ? readFileSync(h, "utf8") : ""));
}
console.log(`CSP posée sur ${n} pages${STAGING ? " (recette)" : ""}.`);

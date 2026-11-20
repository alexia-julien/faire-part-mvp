// Après `next build` (export statique) : pose une CSP stricte dans chaque page HTML.
// GitHub Pages ne permet pas d'envoyer d'en-têtes HTTP, donc la politique est une balise <meta> placée en tête de <head>.
// Les seuls scripts en ligne sont ceux de Next.js (amorçage) : ils sont autorisés par leur empreinte SHA-256,
// jamais par 'unsafe-inline'. Les données structurées (application/ld+json) ne s'exécutent pas et n'en ont pas besoin.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const OUT = process.argv[2] || "out";
const LOCAL = process.env.NEXT_PUBLIC_FP_LOCAL === "1";
const SUPA = "https://pmtwhrqfdvbxbgrzcytl.supabase.co";
const GSI = new Set(["creer.html", "admin.html"]); // pages avec le bouton « Continuer avec Google »

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
    "connect-src 'self'" + (LOCAL ? "" : " " + SUPA) + (gsi ? " https://accounts.google.com/gsi/" : ""),
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
writeFileSync(join(OUT, ".nojekyll"), ""); // GitHub Pages : servir le dossier _next tel quel
console.log(`CSP posée sur ${n} pages.`);

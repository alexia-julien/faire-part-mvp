// Publie l'export statique (web/out) à la racine du dépôt : GitHub Pages sert la branche `dev` depuis sa racine.
// Les fichiers publiés la fois précédente sont listés dans .deploy-manifest et remplacés ; rien d'autre n'est touché
// (web/, supabase/, tests/, CNAME, README.md, SECURITY.md…).
import { createHash } from "node:crypto";
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const WEB = join(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = join(WEB, "..");
const OUT = join(WEB, "out");
const MANIFEST = join(ROOT, ".deploy-manifest");
const KEEP = new Set(["web", "supabase", "tests", ".git", ".github", "CNAME", "README.md", "SECURITY.md", ".gitignore", ".deploy-manifest", "wrangler.jsonc", ".assetsignore"]);

if (!existsSync(join(OUT, "index.html"))) throw new Error("Pas d'export : lancez d'abord `npm run build`.");
const html = readFileSync(join(OUT, "index.html"), "utf8");
if (html.includes("NEXT_PUBLIC_FP_LOCAL") || !html.includes("Content-Security-Policy")) throw new Error("Export incomplet (CSP absente).");
if (!readFileSync(join(OUT, "mon-faire-part", "index.html"), "utf8").includes("pmtwhrqfdvbxbgrzcytl.supabase.co")) throw new Error("Cet export est en mode local : refaites `npm run build` (sans NEXT_PUBLIC_FP_LOCAL).");

// GitHub Pages ne sait pas faire de redirection 301 : les anciennes adresses reçoivent une page qui redirige
// immédiatement (en gardant ?… et #… : prénoms, ambiance, jetons de connexion), avec canonical et noindex.
// Sur Cloudflare Pages ou Netlify, public/_redirects fait de vraies 301 et ces pages ne sont pas utilisées.
const LEGACY = { "creer.html": "/creer/", "admin.html": "/mon-faire-part/", "confidentialite.html": "/confidentialite/", "conditions.html": "/conditions/" };
for (const [file, to] of Object.entries(LEGACY)) {
  const js = `location.replace(${JSON.stringify(to)}+location.search+location.hash)`;
  const h = "'sha256-" + createHash("sha256").update(js, "utf8").digest("base64") + "'";
  writeFileSync(join(OUT, file), `<!doctype html><html lang="fr"><head><meta charset="utf-8"/><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${h}; base-uri 'none'"/><meta name="robots" content="noindex"/><link rel="canonical" href="https://maison-meli.com${to}"/><meta http-equiv="refresh" content="0; url=${to}"/><title>Maison Meli</title><script>${js}</script></head><body><p><a href="${to}">Continuer vers Maison Meli</a></p></body></html>\n`);
}

function walk(dir) {
  return readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
}
// 1. Retire la publication précédente.
const previous = existsSync(MANIFEST) ? readFileSync(MANIFEST, "utf8").split("\n").filter(Boolean) : [];
for (const f of previous) {
  if (KEEP.has(f.split("/")[0])) continue;
  rmSync(join(ROOT, f), { force: true });
}
for (const d of ["_next", "invitation", "_not-found", "admin"]) rmSync(join(ROOT, d), { recursive: true, force: true });
// 2. Copie la nouvelle.
const files = walk(OUT).map((p) => relative(OUT, p));
for (const f of files) {
  if (KEEP.has(f.split("/")[0])) throw new Error("Conflit avec un fichier protégé : " + f);
  cpSync(join(OUT, f), join(ROOT, f), { recursive: true });
}
writeFileSync(MANIFEST, files.sort().join("\n") + "\n");
console.log(`${files.length} fichiers publiés à la racine du dépôt.`);

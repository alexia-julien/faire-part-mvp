// IndexNow (Bing, Yandex, Seznam… ; Copilot repose sur l'index de Bing) : à lancer après chaque mise en ligne.
//   node scripts/indexnow.mjs            → notifie toutes les pages du plan du site
//   node scripts/indexnow.mjs /guide/x/  → notifie seulement ces adresses
// La clé est publique par conception : elle prouve que le site autorise ces notifications (fichier /<clé>.txt).
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const KEY = "36d232792b9767bd0623dfa2ead573d5";
const HOST = "maison-meli.com";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "out");
const args = process.argv.slice(2);
const urls = args.length
  ? args.map((p) => "https://" + HOST + p)
  : [...readFileSync(join(OUT, "sitemap.xml"), "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: "https://" + HOST + "/" + KEY + ".txt", urlList: urls }),
});
console.log("IndexNow :", res.status, res.statusText, "—", urls.length, "adresses");
if (res.status >= 400) process.exit(1);

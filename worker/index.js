// Worker Cloudflare de maison-meli.com. Tout le site est statique (fichiers à la racine du dépôt) ; ce script ne
// s'exécute que pour la page des faire-part (run_worker_first : /invitation.html et /invitation).
//
// Rôle : quand un robot d'aperçu de lien (WhatsApp, iMessage, Messenger, Telegram, Slack…) lit un lien de faire-part,
// remplacer l'aperçu générique par « Prénom & Prénom se marient » + la date + l'image aux couleurs du faire-part.
// Décision de Julien du 20/11/2026 : prénoms et date oui, jamais le lieu ni l'adresse.
// Les invités (navigateurs) reçoivent la page telle quelle, sans appel supplémentaire : aucun impact sur eux.
// La lecture passe par get_invitation_preview, qui ne compte pas d'ouverture (statistiques non faussées).

const SLUG = /^[a-z0-9][a-z0-9-]{2,62}$/;
const BOTS = /whatsapp|facebookexternalhit|facebot|meta-externalagent|twitterbot|telegrambot|slackbot|slack-imgproxy|linkedinbot|discordbot|skypeuripreview|microsoftpreview|teams|bingpreview|pinterest|redditbot|embedly|iframely|applebot|snapchat|viber|signal|vkshare|line\/|kakaotalk|google-pagerenderer|googleother|mastodon|bluesky|preview/i;
const THEMES = new Set(["sauge", "rose", "terracotta", "lavande", "bordeaux", "riviera", "nuit", "noir", "ivoire", "olive", "porcelaine", "emeraude"]);
const PRIVATE = { "X-Robots-Tag": "noindex, nofollow, noarchive", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin", "X-Frame-Options": "DENY" };

const cap = (s) => String(s || "").trim().replace(/(^|[\s-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
function longDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return "";
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12));
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

async function preview(env, slug, ctx) {
  const cache = caches.default, key = new Request("https://preview.cache/" + slug);
  const hit = await cache.match(key);
  if (hit) return hit.json();
  const res = await fetch(env.SUPABASE_URL + "/rest/v1/rpc/get_invitation_preview", {
    method: "POST", signal: AbortSignal.timeout(2500),
    headers: { "Content-Type": "application/json", apikey: env.SUPABASE_ANON_KEY, Authorization: "Bearer " + env.SUPABASE_ANON_KEY },
    body: JSON.stringify({ p_slug: slug }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data && typeof data === "object") ctx.waitUntil(cache.put(key, new Response(JSON.stringify(data), { headers: { "Cache-Control": "max-age=600" } })));
  return data && typeof data === "object" ? data : null;
}

function withHeaders(res) {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(PRIVATE)) out.headers.set(k, v);
  return out;
}

// ---------------------------------------------------------------- Sentinelle (27/11/2026)
// Tâche planifiée (triggers.crons de wrangler.jsonc). Production : toutes les 5 minutes.
//   1. le site répond (accueil + page des faire-part) ;
//   2. la base répond (rpc/health) — cet appel régulier empêche aussi la mise en pause de l'offre gratuite Supabase ;
//   3. (prod) une sauvegarde nocturne a réussi il y a moins de 30 h.
// Alerte par e-mail (Resend) après 2 contrôles ratés d'affilée, rappel toutes les 3 h, message de retour à la normale.
// Destinataire : ALERT_TO (wrangler.jsonc, contact@maison-meli.com). Secret du Worker (Cloudflare > Workers > faire-part-mvp
// > Settings > Variables, type « Secret ») : RESEND_API_KEY.
// Sans ces secrets (préprod), la sentinelle ne fait que garder la base éveillée et écrire dans les journaux.
async function probe(url, init) {
  for (let i = 0; i < 2; i++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
      if (res.ok) return { ok: true, res };
      if (i) return { ok: false, why: "HTTP " + res.status };
    } catch (e) { if (i) return { ok: false, why: String(e && e.message || e) }; }
    await new Promise((r) => setTimeout(r, 3000));
  }
}

async function checks(env) {
  const site = env.SITE_URL || "https://maison-meli.com";
  const out = [];
  const home = await probe(site + "/");
  if (!home.ok) out.push("Accueil " + site + " : " + home.why);
  const inv = await probe(site + "/invitation.html");
  if (!inv.ok) out.push("Page des faire-part : " + inv.why);
  const db = await probe(env.SUPABASE_URL + "/rest/v1/rpc/health", {
    method: "POST", body: "{}",
    headers: { "Content-Type": "application/json", apikey: env.SUPABASE_ANON_KEY, Authorization: "Bearer " + env.SUPABASE_ANON_KEY },
  });
  if (!db.ok) out.push("Base Supabase (rpc/health) : " + db.why);
  else if (env.CHECK_BACKUP === "1") {
    let h = null;
    try { h = await db.res.json(); } catch { h = null; }
    const age = h && h.backup_age_h;
    if (age == null) out.push("Aucune sauvegarde enregistrée (private.backups_log vide)");
    else if (age > 30) out.push("Dernière sauvegarde réussie il y a " + age + " h (> 30 h)");
  }
  return out;
}

async function alert(env, subject, lines) {
  if (!env.RESEND_API_KEY || !env.ALERT_TO) { console.log("sentinelle", subject, lines); return; }
  const text = lines.join("\n") + "\n\nProcédure : claude/strategie-fiabilite-donnees.md (projet) et ops/sauvegarde/RESTAURATION.md (dépôt).";
  await fetch("https://api.resend.com/emails", {
    method: "POST", signal: AbortSignal.timeout(8000),
    headers: { Authorization: "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "Maison Meli Sentinelle <alerte@maison-meli.com>", to: [env.ALERT_TO], subject, text }),
  });
}

async function sentinel(env) {
  const problems = await checks(env);
  const kv = env.SENTINEL;
  const prev = kv ? JSON.parse((await kv.get("state")) || '{"fails":0,"alerted":0}') : { fails: 0, alerted: 0 };
  const now = Date.now();
  if (!problems.length) {
    if (prev.alerted) await alert(env, "✅ Maison Meli : tout est rétabli", ["Tous les contrôles sont de nouveau verts."]);
    if (kv && (prev.fails || prev.alerted)) await kv.put("state", JSON.stringify({ fails: 0, alerted: 0 }));
    return;
  }
  const fails = prev.fails + 1;
  let alerted = prev.alerted;
  // Sans KV (préprod), pas de mémoire : alerte directe.
  if (!kv || (fails >= 2 && now - alerted > 3 * 3600e3)) {
    await alert(env, "🚨 Maison Meli : problème détecté", problems);
    alerted = now;
  }
  if (kv) await kv.put("state", JSON.stringify({ fails, alerted, last: problems }));
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(sentinel(env));
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname !== "/invitation.html" && url.pathname !== "/invitation") return env.ASSETS.fetch(request);
    // Les deux adresses servent la même page, sans redirection : ?f=… reste en place.
    const page = await env.ASSETS.fetch(new Request(new URL("/invitation", url), request));
    const slug = url.searchParams.get("f") || "";
    if (!page.ok || !SLUG.test(slug) || !BOTS.test(request.headers.get("user-agent") || "")) return withHeaders(page);

    let p = null;
    try { p = await preview(env, slug, ctx); } catch { p = null; }
    if (!p || !p.p1 || !p.p2) return withHeaders(page);
    const names = cap(p.p1) + " & " + cap(p.p2);
    const date = longDate(p.date);
    const title = names + (date ? " se marient le " + date : " se marient");
    const desc = "Ouvrez notre faire-part et dites-nous si vous serez là.";
    const image = url.origin + "/og/invitation-" + (THEMES.has(p.theme) ? p.theme : "sauge") + ".png";
    const alt = "Faire-part de mariage de " + names;
    const set = (attr, value) => ({ element(el) { el.setAttribute(attr, value); } });
    const out = new HTMLRewriter()
      .on("title", { element(el) { el.setInnerContent(names + " — Vous êtes invités"); } })
      .on('meta[property="og:title"]', set("content", title))
      .on('meta[name="twitter:title"]', set("content", title))
      .on('meta[property="og:description"]', set("content", desc))
      .on('meta[name="twitter:description"]', set("content", desc))
      .on('meta[name="description"]', set("content", desc))
      .on('meta[property="og:image"]', set("content", image))
      .on('meta[name="twitter:image"]', set("content", image))
      .on('meta[property="og:image:alt"]', set("content", alt))
      .on('meta[name="twitter:image:alt"]', set("content", alt))
      .transform(page);
    const res = withHeaders(out);
    res.headers.set("Cache-Control", "private, no-store");
    return res;
  },
};

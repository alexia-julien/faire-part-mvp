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

export default {
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

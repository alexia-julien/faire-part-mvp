"use client";

import { useEffect, useRef, useState } from "react";
import { api, randomKey, slugFromUrl } from "@/lib/api";
import { sanitizeConfig, RSVP_FIELDS, type Config, type RsvpData } from "@/lib/invitation";
import { track } from "@/lib/track";
import { InvitationView } from "@/components/invitation/invitation-view";
import { Skeleton } from "@/components/ui/skeleton";

// Page publique : charge le faire-part par son identifiant (?f=…) et l'affiche avec la réponse intégrée.
// Mémorise dans CE navigateur la réponse envoyée, avec un identifiant anonyme (rid) : l'invité peut la retrouver et la
// corriger, et le tableau du couple sait que la nouvelle réponse remplace l'ancienne. Rien n'est envoyé en plus.
function clean(d: unknown): Partial<RsvpData> {
  const out: Record<string, unknown> = {};
  if (!d || typeof d !== "object") return out;
  for (const k of RSVP_FIELDS) {
    const v = (d as Record<string, unknown>)[k];
    if (typeof v === "number" && isFinite(v)) out[k] = Math.max(0, Math.min(20, Math.floor(v)));
    else if (typeof v === "string") out[k] = v.slice(0, 1000);
  }
  if (out.attendance !== "yes" && out.attendance !== "no") delete out.attendance;
  return out as Partial<RsvpData>;
}

type State = { kind: "loading" } | { kind: "error"; msg: string } | { kind: "ok"; cfg: Config; slug: string; previous: Partial<RsvpData> | null; rid: string };

export function GuestInvitation() {
  const [st, setSt] = useState<State>({ kind: "loading" });
  const openedAt = useRef(0);

  useEffect(() => {
    // Anti-clickjacking, en plus de l'en-tête X-Frame-Options envoyé par Cloudflare (public/_headers).
    if (window.top !== window.self) { document.body.textContent = ""; return; }
    const slug = slugFromUrl();
    if (!slug) { setSt({ kind: "error", msg: "Lien incomplet : il manque l’identifiant du faire-part." }); return; }
    const KEY = "fp:answered:" + slug;
    let prev: { rid?: string; name?: string; data?: unknown } | null = null;
    try { prev = JSON.parse(localStorage.getItem(KEY) || "null"); } catch {}
    if (!prev || typeof prev !== "object" || !/^[a-z0-9]{12,32}$/.test(prev.rid || "")) prev = null;
    const rid = prev?.rid || randomKey(16);
    let prevData: Partial<RsvpData> | null = null;
    if (prev) {
      prevData = clean(prev.data);
      if (!prevData.name && typeof prev.name === "string") prevData.name = prev.name.slice(0, 120); // réponses d'avant cette version
      if (!prevData.name) prevData = null;
    }
    api.getInvitation(slug).then((raw) => {
      if (!raw) { setSt({ kind: "error", msg: "Ce faire-part est introuvable. Vérifiez le lien reçu." }); return; }
      const cfg = sanitizeConfig(raw);
      document.title = cfg.partner1 + " & " + cfg.partner2 + " — Vous êtes invités";
      openedAt.current = Date.now();
      setSt({ kind: "ok", cfg, slug, previous: prevData, rid });
    }).catch(() => setSt({ kind: "error", msg: "Impossible de charger le faire-part pour le moment. Merci de réessayer dans un instant." }));
  }, []);

  // Fond de page et barre du navigateur mobile assortis au papier du faire-part.
  useEffect(() => {
    if (st.kind !== "ok") return;
    const el = document.querySelector(".fp-stage .fp");
    const paper = el ? getComputedStyle(el).getPropertyValue("--paper").trim() : "";
    if (!paper) return;
    document.documentElement.style.backgroundColor = paper; document.body.style.backgroundColor = paper;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", paper);
  }, [st]);

  if (st.kind === "loading") {
    return (
      <main className="min-h-dvh grid place-items-center px-6" aria-busy="true">
        <div className="w-full max-w-sm flex flex-col items-center gap-5" role="status" aria-label="Chargement du faire-part">
          <Skeleton className="h-3 w-40 rounded-full" />
          <Skeleton className="aspect-[7/5] w-full rounded-[14px]" />
          <Skeleton className="h-3 w-52 rounded-full" />
        </div>
      </main>
    );
  }
  if (st.kind === "error") {
    return (
      <main className="min-h-dvh grid place-items-center px-6 text-center">
        <div className="measure">
          <p className="t-label mb-3">Maison Meli</p>
          <h1 className="t-section mb-3">Oh, ce faire-part reste introuvable</h1>
          <p className="state t-lead" role="alert">{st.msg}</p>
        </div>
      </main>
    );
  }

  const { cfg, slug, previous, rid } = st;
  return (
    <main id="root">
      <InvitationView
        cfg={cfg}
        previous={previous}
        // US-14 : lien discret vers Maison Meli, uniquement après la réponse, avec la provenance « faire-part » (+ UTM, brief SEO/GEO).
        madeWith={new URL("/?src=faire-part&utm_source=faire-part&utm_medium=referral&utm_campaign=cree-avec-maison-meli", location.href).href}
        onMadeWith={() => track("cta_create", {}, slug)}
        onSubmit={async (data) => {
          const payload = { ...data, rid, elapsed: Math.max(0, Math.min(86400, Math.round((Date.now() - openedAt.current) / 1000))) };
          await api.submitRsvp(slug, payload);
          try { localStorage.setItem("fp:answered:" + slug, JSON.stringify({ rid, name: data.name, data: clean(data) })); } catch {}
        }}
      />
    </main>
  );
}

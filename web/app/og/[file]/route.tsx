// Images Open Graph (1200 × 630) générées au build, une par page publique : /og/<page>.png.
// Le partage d'une page sur WhatsApp, Pinterest ou LinkedIn affiche ainsi son propre titre.
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { AMBIANCES } from "@/lib/ambiances";
import { PALETTES } from "@/lib/invitation";
import { allPages } from "@/lib/pages";
import { ogFile } from "@/lib/site";

export const dynamic = "force-static";

const fonts = join(process.cwd(), "node_modules/@fontsource");
const serif = readFile(join(fonts, "cormorant-garamond/files/cormorant-garamond-latin-500-normal.woff"));
const serifExt = readFile(join(fonts, "cormorant-garamond/files/cormorant-garamond-latin-ext-500-normal.woff"));
const sans = readFile(join(fonts, "mulish/files/mulish-latin-600-normal.woff"));

export function generateStaticParams() {
  const pages = allPages().filter((p) => p.index || p.path.startsWith("/guide/") || p.path.startsWith("/comparatif/")).map(ogFile);
  // Aperçus des faire-part (une image par palette), choisis par le Worker Cloudflare (worker/index.js).
  return [...new Set([...pages, ...PALETTES.map((p) => "invitation-" + p.id + ".png")])].map((file) => ({ file }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const pal = PALETTES.find((p) => "invitation-" + p.id + ".png" === file);
  if (pal) return invitationImage(pal.sw[0], pal.sw[1], pal.deep);
  const page = allPages().find((p) => ogFile(p) === file);
  if (!page) return new Response("Introuvable", { status: 404 });
  const amb = AMBIANCES.find((a) => a.page === page);
  const title = page.ogTitle || page.title;
  const kicker = amb ? "Ambiance " + amb.label + " · " + amb.tagline : page.path.startsWith("/guide/") ? "Guide" : page.path.startsWith("/comparatif/") ? "Comparatif" : "Faire-part de mariage digital · gratuit";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px 84px", background: "radial-gradient(70% 80% at 80% 20%, #F1E9DC, #FAF7F2 70%)", color: "#1C1A17" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontFamily: "Cormorant", fontSize: 44 }}>Maison Meli</div>
          {amb && (
            <div style={{ display: "flex", gap: 14 }}>
              {amb.palette.colors.map(([, c]) => <div key={c} style={{ width: 46, height: 46, borderRadius: 999, background: c, border: "2px solid rgba(28,26,23,.12)" }} />)}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ fontFamily: "Mulish", fontSize: 24, letterSpacing: 3, textTransform: "uppercase", color: "#8A6D33" }}>{kicker}</div>
          <div style={{ fontFamily: "Cormorant", fontSize: title.length > 48 ? 76 : 90, lineHeight: 1.02, maxWidth: 1000 }}>{title}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontFamily: "Mulish", fontSize: 24, color: "#6B6559" }}>
          <div style={{ width: 80, height: 2, background: "#C2A468" }} />
          maison-meli.com
        </div>
      </div>
    ),
    {
      width: 1200, height: 630,
      fonts: [
        { name: "Cormorant", data: await serif, style: "normal", weight: 500 },
        { name: "Cormorant", data: await serifExt, style: "normal", weight: 500 },
        { name: "Mulish", data: await sans, style: "normal", weight: 600 },
      ],
    },
  );
}

// Aperçu d'un faire-part : enveloppe aux couleurs de sa palette, cachet de cire. Aucun texte personnel dans l'image
// (les prénoms et la date sont dans le titre de l'aperçu, posé par le Worker).
async function invitationImage(paper: string, accent: string, deep: string) {
  const dark = parseInt(paper.slice(1, 3), 16) < 90;
  const ink = dark ? "#F3E6C8" : "#1C1A17";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: dark ? "#0F0F10" : "#EFE8DC" }}>
        <div style={{ position: "relative", width: 860, height: 520, borderRadius: 18, background: paper, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", paddingBottom: 70, boxShadow: "0 30px 80px rgba(0,0,0,.25)", overflow: "hidden" }}>
          <svg width="860" height="520" viewBox="0 0 860 520" style={{ position: "absolute", top: 0, left: 0 }}><path d="M0 0 L430 215 L860 0" fill="none" stroke={accent} strokeOpacity="0.55" strokeWidth="2" /></svg>
          <div style={{ position: "absolute", top: 170, left: 385, width: 90, height: 90, borderRadius: 999, background: deep, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 0 0 8px rgba(255,255,255,.18)" }}><div style={{ width: 36, height: 36, borderRadius: 999, border: `3px solid ${paper}`, opacity: 0.6 }} /></div>
          <div style={{ fontFamily: "Mulish", fontSize: 22, letterSpacing: 4, textTransform: "uppercase", color: dark ? accent : deep }}>Faire-part de mariage</div>
          <div style={{ fontFamily: "Cormorant", fontSize: 64, color: ink, marginTop: 12 }}>Vous êtes invités</div>
        </div>
      </div>
    ),
    {
      width: 1200, height: 630,
      fonts: [
        { name: "Cormorant", data: await serif, style: "normal", weight: 500 },
        { name: "Cormorant", data: await serifExt, style: "normal", weight: 500 },
        { name: "Mulish", data: await sans, style: "normal", weight: 600 },
      ],
    },
  );
}

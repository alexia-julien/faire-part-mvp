// Images Open Graph (1200 × 630) générées au build, une par page publique : /og/<page>.png.
// Le partage d'une page sur WhatsApp, Pinterest ou LinkedIn affiche ainsi son propre titre.
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { AMBIANCES } from "@/lib/ambiances";
import { allPages } from "@/lib/pages";
import { ogFile } from "@/lib/site";

export const dynamic = "force-static";

const fonts = join(process.cwd(), "node_modules/@fontsource");
const serif = readFile(join(fonts, "cormorant-garamond/files/cormorant-garamond-latin-500-normal.woff"));
const serifExt = readFile(join(fonts, "cormorant-garamond/files/cormorant-garamond-latin-ext-500-normal.woff"));
const sans = readFile(join(fonts, "mulish/files/mulish-latin-600-normal.woff"));

export function generateStaticParams() {
  return [...new Set(allPages().filter((p) => p.index || p.path.startsWith("/guide/") || p.path.startsWith("/comparatif/")).map(ogFile))].map((file) => ({ file }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
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

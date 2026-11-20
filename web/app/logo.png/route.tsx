// Logo carré (512 × 512) pour les données structurées Organization et les annuaires. Généré au build.
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const dynamic = "force-static";
const serif = readFile(join(process.cwd(), "node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-normal.woff"));

export async function GET() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAF7F2" }}>
        <div style={{ width: 400, height: 400, borderRadius: 999, background: "#1C1A17", display: "flex", alignItems: "center", justifyContent: "center", color: "#E2C58A", fontFamily: "Cormorant", fontSize: 190, letterSpacing: -6 }}>MM</div>
      </div>
    ),
    { width: 512, height: 512, fonts: [{ name: "Cormorant", data: await serif, style: "normal", weight: 500 }] },
  );
}

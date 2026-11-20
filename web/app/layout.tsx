import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/400-italic.css";
import "./globals.css";
import "@/styles/invitation.css";
import { Providers } from "@/components/site/providers";
import { SITE } from "@/lib/config";
import { JsonLd, organization } from "@/lib/schema";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Maison Meli — Faire-part de mariage digital", template: "%s — Maison Meli" },
  applicationName: "Maison Meli",
  icons: { icon: "/icon.svg" },
  formatDetection: { telephone: false, email: false, address: false },
  referrer: "strict-origin-when-cross-origin",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FAF7F2",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        <JsonLd data={organization()} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

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
  // Logo « le cachet » (21/11/2026) : favicon.ico pour les anciens navigateurs et Google, SVG net partout ailleurs.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
  manifest: "/site.webmanifest",
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

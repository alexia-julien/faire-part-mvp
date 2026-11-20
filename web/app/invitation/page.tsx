import type { Metadata } from "next";
import { GuestInvitation } from "./guest-invitation";

// Aperçu du lien (WhatsApp, SMS, réseaux) : générique, car le site est statique et les robots d'aperçu n'exécutent pas
// le JavaScript. Les prénoms et la date figurent dans le message de partage (lib/share.ts).
export const metadata: Metadata = {
  title: { absolute: "Vous êtes invités — Faire-part de mariage" },
  description: "Ouvrez le faire-part et répondez en un instant.",
  robots: { index: false, follow: false },
  referrer: "strict-origin-when-cross-origin",
  openGraph: {
    type: "website", siteName: "Maison Meli", locale: "fr_FR",
    title: "Vous êtes invités à notre mariage", description: "Ouvrez le faire-part et répondez en un instant.",
    images: [{ url: "/img/og-invitation.png", width: 1200, height: 630, alt: "Une enveloppe scellée : faire-part de mariage, vous êtes invités" }],
  },
  twitter: { card: "summary_large_image", images: ["/img/og-invitation.png"] },
};

export default function Page() {
  return <GuestInvitation />;
}

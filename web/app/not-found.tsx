import type { Metadata } from "next";
import { DocPage } from "@/components/site/doc-page";
import { Button } from "@/components/ui/button";
import { AMBIANCES } from "@/lib/ambiances";
import { GUIDE_LINKS } from "@/lib/guides";
import { PAGES } from "@/lib/site";

export const metadata: Metadata = { title: "Page introuvable", robots: { index: false } };

export default function NotFound() {
  return (
    <DocPage>
      <p className="t-label mb-4">Erreur 404</p>
      <h1>Cette page n’existe pas</h1>
      <p>Le lien est peut-être incomplet. Si vous cherchez un faire-part reçu, rouvrez le lien d’origine dans le message de vos hôtes.</p>
      <Button asChild size="lg" className="mt-2"><a href="/">Revenir à l’accueil</a></Button>
      <h2>Les ambiances</h2>
      <ul>{AMBIANCES.map((a) => <li key={a.slug}><a href={a.page.path}>Faire-part {a.label.toLowerCase()}</a></li>)}</ul>
      <h2>Les guides</h2>
      <ul>
        {GUIDE_LINKS.map((g) => <li key={g.path}><a href={g.path}>{g.headline}</a></li>)}
        <li><a href={PAGES.rsvp.path}>Les réponses de vos invités en ligne</a></li>
        <li><a href={PAGES.whatsapp.path}>Envoyer son faire-part sur WhatsApp</a></li>
      </ul>
    </DocPage>
  );
}

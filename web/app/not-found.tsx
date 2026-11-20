import type { Metadata } from "next";
import { DocPage } from "@/components/site/doc-page";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page introuvable", robots: { index: false } };

export default function NotFound() {
  return (
    <DocPage>
      <p className="t-label mb-4">Erreur 404</p>
      <h1>Cette page n’existe pas</h1>
      <p>Le lien est peut-être incomplet. Si vous cherchez un faire-part reçu, rouvrez le lien d’origine dans le message de vos hôtes.</p>
      <Button asChild size="lg" className="mt-6"><a href="./">Revenir à l’accueil</a></Button>
    </DocPage>
  );
}

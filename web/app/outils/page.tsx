import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { ContentPage, Cta } from "@/components/site/chrome";
import { PAGES, meta } from "@/lib/site";

export const metadata: Metadata = meta(PAGES.outils);

export default function Page() {
  return (
    <ContentPage trail={[PAGES.outils]}>
      <p className="t-label mb-4">Outils gratuits</p>
      <h1 className="t-display !text-[clamp(38px,5.5vw,60px)]">Des outils gratuits pour votre faire-part de mariage</h1>
      <p className="t-lead mt-6">Deux outils sans compte et sans inscription : l’un écrit le texte de votre faire-part selon le ton choisi, l’autre calcule quand envoyer chaque étape à partir de la date de votre mariage.</p>
      <ul className="mt-12 grid gap-4 sm:grid-cols-2">
        {[PAGES.generateur, PAGES.retroplanning].map((p) => (
          <li key={p.path}>
            <a href={p.path} className="group flex h-full flex-col gap-2 rounded-[24px] border border-border bg-card p-6 shadow-soft hover:border-foreground/30">
              <h2 className="font-serif text-[26px] leading-tight">{p.crumb}</h2>
              <p className="text-[15px] text-muted-foreground">{p.description}</p>
              <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-[14px] font-medium">Ouvrir <ArrowRight className="size-3.5" aria-hidden="true" /></span>
            </a>
          </li>
        ))}
      </ul>
      <Cta />
    </ContentPage>
  );
}

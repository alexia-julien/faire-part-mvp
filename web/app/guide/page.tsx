import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { ContentPage, Cta, PROSE } from "@/components/site/chrome";
import { GUIDE_LIST } from "@/lib/guides";
import { PAGES, meta } from "@/lib/site";

export const metadata: Metadata = meta(PAGES.guides);

export default function Page() {
  const guides = GUIDE_LIST.filter((g) => g.kind === "guide"), comps = GUIDE_LIST.filter((g) => g.kind === "comparatif");
  const list = (items: typeof GUIDE_LIST) => (
    <ul className="mt-6 grid gap-4 sm:grid-cols-2">
      {items.map((g) => (
        <li key={g.path}>
          <a href={g.path} className="group flex h-full flex-col gap-2 rounded-[24px] border border-border bg-card p-6 shadow-soft hover:border-foreground/30">
            <h3 className="font-serif text-[24px] leading-tight">{g.headline}</h3>
            <p className="text-[15px] text-muted-foreground">{g.summary}</p>
            <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-[14px] font-medium">Lire <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span>
          </a>
        </li>
      ))}
    </ul>
  );
  return (
    <ContentPage trail={[PAGES.guides]} current={PAGES.guides.path}>
      <p className="t-label mb-4">Guides</p>
      <h1 className="t-display !text-[clamp(38px,5.5vw,60px)]">Les guides du faire-part de mariage</h1>
      <p className="t-lead mt-6">Quel texte écrire, quand envoyer, comment obtenir toutes les réponses à temps, papier ou digital : des guides concrets, avec des exemples à copier, relus et mis à jour chaque année.</p>
      <section aria-labelledby="h-g" className="mt-14"><h2 id="h-g" className="font-serif text-[32px] leading-tight">Organiser son faire-part</h2>{list(guides)}</section>
      <section aria-labelledby="h-c" className="mt-14"><h2 id="h-c" className="font-serif text-[32px] leading-tight">Comparer avant de choisir</h2>{list(comps)}</section>
      <section aria-labelledby="h-t" className={"mt-14 " + PROSE}>
        <h2 id="h-t" className="!mt-0">Outils gratuits</h2>
        <p>Le <a href={PAGES.generateur.path}>générateur de texte de faire-part</a> compose votre texte selon le ton et la cérémonie ; le <a href={PAGES.retroplanning.path}>rétroplanning</a> calcule les dates d’envoi à partir de la date du mariage.</p>
      </section>
      <Cta />
    </ContentPage>
  );
}

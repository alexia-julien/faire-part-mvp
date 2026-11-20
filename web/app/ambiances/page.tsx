import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { ContentPage, Cta, Faq, PROSE } from "@/components/site/chrome";
import { MiniCard } from "@/components/invitation/mini-card";
import { AMBIANCES } from "@/lib/ambiances";
import { PRESETS, sampleConfig } from "@/lib/invitation";
import { PAGES, meta } from "@/lib/site";

export const metadata: Metadata = meta(PAGES.ambiances);

const FAQ: [string, string][] = [
  ["Qu’est-ce qu’une ambiance Maison Meli ?", "Un ensemble prêt à l’emploi qui règle d’un coup la palette de couleurs, la typographie, les ornements, le papier de l’enveloppe, le cachet de cire et la forme des photos. Vous choisissez une ambiance, puis vous ajustez librement chaque élément."],
  ["Peut-on changer d’ambiance après avoir envoyé le faire-part ?", "Oui. Le faire-part reste modifiable après l’envoi, ambiance comprise, et le lien reçu par vos invités ne change pas. Les réponses déjà reçues sont conservées."],
  ["Les ambiances sont-elles toutes gratuites ?", "Oui, les neuf ambiances, les douze palettes, les huit typographies et les finitions dorées sont gratuites aujourd’hui, sans carte bancaire."],
  ["Peut-on mélanger deux ambiances ?", "Oui, indirectement : partez de l’ambiance la plus proche de votre mariage, puis changez la palette, la police ou les ornements. Par exemple, l’ambiance Champêtre avec la palette terracotta, ou l’ambiance Minimaliste avec une dorure."],
];

export default function Page() {
  return (
    <ContentPage trail={[PAGES.ambiances]} current={PAGES.ambiances.path} wide>
      <div className="max-w-[760px]">
        <p className="t-label mb-4">Neuf collections</p>
        <h1 className="t-display !text-[clamp(38px,5.5vw,60px)]">Les ambiances de faire-part de mariage digital</h1>
        <p className="t-lead mt-6">Champêtre, bohème, romantique, chic, château, Gatsby, hiver, bleu et blanc ou minimaliste : chaque ambiance Maison Meli règle en un geste les couleurs, la typographie, les ornements, l’enveloppe et le cachet de cire de votre faire-part. Toutes sont gratuites et restent modifiables après l’envoi.</p>
      </div>
      <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {AMBIANCES.map((a) => {
          const p = PRESETS.find((x) => x.id === a.preset)!;
          return (
            <li key={a.slug}>
              <a href={a.page.path} className="group flex h-full flex-col gap-4 rounded-[28px] bg-card p-3 shadow-soft transition-shadow hover:shadow-lift">
                <div className="overflow-hidden rounded-[20px]" aria-hidden="true"><div className="transition-transform duration-500 group-hover:scale-[1.03]"><MiniCard cfg={sampleConfig({}, p)} /></div></div>
                <div className="flex items-end justify-between gap-3 px-2 pb-1">
                  <div><h2 className="font-serif text-[26px] leading-tight">{a.label}</h2><p className="text-[14px] text-muted-foreground">{a.tagline}</p></div>
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-foreground text-background" aria-hidden="true"><ArrowRight className="size-4" /></span>
                </div>
              </a>
            </li>
          );
        })}
      </ul>
      <div className={"mx-auto mt-16 max-w-[760px] " + PROSE}>
        <h2>Comment choisir son ambiance</h2>
        <p>Partez du lieu plutôt que de la couleur. Une grange ou un domaine viticole appelle l’ambiance <a href="/ambiances/champetre/">Champêtre</a> ; une bastide ou une plage, la <a href="/ambiances/boheme/">Bohème</a> ; un château ou une demeure historique, l’ambiance <a href="/ambiances/chateau/">Château</a>. Pour une réception du soir, <a href="/ambiances/elegance/">Élégance</a> et <a href="/ambiances/gatsby/">Gatsby</a> jouent le fond sombre et la dorure. En hiver, <a href="/ambiances/jardin-d-hiver/">Jardin d’hiver</a> ; au bord de la mer, <a href="/ambiances/porcelaine/">Porcelaine</a> ou <a href="/ambiances/minimaliste/">Minimaliste</a>.</p>
        <p>Ensuite, ajustez : chaque ambiance accepte les douze palettes de couleurs, les huit typographies, cinq ornements et quatre finitions (encre, dorure, or rose, argent). Rien n’est figé, et vous pouvez tout changer jusqu’au jour du mariage sans renvoyer de lien.</p>
        <Faq items={FAQ} title="Questions sur les ambiances" />
        <Cta />
      </div>
    </ContentPage>
  );
}

import type { Metadata } from "next";
import { Answer, ContentPage, Cta, Faq, PROSE } from "@/components/site/chrome";
import { Retroplanning } from "@/components/tools/retroplanning";
import { GUIDES } from "@/lib/guides";
import { PAGES, meta } from "@/lib/site";

export const metadata: Metadata = meta(PAGES.retroplanning);

const FAQ: [string, string][] = [
  ["D’où viennent ces délais ?", "Des recommandations publiées par les guides mariage : Mariages.net conseille d’envoyer le faire-part 4 à 6 mois avant (jusqu’à 10 mois pour un mariage à l’étranger) et de fixer la date limite de réponse idéalement deux mois avant. Le save the date part en général 6 à 12 mois avant. Les relances sont un conseil Maison Meli."],
  ["Mon mariage est dans moins de quatre mois, est-ce trop tard ?", "Non. Envoyez votre faire-part au plus vite, de préférence par lien pour qu’il arrive le jour même, et raccourcissez la date limite de réponse en prévenant vos invités."],
  ["Le rétroplanning est-il enregistré ?", "Non, il est calculé dans votre navigateur et disparaît quand vous quittez la page. Rien n’est envoyé à Maison Meli."],
];

export default function Page() {
  return (
    <ContentPage trail={[PAGES.outils, PAGES.retroplanning]} wide>
      <div className="max-w-[760px]">
        <p className="t-label mb-4">Outil gratuit</p>
        <h1 className="t-display !text-[clamp(38px,5.5vw,60px)]">Rétroplanning du faire-part de mariage</h1>
        <p className="t-lead mt-6">Indiquez la date de votre mariage : le rétroplanning calcule quand envoyer le save the date et le faire-part, quelle date limite de réponse fixer, et quand relancer vos invités. Gratuit, sans compte.</p>
      </div>
      <div className="mt-12"><Retroplanning /></div>
      <div className={"mx-auto mt-16 max-w-[760px] " + PROSE}>
        <h2>Quand envoyer son faire-part de mariage ?</h2>
        <Answer><p>Pour un mariage standard, entre quatre et six mois avant ; environ six mois pour un mariage en été ou pendant les vacances ; jusqu’à dix mois pour un mariage à l’étranger. Fixez la date limite de réponse environ deux mois avant le jour J, et relancez une à deux semaines avant cette date.</p></Answer>
        <p>Le détail, avec les cas particuliers et les sources, est dans notre <a href={GUIDES.digital.path + "#quand"}>guide du faire-part digital</a> et notre guide pour <a href={GUIDES.reponses.path}>organiser les réponses de ses invités</a>. Besoin du texte ? Le <a href={PAGES.generateur.path}>générateur de texte</a> s’en charge.</p>
        <Faq items={FAQ} title="Questions sur le rétroplanning" />
        <Cta />
      </div>
    </ContentPage>
  );
}

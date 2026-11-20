import type { Metadata } from "next";
import { Answer, ContentPage, Cta, Faq, PROSE } from "@/components/site/chrome";
import { TextGenerator } from "@/components/tools/text-generator";
import { GUIDES } from "@/lib/guides";
import { PAGES, meta } from "@/lib/site";

export const metadata: Metadata = meta(PAGES.generateur);

const FAQ: [string, string][] = [
  ["Le générateur est-il gratuit ?", "Oui, sans compte ni inscription. Le texte est calculé dans votre navigateur : rien n’est envoyé ni enregistré tant que vous ne créez pas votre faire-part."],
  ["Puis-je modifier le texte généré ?", "Bien sûr. Copiez-le pour le retoucher où vous voulez, ou envoyez-le dans l’éditeur Maison Meli, où chaque mot reste modifiable avec un aperçu en direct."],
  ["Le texte convient-il à un faire-part papier ?", "Oui, les formules sont celles des faire-part traditionnels. Choisissez le ton « Très formel » pour une date et une heure écrites en toutes lettres."],
];

export default function Page() {
  return (
    <ContentPage trail={[PAGES.outils, PAGES.generateur]} wide>
      <div className="max-w-[760px]">
        <p className="t-label mb-4">Outil gratuit</p>
        <h1 className="t-display !text-[clamp(38px,5.5vw,60px)]">Générateur de texte de faire-part de mariage</h1>
        <p className="t-lead mt-6">Indiquez vos prénoms, la date et le lieu, choisissez le ton et la cérémonie : le générateur écrit le texte de votre faire-part de mariage. Copiez-le, ou envoyez-le directement dans votre faire-part Maison Meli. Gratuit et sans compte.</p>
      </div>
      <div className="mt-12"><TextGenerator /></div>
      <div className={"mx-auto mt-16 max-w-[760px] " + PROSE}>
        <h2>Comment le générateur choisit-il les mots ?</h2>
        <Answer><p>Il suit les règles d’usage des faire-part : qui annonce, qui se marie, la cérémonie, la date et le lieu, puis un mot d’invitation. Le ton change les formules (« ont l’honneur », « ont la joie », « se marient ! »), et le ton formel écrit la date et l’heure en toutes lettres.</p></Answer>
        <p>Pour aller plus loin, notre guide propose <a href={GUIDES.textes.path}>40 textes de faire-part de mariage à copier</a>, du plus classique au plus drôle, avec les cas particuliers (mariage civil, religieux, sans enfants, familles recomposées). Le <a href={PAGES.retroplanning.path}>rétroplanning</a> vous dira ensuite quand l’envoyer.</p>
        <Faq items={FAQ} title="Questions sur le générateur" />
        <Cta />
      </div>
    </ContentPage>
  );
}

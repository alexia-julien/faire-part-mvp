import type { Metadata } from "next";
import { ContentPage, Cta, PROSE } from "@/components/site/chrome";
import { ENTITY, PAGES, meta } from "@/lib/site";

export const metadata: Metadata = meta(PAGES.apropos);

export default function Page() {
  return (
    <ContentPage trail={[PAGES.apropos]}>
      <p className="t-label mb-4">À propos</p>
      <h1 className="t-display !text-[clamp(38px,5.5vw,60px)]">Pourquoi Maison Meli existe</h1>
      <div className={PROSE}>
        <p className="!text-[19px]">{ENTITY}</p>
        <h2>Né d’un vrai mariage</h2>
        <p>Maison Meli est né de la préparation du mariage de son fondateur, Julien Meli. Il a d’abord conçu le faire-part qu’il voulait envoyer à ses propres invités, puis il l’a ouvert à tous les couples, gratuitement.</p>
        <h2>Ce en quoi nous croyons</h2>
        <ul>
          <li><strong>Un faire-part digital doit être beau.</strong> S’il ressemble à un formulaire, autant envoyer un SMS. Chaque ambiance est dessinée comme une collection de papetier : papier, typographie, cachet de cire, dorure.</li>
          <li><strong>Vos invités n’ont rien à faire de plus.</strong> Pas d’application, pas de compte, pas de mot de passe : un lien, une enveloppe, une réponse en trente secondes.</li>
          <li><strong>Vos données sont à vous.</strong> Pas de publicité, pas de revente, hébergement dans l’Union européenne, suppression à tout moment.</li>
          <li><strong>Dire ce que nous ne faisons pas.</strong> Maison Meli ne fait pas de papier, ni de site de mariage complet, et ne relance pas vos invités à votre place.</li>
        </ul>
        <h2 id="julien">Julien Meli, fondateur</h2>
        <p>Julien conçoit et développe Maison Meli en France. Il est aussi l’auteur et le relecteur des guides publiés sur ce site : certains sont rédigés avec l’aide d’une intelligence artificielle, puis vérifiés (faits, chiffres, sources) et validés par lui avant publication. Chaque guide indique sa date de mise à jour et ses sources.</p>
        <h2>Nous contacter</h2>
        <p>Une question, une idée, un bug ? Écrivez à <a href="mailto:contact@maison-meli.com">contact@maison-meli.com</a>. Les informations légales sont dans les <a href={PAGES.mentions.path}>mentions légales</a>.</p>
        <Cta />
      </div>
    </ContentPage>
  );
}

import type { Metadata } from "next";
import { Answer, ContentPage, Cta, Faq, PROSE, Table } from "@/components/site/chrome";
import { HeroBlock } from "@/components/site/hero-block";
import { GUIDES } from "@/lib/guides";
import { PAGES, meta } from "@/lib/site";

export const metadata: Metadata = meta(PAGES.rsvp);

const FAQ: [string, string][] = [
  ["Que veut dire RSVP sur un faire-part de mariage ?", "RSVP est l’abréviation de « Répondez s’il vous plaît ». Sur un faire-part, c’est la demande de confirmer sa présence avant une date limite. Avec Maison Meli, l’invité répond directement sur le faire-part, sans carton à renvoyer."],
  ["Mes invités doivent-ils créer un compte pour répondre ?", "Non. Ils ouvrent le lien, répondent une question à la fois et envoient. Seuls les mariés ont un compte, pour retrouver leur faire-part et leurs réponses."],
  ["Un invité peut-il modifier sa réponse ?", "Oui. S’il rouvre le faire-part depuis le même téléphone ou le même ordinateur, il retrouve sa réponse et peut la corriger ; votre tableau affiche alors la nouvelle version, pas un doublon."],
  ["Peut-on fixer une date limite de réponse ?", "Oui. Elle s’affiche sur le faire-part au moment de répondre. Les guides mariage recommandent souvent une date limite environ deux mois avant le mariage, pour finaliser le nombre de couverts et le plan de table."],
  ["Maison Meli relance-t-il les invités qui n’ont pas répondu ?", "Non, Maison Meli n’envoie aucun message à vos invités et ne demande pas leurs coordonnées. Pour relancer, renvoyez simplement le même lien par WhatsApp, SMS ou e-mail : il mène au même faire-part."],
  ["Combien de réponses un faire-part peut-il recevoir ?", "Jusqu’à 1 000 réponses par faire-part, ce qui couvre largement un mariage de plusieurs centaines de personnes, accompagnants compris."],
];

export default function Page() {
  return (
    <ContentPage trail={[PAGES.rsvp]} wide>
      <HeroBlock label="RSVP · la réponse des invités" title="Les réponses de vos invités, sans relance ni tableur"
        lead={<p>Avec Maison Meli, le RSVP de mariage (la réponse des invités) est intégré au faire-part : chaque invité répond sur la carte en trente secondes, et vous voyez tout dans un tableau de suivi. Présence, accompagnants, enfants, régimes alimentaires : rien à recopier, et c’est gratuit.</p>} />

      <div className={"mx-auto mt-16 max-w-[760px] " + PROSE}>
        <h2>Comment répondent vos invités ?</h2>
        <Answer><p>L’invité ouvre le lien reçu, découvre le faire-part puis touche « Répondre ». Les questions arrivent une par une : présence, nombre de personnes, prénoms des accompagnants, enfants, régime alimentaire, puis un mot pour vous. Un récapitulatif s’affiche avant l’envoi, et un remerciement personnalisé ensuite.</p></Answer>
        <p>Pas de formulaire long à faire défiler : une question à la fois, avec de grands boutons, pensée pour un pouce sur un téléphone. Si l’invité répond « non », on ne lui pose pas les questions sur le nombre de personnes, le régime alimentaire ou le brunch. S’il rouvre le faire-part plus tard depuis le même appareil, il retrouve sa réponse et peut la corriger.</p>

        <h2>Quelles questions pouvez-vous poser ?</h2>
        <p>La présence et le nom sont toujours demandés. Le reste s’active d’un geste dans l’éditeur :</p>
        <ul>
          <li><strong>Nombre de personnes</strong> et <strong>prénoms des accompagnants</strong>, pour savoir qui vient vraiment.</li>
          <li><strong>Enfants</strong>, comptés à part pour le traiteur et la garderie.</li>
          <li><strong>Régime alimentaire et allergies</strong> : végétarien, sans gluten, sans porc, allergies, en pastilles faciles à toucher.</li>
          <li><strong>Brunch du lendemain</strong>, si la fête continue.</li>
          <li><strong>E-mail, téléphone, adresse postale</strong>, utiles pour les remerciements.</li>
          <li><strong>Un message libre</strong> et <strong>une question personnalisée</strong> (la chanson qui vous fera danser, la navette depuis la gare…).</li>
          <li>Une <strong>date limite de réponse</strong>, affichée sur le faire-part.</li>
        </ul>

        <h2>Ce que vous voyez dans votre tableau de suivi</h2>
        <p>Votre page « Mon faire-part » se met à jour à chaque réponse. Elle affiche :</p>
        <Table caption="Le tableau de suivi Maison Meli" head={["Information", "Ce que vous obtenez"]} rows={[
          ["Totaux", "Adultes présents, enfants, absents, en temps réel"],
          ["Régimes et allergies", "Une liste regroupée, prête à envoyer au traiteur"],
          ["Réponses", "Recherche, filtres présents ou absents, tri, détail de chaque réponse"],
          ["Corrections", "Une réponse corrigée par l’invité remplace l’ancienne, sans doublon dans vos totaux"],
          ["Export", "Fichier CSV à ouvrir dans Excel ou Google Sheets, copie des e-mails"],
        ]} />

        <h2>RSVP en ligne ou carton-réponse papier ?</h2>
        <p>Le carton-réponse a son charme, mais il impose un timbre, des délais de courrier et une saisie à la main. Le formulaire en ligne séparé (Google Forms, Jotform…) résout la saisie, mais l’invité quitte le faire-part et reçoit deux liens. Avec Maison Meli, la réponse fait partie du faire-part : un seul lien, et l’émotion de l’enveloppe juste avant la question « Serez-vous des nôtres ? ». Pour aller plus loin, lisez notre guide <a href={GUIDES.reponses.path}>organiser les réponses de ses invités</a> (délais, relances, plan de table).</p>

        <h2>Et les données de vos invités ?</h2>
        <p>Vous êtes seuls à voir les réponses, depuis votre compte. Les données sont hébergées dans l’Union européenne, jamais revendues ni utilisées pour de la publicité, et vous pouvez tout supprimer à tout moment. Le détail est sur la page <a href={PAGES.confidentialite.path}>Confidentialité</a>.</p>

        <Faq items={FAQ} title="Questions sur le RSVP en ligne" />
        <p className="!mt-10">À lire aussi : <a href={PAGES.whatsapp.path}>envoyer son faire-part sur WhatsApp</a> et <a href={PAGES.exemple.path}>tester la réponse sur un faire-part d’exemple</a>.</p>
        <Cta title="Recevez vos premières réponses ce soir" />
      </div>
    </ContentPage>
  );
}

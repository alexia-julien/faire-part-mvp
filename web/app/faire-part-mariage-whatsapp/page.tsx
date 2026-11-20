import type { Metadata } from "next";
import { Answer, ContentPage, CopyText, Cta, Faq, PROSE } from "@/components/site/chrome";
import { HeroBlock } from "@/components/site/hero-block";
import { AmbianceDemo } from "@/components/site/ambiance-demo";
import { GUIDES } from "@/lib/guides";
import { PAGES, meta } from "@/lib/site";

export const metadata: Metadata = meta(PAGES.whatsapp);

const FAQ: [string, string][] = [
  ["Mes invités doivent-ils avoir WhatsApp ?", "Non. WhatsApp n’est qu’un moyen d’envoyer le lien. Le même lien fonctionne par SMS, par e-mail, sur Messenger ou Instagram, et s’ouvre dans n’importe quel navigateur."],
  ["Peut-on envoyer le faire-part dans un groupe WhatsApp ?", "Oui, c’est possible et pratique pour la famille proche. Pour les autres invités, un envoi individuel reste plus personnel et évite que les réponses se perdent dans la conversation : chacun répond de toute façon sur le faire-part, pas dans le groupe."],
  ["Quel aperçu s’affiche quand j’envoie le lien ?", "Une image d’enveloppe scellée avec la mention « Vous êtes invités à notre mariage ». Vos prénoms et la date figurent dans le message prêt à envoyer. L’aperçu reste volontairement discret : vos informations ne sont pas exposées dans les aperçus de liens."],
  ["Peut-on renvoyer le lien pour relancer ?", "Oui, c’est toujours le même lien. Renvoyez-le avec un petit mot à ceux qui n’ont pas répondu : ils retombent sur le faire-part, à jour."],
  ["Et pour les invités qui n’ont pas de smartphone ?", "Envoyez le lien par e-mail pour qu’ils l’ouvrent sur un ordinateur, ou montrez-leur le QR code du faire-part. Un proche peut aussi répondre pour eux."],
];

export default function Page() {
  return (
    <ContentPage trail={[PAGES.whatsapp]} wide>
      <HeroBlock label="Envoi du faire-part" title="Envoyer son faire-part de mariage sur WhatsApp, en un lien"
        lead={<p>Pour envoyer votre faire-part de mariage sur WhatsApp, créez-le sur Maison Meli, puis touchez « Partager » : le message avec vos prénoms, la date et le lien est prêt. Vos invités ouvrent l’enveloppe dans WhatsApp et répondent sur le faire-part, sans application à installer.</p>}
        aside={<AmbianceDemo preset="romantique" label="Ce que voient vos invités en touchant le lien" />} />

      <div className={"mx-auto mt-16 max-w-[760px] " + PROSE}>
        <h2>Les étapes, du faire-part au message</h2>
        <ol>
          <li><strong>Créez votre faire-part</strong> : prénoms, date, lieu, puis une ambiance. Comptez trois minutes environ.</li>
          <li><strong>Publiez-le</strong> : un compte se crée à ce moment-là, avec un code reçu par e-mail ou avec Google.</li>
          <li><strong>Touchez « Partager »</strong> : sur téléphone, le menu de partage s’ouvre avec WhatsApp, Messages, Mail. Sur ordinateur, copiez le lien et collez-le dans WhatsApp Web ou votre messagerie.</li>
          <li><strong>Choisissez vos destinataires</strong>, un par un ou en groupe, et envoyez.</li>
          <li><strong>Suivez les réponses</strong> dans votre tableau « Mon faire-part », au fil de l’eau.</li>
        </ol>

        <h2>Le message envoyé à vos invités</h2>
        <p>Maison Meli prépare ce texte, que vous pouvez modifier avant l’envoi :</p>
        <CopyText label="Message de partage">Camille & Thomas se marient le samedi 19 juin 2027 ! Découvrez notre faire-part et dites-nous si vous serez là : https://maison-meli.com/invitation.html?f=…</CopyText>
        <p>Pour un envoi plus personnel, ajoutez une phrase avant le lien : « On a pensé à toi en premier ! » ou « Mamie, il suffit de toucher le lien bleu ». C’est souvent ce petit mot qui fait répondre vite.</p>

        <h2>WhatsApp, SMS ou e-mail : que choisir ?</h2>
        <Answer><p>WhatsApp est le plus rapide pour la famille et les amis : le lien s’ouvre en un geste et les invités ont l’habitude de recevoir des invitations ainsi. Le SMS convient à ceux qui n’ont pas WhatsApp. L’e-mail reste préférable pour les invités plus formels ou professionnels, et pour ceux qui lisent sur ordinateur.</p></Answer>
        <p>Rien n’empêche de mélanger : c’est toujours le même lien, et toutes les réponses arrivent au même endroit. Pour les rares invités sans téléphone, téléchargez le QR code du faire-part depuis votre page de suivi et glissez-le dans une carte.</p>

        <h2>Est-ce que ça se fait, un faire-part par WhatsApp ?</h2>
        <p>Oui, et de plus en plus : les guides mariage présentent désormais l’invitation envoyée sur WhatsApp comme une pratique moderne et acceptée. La clé, c’est que le faire-part lui-même soit soigné, et qu’un mot personnel l’accompagne. Pour les proches attachés au papier, un coup de fil en plus du lien fait toute la différence. Nous détaillons l’étiquette dans <a href={GUIDES.digital.path}>le guide du faire-part de mariage digital</a>.</p>

        <Faq items={FAQ} title="Questions sur l’envoi par WhatsApp" />
        <p className="!mt-10">À lire aussi : <a href={PAGES.rsvp.path}>comment fonctionnent les réponses des invités</a>, <a href={GUIDES.textes.path}>40 textes de faire-part à copier</a>.</p>
        <Cta title="Votre lien peut partir ce soir" />
      </div>
    </ContentPage>
  );
}

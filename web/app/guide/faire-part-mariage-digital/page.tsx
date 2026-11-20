import type { Metadata } from "next";
import { Answer, Cta, Faq, Table } from "@/components/site/chrome";
import { GuideLayout } from "@/components/site/guide-layout";
import { AMBIANCES } from "@/lib/ambiances";
import { GUIDES } from "@/lib/guides";
import { PAGES, meta } from "@/lib/site";

const G = GUIDES.digital;
export const metadata: Metadata = meta(G, { type: "article", published: G.published, robots: G.index ? undefined : { index: false, follow: true } });

const FAQ: [string, string][] = [
  ["Un faire-part digital remplace-t-il le save the date ?", "Il peut faire les deux. Certains couples envoient d’abord un save the date (la date seule), puis le faire-part complet. Avec un faire-part digital modifiable, vous pouvez aussi publier tôt l’essentiel et compléter le programme plus tard, sans changer de lien."],
  ["Peut-on imprimer un faire-part digital ?", "Un faire-part digital est pensé pour l’écran : animations, boutons, réponse en ligne. Pour quelques invités, imprimez plutôt une petite carte avec le QR code du faire-part, qui mène à la version complète."],
  ["Le faire-part digital est-il plus écologique ?", "Il évite l’impression, les enveloppes et le transport du courrier. Son impact n’est pas nul pour autant (serveurs, téléphones), mais il supprime les principaux postes du faire-part papier : fabrication du papier, impression et acheminement."],
  ["Mes informations sont-elles visibles par tout le monde ?", "Le faire-part est visible par toute personne qui a son lien : partagez-le seulement avec vos invités. Sur Maison Meli, les faire-part des couples ne sont jamais indexés par les moteurs de recherche, et seuls les mariés voient les réponses."],
];

export default function Page() {
  return (
    <GuideLayout guide={G}
      intro={<p>Un faire-part de mariage digital est une invitation de mariage envoyée par lien (WhatsApp, SMS, e-mail) plutôt que par la poste. Il s’ouvre sur le téléphone des invités, contient toutes les informations pratiques et permet souvent de répondre directement. Ce guide détaille ses avantages, ses limites et l’étiquette pour bien l’utiliser.</p>}
      toc={[["definition", "Qu’est-ce qu’un faire-part de mariage digital ?"], ["poli", "Est-ce poli d’envoyer son faire-part par lien ?"], ["avantages", "Quels sont les avantages ?"], ["limites", "Quelles sont les limites ?"], ["quand", "Quand l’envoyer ?"], ["contenu", "Que doit contenir un bon faire-part digital ?"], ["envoi", "Comment l’envoyer et recueillir les réponses ?"], ["prix", "Combien coûte un faire-part digital ?"], ["grands-parents", "Et les invités peu connectés ?"], ["questions", "Questions fréquentes"]]}
      sources={[
        ["Insee — Bilan démographique 2025", "https://www.insee.fr/fr/statistiques/8719824"],
        ["Mariages.net — Faire-part de mariage numérique", "https://www.mariages.net/articles/faire-part-mariage-numerique--c11765"],
        ["Mariages.net — Quand envoyer vos faire-part de mariage", "https://www.mariages.net/articles/quand-envoyer-vos-faire-part-de-mariage--c2407"],
        ["Mariages.net — Prix moyen des faire-part (rapport 2025 sur le secteur nuptial)", "https://www.mariages.net/articles/modeles-faire-part-en-ligne-mariages-net--c9921"],
        ["Bridebook — Comment créer un faire-part de mariage", "https://bridebook.com/fr/article/comment-creer-un-faire-part-de-mariage"],
        ["Bridebook — Papeterie et formulations", "https://bridebook.com/fr/advice/wedding-stationery-wording"],
        ["La Poste — Tarifs Lettre verte 2026", "https://www.laposte.fr/tarif-lettre-verte"],
      ]}>
      <h2 id="definition">Qu’est-ce qu’un faire-part de mariage digital ?</h2>
      <Answer><p>C’est un faire-part conçu pour l’écran : une page web ou une image que l’on partage par un lien. Les versions les plus complètes reproduisent le rituel du papier (enveloppe, cachet, carte), ajoutent le programme, le plan d’accès et un formulaire de réponse, et restent modifiables après l’envoi.</p></Answer>
      <p>On parle aussi de faire-part numérique, électronique, en ligne, d’e-faire-part ou d’invitation de mariage digitale : c’est la même chose. On en trouve trois grandes familles : l’image ou le PDF (créé sur Canva par exemple) envoyé tel quel, le site de mariage complet, et le faire-part interactif qui réunit l’invitation et la réponse sur une seule page, comme Maison Meli.</p>
      <p>Le sujet concerne beaucoup de monde : la France a célébré 251 000 mariages en 2025, selon l’Insee.</p>

      <h2 id="poli">Est-ce poli d’envoyer son faire-part de mariage par lien ?</h2>
      <Answer><p>Oui, à deux conditions : que le faire-part soit soigné, et qu’il soit envoyé personnellement. Un lien accompagné d’un mot (« On a hâte de te voir ! ») est aussi chaleureux qu’une enveloppe. Les guides mariage présentent désormais l’invitation envoyée sur WhatsApp comme une pratique moderne et acceptée.</p></Answer>
      <p>Ce qui fait mauvais effet, ce n’est pas le digital : c’est l’envoi groupé impersonnel, le visuel bâclé ou l’oubli des informations essentielles. Pour les quelques proches attachés au papier, un appel ou une visite complète très bien le lien : c’est souvent ce qui touche le plus.</p>

      <h2 id="avantages">Quels sont les avantages d’un faire-part digital ?</h2>
      <ul>
        <li><strong>Il arrive le jour même</strong>, sans délai d’impression ni de courrier.</li>
        <li><strong>Les réponses sont intégrées</strong> : plus de carton-réponse à poster, ni de tableur à remplir à la main. Voir <a href={PAGES.rsvp.path}>le RSVP en ligne</a>.</li>
        <li><strong>Il reste modifiable</strong> : changement d’horaire, nouvelle navette, hébergement ajouté, et le lien ne change pas.</li>
        <li><strong>Tout est au même endroit</strong> : plan d’accès, ajout à l’agenda, programme, dress code, liste de mariage.</li>
        <li><strong>Il coûte peu ou rien</strong>, quand le papier et les timbres représentent un vrai budget.</li>
        <li><strong>Il voyage partout</strong> : idéal pour les invités à l’étranger, sans frais d’affranchissement international.</li>
      </ul>

      <h2 id="limites">Quelles sont les limites d’un faire-part digital ?</h2>
      <ul>
        <li><strong>Pas d’objet souvenir</strong> à poser sur le frigo ou à garder dans une boîte.</li>
        <li><strong>Quelques invités peu à l’aise avec le téléphone</strong>, qu’il faut accompagner.</li>
        <li><strong>La qualité varie énormément</strong> : un faire-part digital banal fait moins d’effet qu’un beau papier.</li>
        <li><strong>Le risque de se perdre</strong> dans une conversation de groupe, d’où l’intérêt d’un envoi individuel et d’une date limite claire.</li>
      </ul>
      <p>Pour peser le pour et le contre point par point, lisez notre <a href={GUIDES.papier.path}>comparatif faire-part papier ou digital</a>.</p>

      <Cta title="Essayez sans engagement" text="Créez votre faire-part en trois minutes et regardez-le sur votre téléphone avant de décider. Gratuit." />

      <h2 id="quand">Quand envoyer un faire-part de mariage digital ?</h2>
      <Answer><p>Les recommandations varient selon les guides, mais la plupart conseillent d’envoyer le faire-part entre trois et six mois avant le mariage, et plus tôt (jusqu’à dix mois) pour un mariage à l’étranger, en été ou près d’un jour férié. Un save the date peut partir six à douze mois avant.</p></Answer>
      <Table caption="Délais conseillés (sources : Mariages.net, Bridebook)" head={["Situation", "Faire-part", "Save the date"]} rows={[
        ["Mariage en France, invités proches", "4 mois environ", "Facultatif"],
        ["Mariage standard", "4 à 6 mois", "6 à 12 mois"],
        ["Été, pont, vacances scolaires", "6 mois environ", "Recommandé"],
        ["Mariage à l’étranger ou logistique complexe", "Jusqu’à 10 mois", "Fortement recommandé"],
      ]} />
      <p>Le digital a un avantage : il part instantanément. Vous pouvez donc attendre d’avoir confirmé le lieu et les horaires, puis envoyer le jour même. Notre <a href={PAGES.retroplanning.path}>rétroplanning du faire-part</a> calcule toutes les dates à partir du jour J.</p>

      <h2 id="contenu">Que doit contenir un bon faire-part digital ?</h2>
      <ul>
        <li>Les prénoms, la date avec le jour de la semaine, l’heure et le lieu (avec un lien vers le plan).</li>
        <li>Un texte d’invitation : voir nos <a href={GUIDES.textes.path}>40 textes de faire-part à copier</a>.</li>
        <li>Le programme de la journée, le dress code, l’hébergement et les infos pratiques si besoin.</li>
        <li>La réponse des invités avec une date limite, et les questions utiles (accompagnants, enfants, régimes).</li>
        <li>Une identité visuelle cohérente avec votre mariage : choisissez une <a href={PAGES.ambiances.path}>ambiance</a>, par exemple {AMBIANCES.slice(0, 3).map((a, i) => <span key={a.slug}>{i ? ", " : ""}<a href={a.page.path}>{a.label.toLowerCase()}</a></span>)}.</li>
      </ul>

      <h2 id="envoi">Comment l’envoyer et recueillir les réponses ?</h2>
      <Answer><p>On partage le lien par WhatsApp, SMS ou e-mail, idéalement un message par invité ou par foyer, avec un mot personnel. Les invités répondent sur le faire-part ; vous suivez tout dans un tableau. Pour relancer, renvoyez simplement le même lien à ceux qui n’ont pas répondu.</p></Answer>
      <p>Le détail pas à pas est dans notre page <a href={PAGES.whatsapp.path}>envoyer son faire-part de mariage sur WhatsApp</a>, et la méthode pour obtenir toutes les réponses à temps dans le guide <a href={GUIDES.reponses.path}>organiser les réponses de ses invités</a>.</p>

      <h2 id="prix">Combien coûte un faire-part de mariage digital ?</h2>
      <Answer><p>De zéro à quelques dizaines d’euros. Plusieurs outils sont gratuits, dont Maison Meli ; d’autres facturent un modèle premium ou une option. À titre de comparaison, les couples dépensent en moyenne 425 € pour 100 invitations et le reste de leur papeterie, selon Mariages.net, sans compter les timbres.</p></Answer>
      <p>Le timbre Lettre verte coûte 1,52 € en 2026 pour une lettre de 20 g, et passera à 1,67 € au 1er janvier 2027, selon La Poste. Un faire-part avec enveloppe épaisse ou plusieurs cartons peut dépasser 20 g et coûter davantage à envoyer.</p>

      <h2 id="grands-parents">Et les grands-parents, ou les invités peu connectés ?</h2>
      <p>Un bon faire-part digital s’ouvre sans application ni mot de passe : il suffit de toucher le lien, comme pour une photo. Écrivez-leur un message explicite (« Touche le lien bleu, tout s’affiche ! »), appelez-les pour leur annoncer la nouvelle de vive voix, ou laissez un proche répondre pour eux. Pour ceux qui n’ont vraiment pas de téléphone, une petite carte avec le QR code du faire-part fait le lien entre les deux mondes.</p>
      <Faq items={FAQ} />
      <Cta />
    </GuideLayout>
  );
}

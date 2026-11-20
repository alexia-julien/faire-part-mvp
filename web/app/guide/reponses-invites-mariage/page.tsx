import type { Metadata } from "next";
import { Answer, CopyText, Cta, Faq, Table } from "@/components/site/chrome";
import { GuideLayout } from "@/components/site/guide-layout";
import { GUIDES } from "@/lib/guides";
import { PAGES, meta } from "@/lib/site";

const G = GUIDES.reponses;
export const metadata: Metadata = meta(G, { type: "article", published: G.published, robots: G.index ? undefined : { index: false, follow: true } });

const FAQ: [string, string][] = [
  ["Que faire si un invité ne répond jamais ?", "Après la date limite, un appel direct reste le plus efficace. Sans réponse, considérez-le comme absent pour le traiteur et prévenez-le gentiment : c’est la règle la plus juste pour tout le monde."],
  ["Faut-il compter les bébés dans les réponses ?", "Oui : même sans menu, un bébé occupe une chaise haute ou un lit parapluie, et compte pour la salle. Demandez l’âge des enfants pour distinguer menus enfants, bébés et adolescents."],
  ["Peut-on demander l’adresse postale dans la réponse ?", "Oui, c’est même pratique pour envoyer les remerciements après le mariage. Ne demandez que ce dont vous avez vraiment besoin, et supprimez les données quand vous n’en avez plus l’usage."],
  ["Comment gérer un invité qui change d’avis ?", "Avec un formulaire en ligne modifiable, l’invité corrige sa réponse lui-même. Sinon, notez le changement dans votre liste et prévenez le traiteur si la date de clôture n’est pas passée."],
];

export default function Page() {
  return (
    <GuideLayout guide={G}
      intro={<p>Pour recevoir toutes les réponses de vos invités à temps, fixez une date limite claire, environ deux mois avant le mariage, posez seulement les questions utiles au traiteur et à l’organisation, et prévoyez une relance avant la date limite. Voici la méthode complète, avec des messages de relance à copier.</p>}
      toc={[["date-limite", "Quelle date limite de réponse fixer ?"], ["questions-utiles", "Quelles questions poser à vos invités ?"], ["relancer", "Comment relancer sans gêne ?"], ["accompagnants", "Comment gérer les accompagnants ?"], ["enfants", "Et les enfants ?"], ["regimes", "Comment recueillir les régimes et allergies ?"], ["desistements", "Que faire en cas de désistement ?"], ["outil", "Tableur ou outil en ligne ?"], ["questions", "Questions fréquentes"]]}
      sources={[
        ["Mariages.net — Quand envoyer vos faire-part et quelle date limite de réponse", "https://www.mariages.net/articles/quand-envoyer-vos-faire-part-de-mariage--c2407"],
        ["Mariages.net — Combien de temps pour organiser son mariage", "https://www.mariages.net/articles/combien-de-temps-faut-il-pour-preparer-un-mariage-sans-stress--c2870"],
        ["Bridebook — Papeterie et formulations (contenu du faire-part, RSVP)", "https://bridebook.com/fr/advice/wedding-stationery-wording"],
      ]}>
      <h2 id="date-limite">Quelle date limite de réponse fixer ?</h2>
      <Answer><p>Mariages.net conseille une date limite de réponse idéalement deux mois avant le mariage, pour finaliser le nombre d’invités, le plan de table et l’organisation. Partez de la date à laquelle votre traiteur et votre lieu veulent le nombre définitif de couverts, puis ajoutez deux à trois semaines de marge pour les relances.</p></Answer>
      <p>Si vous envoyez le faire-part quatre à six mois avant, une date limite à deux mois laisse à chacun le temps de s’organiser, sans que la réponse tombe dans l’oubli. Indiquez-la clairement : sur un faire-part Maison Meli, elle s’affiche au moment de répondre. Le <a href={PAGES.retroplanning.path}>rétroplanning du faire-part</a> la calcule pour vous.</p>

      <h2 id="questions-utiles">Quelles questions poser à vos invités ?</h2>
      <Answer><p>Demandez ce qui sert vraiment : présence, nombre de personnes et leurs prénoms, nombre d’enfants, régimes et allergies, présence au brunch s’il y en a un. Ajoutez les coordonnées seulement si vous en avez l’usage. Plus le formulaire est long, plus il risque d’être remis à plus tard.</p></Answer>
      <Table caption="Les questions utiles et leur raison d’être" head={["Question", "À quoi elle sert", "À poser si…"]} rows={[
        ["Présence", "Le nombre de couverts", "Toujours"],
        ["Nombre et prénoms des personnes", "Le plan de table, les marque-places", "Vous invitez des couples ou des familles"],
        ["Enfants et âges", "Menus enfants, chaises hautes, animation", "Les enfants sont invités"],
        ["Régimes et allergies", "Le menu du traiteur", "Toujours, si vous servez un repas"],
        ["Brunch du lendemain", "Les quantités du lendemain", "Vous organisez un brunch"],
        ["Adresse postale", "Les cartes de remerciement", "Vous enverrez des remerciements papier"],
        ["Question libre", "Navette, chanson, hébergement…", "Une information vous manque"],
      ]} />
      <p>Avec le <a href={PAGES.rsvp.path}>RSVP intégré de Maison Meli</a>, ces questions s’activent d’un geste et les invités y répondent une à une, sans formulaire interminable.</p>

      <h2 id="relancer">Comment relancer ses invités sans gêne ?</h2>
      <Answer><p>Prévoyez deux relances : une douce une à deux semaines avant la date limite, à ceux qui n’ont pas répondu, puis un message personnel ou un appel juste après. Restez léger et concret, et renvoyez le lien du faire-part : la réponse doit prendre trente secondes.</p></Answer>
      <CopyText label="Relance douce, avant la date limite">Coucou ! Petit rappel : on aimerait savoir si tu seras des nôtres le 12 juin. Tout est ici, ça prend 30 secondes : [lien du faire-part]. Merci !</CopyText>
      <CopyText label="Relance après la date limite">Bonjour à vous deux ! Nous finalisons le nombre d’invités avec le traiteur cette semaine. Pourriez-vous nous dire si vous serez présents ? Le lien : [lien du faire-part]. Nous serions tellement contents de vous voir.</CopyText>
      <CopyText label="Pour les proches, avec humour">Le traiteur nous a demandé si tu préférais le poisson ou la viande… on a dû avouer qu’on ne savait même pas si tu venais 😅 Réponds-nous ici : [lien du faire-part]</CopyText>

      <Cta title="Les réponses au même endroit" text="Faire-part, réponse et tableau de suivi sur un seul lien : vous voyez d’un coup d’œil qui n’a pas encore répondu. Gratuit." />

      <h2 id="accompagnants">Comment gérer les accompagnants ?</h2>
      <Answer><p>Le plus simple est d’inviter nommément : « Sophie et Marc » plutôt que « Sophie + 1 ». Si vous autorisez un accompagnant, demandez son prénom dans la réponse : c’est indispensable pour le plan de table et les marque-places, et cela évite les mauvaises surprises.</p></Answer>
      <p>Si vous ne souhaitez pas d’accompagnants non connus, n’ouvrez pas la possibilité dans le formulaire et invitez chaque personne par son nom. Pour les célibataires dont vous savez qu’ils seront seuls, une table d’amis bien pensée vaut mieux qu’un « +1 » de principe.</p>

      <h2 id="enfants">Et les enfants ?</h2>
      <p>Si les enfants sont invités, demandez leur nombre et leur âge : bébés, enfants et adolescents n’ont ni les mêmes menus, ni les mêmes besoins (chaise haute, animation, coin sieste). Si vous préférez un mariage entre adultes, dites-le simplement et positivement ; nos <a href={GUIDES.textes.path + "#situations"}>textes pour un mariage sans enfants</a> proposent des formulations.</p>

      <h2 id="regimes">Comment recueillir les régimes et allergies ?</h2>
      <Answer><p>Posez la question à chaque invité présent, avec des choix simples (végétarien, sans porc, sans gluten…) et un champ libre pour les allergies. Regroupez ensuite les réponses en une liste par régime, avec les noms, et transmettez-la au traiteur avec le nombre définitif de couverts.</p></Answer>
      <p>Une allergie n’est pas une préférence : signalez-la clairement au traiteur, nom par nom, et vérifiez avec lui le jour de la dégustation. Dans votre tableau de suivi Maison Meli, la liste des régimes est déjà regroupée, prête à envoyer.</p>

      <h2 id="desistements">Que faire en cas de désistement de dernière minute ?</h2>
      <p>Restez souples : un désistement arrive dans presque tous les mariages. Mariages.net suggère de profiter d’une place libérée au dîner pour inviter une personne prévue seulement au vin d’honneur. Prévenez le traiteur si la date de clôture n’est pas passée, et mettez à jour le plan de table.</p>

      <h2 id="outil">Tableur ou outil en ligne : comment suivre les réponses ?</h2>
      <Table caption="Trois façons de suivre les réponses" head={["Méthode", "Points forts", "Points faibles"]} rows={[
        ["Tableur (Excel, Google Sheets)", "Gratuit, totalement libre", "Tout est à saisir à la main, au fil des messages et des appels"],
        ["Formulaire séparé (Google Forms…)", "Les invités saisissent eux-mêmes", "Un lien en plus du faire-part, mise en forme limitée"],
        ["Faire-part avec réponse intégrée", "Un seul lien, totaux et régimes calculés", "Dépend de l’outil choisi"],
      ]} />
      <p>Quelle que soit la méthode, gardez une seule liste de référence, et protégez-la : ce sont des données personnelles. Ne les partagez qu’avec ceux qui en ont besoin (traiteur, lieu) et supprimez-les après le mariage.</p>
      <Faq items={FAQ} />
      <Cta />
    </GuideLayout>
  );
}

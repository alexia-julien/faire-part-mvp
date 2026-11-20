import type { Metadata } from "next";
import { Answer, CopyText, Cta, Faq, Table } from "@/components/site/chrome";
import { GuideLayout } from "@/components/site/guide-layout";
import { GUIDES } from "@/lib/guides";
import { PAGES, meta } from "@/lib/site";

const G = GUIDES.quand;
export const metadata: Metadata = meta(G, { type: "article", published: G.published, robots: G.index ? undefined : { index: false, follow: true } });

const FAQ: [string, string][] = [
  ["Peut-on envoyer ses faire-part un an avant ?", "C’est tôt pour le faire-part complet : les horaires, le programme ou l’hébergement ne sont souvent pas encore fixés, et les invités risquent d’oublier de répondre. Un an avant, envoyez plutôt un save the date, puis le faire-part quatre à six mois avant."],
  ["Mon mariage est dans deux mois, est-ce trop tard ?", "Non, mais n’attendez plus. Prévenez vos proches par téléphone, envoyez le faire-part tout de suite (un faire-part digital arrive le jour même) et fixez une date limite de réponse courte, trois à quatre semaines avant le mariage, en accord avec votre traiteur."],
  ["Faut-il envoyer le faire-part à tout le monde en même temps ?", "Oui, autant que possible : un invité qui apprend par un autre qu’il a été invité plus tard peut le prendre mal. Si vous gardez une liste d’attente, envoyez la deuxième vague discrètement et au moins deux mois avant le mariage."],
  ["Quand envoyer les faire-part aux invités du vin d’honneur ?", "En même temps que les autres, avec un texte adapté qui précise qu’ils sont conviés au vin d’honneur. S’ils peuvent être invités au dîner en cas de désistement, prévenez-les simplement le moment venu."],
];

export default function Page() {
  return (
    <GuideLayout guide={G}
      intro={<p>Pour un mariage en France, envoyez vos faire-part quatre à six mois avant la date, un save the date six à douze mois avant si vos invités doivent s’organiser, et fixez la date limite de réponse environ deux mois avant le mariage. Les guides mariage ne donnent pas tous les mêmes délais : voici leurs recommandations comparées, et les cas particuliers.</p>}
      toc={[["delais", "Combien de mois avant envoyer ses faire-part ?"], ["comparaison", "Ce que disent les guides mariage"], ["save-the-date", "Quand envoyer le save the date ?"], ["date-limite", "Quelle date limite de réponse ?"], ["cas", "Les cas particuliers"], ["papier-digital", "Papier ou digital : le délai change-t-il ?"], ["questions", "Questions fréquentes"]]}
      sources={[
        ["Mariages.net — Quand envoyer vos faire-part de mariage", "https://www.mariages.net/articles/quand-envoyer-vos-faire-part-de-mariage--c2407"],
        ["Mariages.net — Quand commander ses faire-part", "https://www.mariages.net/articles/faire-part-mariage-personnalite--c10580"],
        ["Bridebook — Quand faut-il envoyer son faire-part de mariage ?", "https://bridebook.com/fr/article/quand-faut-il-envoyer-son-faire-part-de-mariage"],
        ["Bridebook — Papeterie et formulations", "https://bridebook.com/fr/advice/wedding-stationery-wording"],
        ["ABC Salles — Quand envoyer son save the date", "https://www.abcsalles.com/guide/mariage/envoyer-save-the-date-mariage"],
        ["ABC Salles — Quand envoyer faire-part et remerciements", "https://www.abcsalles.com/guide/mariage/quand-envoyer-faire-part-remerciements-mariage-convives"],
        ["Joy — Cartes save the date", "https://withjoy.com/cards/wedding/save-the-date/?l=fr-FR"],
        ["La Poste — Tarifs Lettre verte 2026 (délai J+3)", "https://www.laposte.fr/tarif-lettre-verte"],
      ]}>
      <h2 id="delais">Combien de mois avant envoyer ses faire-part de mariage ?</h2>
      <Answer><p>Quatre à six mois avant le mariage est le délai le plus souvent conseillé pour un mariage en France. Comptez environ six mois pour un mariage en été, sur un pont ou pendant les vacances scolaires, et jusqu’à dix mois pour un mariage à l’étranger ou avec beaucoup d’invités qui doivent voyager.</p></Answer>
      <p>Le bon délai est un équilibre : assez tôt pour que vos invités posent leurs congés et réservent leur transport, assez tard pour que le lieu, les horaires et le programme soient confirmés, et pour que la réponse ne tombe pas dans l’oubli. Notre <a href={PAGES.retroplanning.path}>rétroplanning du faire-part</a> calcule toutes les dates à partir du jour J.</p>

      <h2 id="comparaison">Ce que disent les guides mariage</h2>
      <p>Les recommandations varient d’une source à l’autre. Les voici côte à côte, telles que publiées (consultées le 20 novembre 2026) :</p>
      <Table caption="Délais d’envoi recommandés selon les sources" head={["Source", "Faire-part", "Save the date"]} rows={[
        ["Mariages.net", "4 à 6 mois (6 mois en été ou près d’un jour férié, environ 10 mois pour un mariage à l’étranger)", "Recommandé si vous envoyez le faire-part plus tard"],
        ["Bridebook (guide papeterie)", "3 à 6 mois, davantage pour un mariage à l’étranger", "—"],
        ["Bridebook (article dédié)", "8 à 12 mois ; 4 à 5 mois pour un petit comité déjà prévenu", "6 à 12 mois"],
        ["ABC Salles", "6 à 8 mois", "6 à 8 mois pour un mariage local"],
        ["Joy", "—", "4 à 6 mois ; au moins 9 mois pour un mariage à l’étranger"],
      ]} />
      <p>Le consensus : <strong>quatre à six mois</strong> pour le faire-part d’un mariage classique, plus tôt dès que les invités doivent s’organiser (vacances, voyage, étranger). Si vous hésitez, envoyez un save the date tôt et le faire-part complet ensuite.</p>

      <Cta title="Le jour où c’est prêt, c’est parti" text="Un faire-part digital part le jour même : envoyez-le dès que le lieu et les horaires sont confirmés. Gratuit." />

      <h2 id="save-the-date">Quand envoyer le save the date ?</h2>
      <Answer><p>Six à douze mois avant le mariage, selon les guides. Le save the date annonce seulement la date et le lieu approximatif, pour que vos invités la bloquent. Il est surtout utile pour un mariage en été, pendant les vacances, à l’étranger, ou si beaucoup d’invités viennent de loin.</p></Answer>
      <p>Il n’est pas obligatoire : pour un mariage proche de vos invités, en petit comité ou hors saison, un faire-part envoyé quatre à cinq mois avant suffit souvent. Un message simple fait l’affaire :</p>
      <CopyText label="Save the date">Save the date ! Claire & Mathieu se marient le samedi 12 juin 2027 en Provence. Faire-part et programme à suivre. Bloquez la date !</CopyText>

      <h2 id="date-limite">Quelle date limite de réponse fixer ?</h2>
      <Answer><p>Environ deux mois avant le mariage, selon Mariages.net, pour finaliser le nombre d’invités, le plan de table et l’organisation. Vérifiez surtout la date à laquelle votre traiteur et votre lieu veulent le nombre définitif de couverts, et gardez deux à trois semaines de marge pour relancer.</p></Answer>
      <p>La méthode complète (relances, accompagnants, régimes alimentaires) est dans notre guide <a href={GUIDES.reponses.path}>organiser les réponses de ses invités</a>.</p>

      <h2 id="cas">Les cas particuliers</h2>
      <Table caption="Délais conseillés selon la situation" head={["Situation", "Faire-part", "Conseil"]} rows={[
        ["Mariage en été, sur un pont, pendant les vacances", "Environ 6 mois", "Save the date fortement conseillé : les familles réservent leurs vacances tôt"],
        ["Mariage à l’étranger", "Jusqu’à 10 mois", "Save the date 9 à 12 mois avant, infos de voyage et d’hébergement dans le faire-part"],
        ["Mariage en hiver, entre les fêtes", "4 à 6 mois", "Envoyez avant la rentrée de septembre, quand les plannings de fin d’année se remplissent"],
        ["Petit comité, invités déjà prévenus", "4 à 5 mois", "Un appel personnel compte plus que le délai"],
        ["Mariage organisé en moins de 4 mois", "Tout de suite", "Prévenez par téléphone, envoyez par lien, date limite courte"],
      ]} />

      <h2 id="papier-digital">Papier ou digital : le délai change-t-il ?</h2>
      <p>Oui, côté préparation. Un faire-part papier demande de prévoir la création, l’impression, la livraison et la mise sous pli ; Mariages.net conseille de recevoir ses faire-part au moins six mois avant le mariage pour pouvoir les envoyer à temps. Il faut ensuite compter le courrier : trois jours ouvrés en Lettre verte.</p>
      <p>Un faire-part digital part le jour même et reste modifiable : vous pouvez l’envoyer dès que l’essentiel est confirmé, puis compléter le programme ou l’hébergement plus tard sans changer de lien. Pour comparer les deux formats, lisez <a href={GUIDES.papier.path}>faire-part papier ou digital</a> ; pour le texte, nos <a href={GUIDES.textes.path}>40 textes de faire-part à copier</a>.</p>
      <Faq items={FAQ} />
      <Cta />
    </GuideLayout>
  );
}

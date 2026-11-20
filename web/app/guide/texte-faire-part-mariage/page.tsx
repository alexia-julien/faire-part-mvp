import type { Metadata } from "next";
import { Answer, CopyText, Cta, Faq, Table } from "@/components/site/chrome";
import { GuideLayout } from "@/components/site/guide-layout";
import { GUIDES } from "@/lib/guides";
import { PAGES, meta } from "@/lib/site";

const G = GUIDES.textes;
export const metadata: Metadata = meta(G, { type: "article", published: G.published, robots: G.index ? undefined : { index: false, follow: true } });

type T = [string, string];
const CATS: { id: string; h2: string; answer: string; items: T[] }[] = [
  { id: "classiques", h2: "Textes de faire-part classiques", answer: "Le texte classique suit un ordre immuable : qui annonce, qui se marie, la cérémonie avec sa date en toutes lettres, l’heure et le lieu, puis la réception. Les formules « ont la joie » ou « sont heureux » conviennent à presque tous les mariages ; « ont l’honneur » reste réservé aux faire-part les plus formels.", items: [
    ["Les mariés invitent", "Claire & Mathieu\nont la joie de vous inviter à leur mariage\nqui sera célébré le samedi douze juin deux mille vingt-sept à quinze heures\nen la mairie de Saint-Rémy-de-Provence.\nLa réception suivra au Mas des Oliviers."],
    ["Sobre et chaleureux", "Claire & Mathieu\nsont heureux de vous annoncer leur mariage\net seraient ravis de vous compter parmi eux\nle samedi 12 juin 2027 à 15 h,\nau Mas des Oliviers, Saint-Rémy-de-Provence."],
    ["Avec la réponse attendue", "Claire & Mathieu\nvous invitent à célébrer leur mariage\nle samedi 12 juin 2027 à 15 h au Mas des Oliviers.\nMerci de nous répondre avant le 12 avril 2027."],
    ["Cérémonie puis dîner", "Claire & Mathieu\nont le plaisir de vous convier à leur mariage.\nCérémonie le samedi 12 juin 2027 à 15 h en la mairie de Saint-Rémy,\nvin d’honneur et dîner au Mas des Oliviers."],
    ["Formel", "Claire Dumas et Mathieu Perrin\nvous prient de leur faire l’honneur d’assister à leur mariage\nle samedi douze juin deux mille vingt-sept à seize heures\nen l’église Saint-Martin de Saint-Rémy-de-Provence."],
  ] },
  { id: "simples", h2: "Textes simples et courts", answer: "Un texte court est souvent le plus efficace sur un faire-part digital : vos invités le lisent sur un téléphone, et le programme, le lieu et la réponse figurent juste en dessous. Gardez les prénoms, la date, le lieu et une phrase d’invitation, rien de plus.", items: [
    ["L’essentiel", "Claire & Mathieu se marient !\nSamedi 12 juin 2027, Saint-Rémy-de-Provence.\nNous serions heureux de vous y voir."],
    ["Une ligne", "Le 12 juin 2027, on se dit oui. Et on aimerait que vous soyez là."],
    ["Sobre", "Claire et Mathieu\nvous invitent à leur mariage\nle 12 juin 2027 au Mas des Oliviers."],
    ["Chaleureux", "Après de belles années à deux, nous nous marions.\nRejoignez-nous le 12 juin 2027 pour fêter ça !\nClaire & Mathieu"],
    ["Petit format", "Oui !\nClaire & Mathieu\n12.06.2027\nMas des Oliviers"],
  ] },
  { id: "modernes", h2: "Textes modernes", answer: "Un texte moderne parle à la première personne, tutoie parfois et raconte un peu le couple. Il garde pourtant les informations utiles et une invitation claire. C’est le registre le plus courant pour un faire-part envoyé par lien, entre amis et en famille proche.", items: [
    ["Première personne", "On a décidé de se marier, et on ne se voit pas le faire sans vous.\nRendez-vous le samedi 12 juin 2027 au Mas des Oliviers,\npour la cérémonie, un long dîner et une soirée à danser.\nClaire & Mathieu"],
    ["Le récit", "Une rencontre à un concert, dix ans de voyages, un chat et un appartement trop petit.\nProchaine étape : le mariage !\nSamedi 12 juin 2027, Saint-Rémy-de-Provence."],
    ["Direct", "Bloquez votre week-end du 12 juin 2027 :\nClaire & Mathieu se marient au Mas des Oliviers.\nTout le programme est juste en dessous."],
    ["Complice", "Vous étiez là pour les débuts. Soyez là pour la suite.\nClaire & Mathieu, 12 juin 2027."],
    ["Week-end", "Trois jours, deux familles, une fête.\nClaire & Mathieu vous attendent du 11 au 13 juin 2027\nau Mas des Oliviers pour célébrer leur mariage."],
  ] },
  { id: "originaux", h2: "Textes originaux et avec humour", answer: "L’humour fonctionne quand il vous ressemble et qu’il ne cache pas l’essentiel : la date, le lieu et la demande de réponse doivent rester évidents. Testez votre texte sur un proche avant l’envoi, et gardez une version plus classique pour les invités qui vous connaissent moins.", items: [
    ["Communiqué officiel", "Communiqué officiel : après de longues négociations,\nClaire et Mathieu ont signé un accord à vie.\nLa cérémonie de signature aura lieu le 12 juin 2027.\nPrésence fortement recommandée, buffet garanti."],
    ["Recette", "Prenez deux personnes qui s’aiment, ajoutez cent invités,\nune piste de danse et un bon dîner.\nLaissez mijoter toute la nuit du 12 juin 2027.\nRecette de Claire & Mathieu, au Mas des Oliviers."],
    ["Spoiler", "Attention, spoiler : à la fin, ils se marient.\nClaire & Mathieu, samedi 12 juin 2027.\nPop-corn non fourni, champagne oui."],
    ["Météo", "Bulletin météo du 12 juin 2027 :\n100 % de chances de bonheur sur le Mas des Oliviers,\nfortes averses de confettis en fin de journée.\nClaire & Mathieu"],
    ["Mise à jour", "Mise à jour disponible : Claire & Mathieu v2.0, désormais mariés.\nInstallation prévue le 12 juin 2027 à 15 h.\nRedémarrage de la fête jusqu’à l’aube."],
  ] },
  { id: "civil", h2: "Textes pour un mariage civil", answer: "Pour un mariage civil seul, indiquez la mairie et l’heure, puis le lieu de la fête. Le mariage se célèbre dans une commune où l’un des futurs époux, son père ou sa mère a son domicile ou sa résidence (depuis au moins un mois) : vérifiez l’adresse exacte et l’horaire auprès de la mairie avant d’envoyer.", items: [
    ["Mairie puis fête", "Claire & Mathieu\nse diront oui le samedi 12 juin 2027 à 14 h 30\nen la mairie de Saint-Rémy-de-Provence,\npuis vous attendent au Mas des Oliviers pour la fête."],
    ["Mairie seule, intime", "Claire & Mathieu se marient à la mairie du 11ᵉ arrondissement\nle vendredi 11 juin 2027 à 11 h,\nsuivi d’un déjeuner en petit comité. Votre présence nous ferait très plaisir."],
    ["Cérémonie laïque ensuite", "Claire & Mathieu\nvous invitent à leur mariage civil le samedi 12 juin 2027 à 14 h,\nen la mairie de Saint-Rémy-de-Provence,\nsuivi d’une cérémonie laïque au Mas des Oliviers à 16 h 30."],
    ["Deux jours", "Mariage civil le vendredi 11 juin 2027 à 16 h en la mairie de Saint-Rémy,\ngrande fête le samedi 12 juin au Mas des Oliviers.\nClaire & Mathieu seraient heureux de vous voir aux deux."],
    ["Formel", "Claire Dumas et Mathieu Perrin\nont le plaisir de vous faire part de leur mariage\nqui sera célébré le samedi douze juin deux mille vingt-sept à quatorze heures trente\nen la mairie de Saint-Rémy-de-Provence."],
  ] },
  { id: "religieux", h2: "Textes pour un mariage religieux", answer: "Pour une cérémonie religieuse, on mentionne en général « la bénédiction nuptiale » ou « la cérémonie religieuse », le nom de l’édifice et l’heure, souvent après la cérémonie civile. Le ton est plus formel ; une citation biblique ou spirituelle peut ouvrir le texte.", items: [
    ["Église", "Claire & Mathieu\nont la joie de vous annoncer leur mariage\net vous invitent à la bénédiction nuptiale\nle samedi 12 juin 2027 à 16 h en l’église Saint-Martin de Saint-Rémy-de-Provence."],
    ["Avec citation", "« L’amour est patient, l’amour rend service. »\nPremière épître aux Corinthiens\n\nClaire & Mathieu se marieront le samedi 12 juin 2027 à 16 h\nen l’église Saint-Martin de Saint-Rémy-de-Provence."],
    ["Civil et religieux", "Mariage civil le samedi 12 juin 2027 à 14 h en la mairie de Saint-Rémy,\ncérémonie religieuse à 16 h en l’église Saint-Martin,\nréception au Mas des Oliviers.\nClaire & Mathieu"],
    ["Temple", "Claire & Mathieu\nvous invitent au culte de bénédiction de leur mariage\nle samedi 12 juin 2027 à 15 h au temple de Saint-Rémy-de-Provence."],
    ["Formel, avec réception", "Claire & Mathieu\nvous prient de leur faire l’honneur d’assister à la cérémonie religieuse de leur mariage\nle samedi douze juin deux mille vingt-sept à seize heures\nen l’église Saint-Martin, puis à la réception au Mas des Oliviers."],
  ] },
  { id: "parents", h2: "Textes annoncés par les parents ou une famille recomposée", answer: "Traditionnellement, les parents annoncent le mariage de leurs enfants, chaque famille sur un côté du faire-part. Aujourd’hui, on les cite souvent ensemble, ou avec les mariés. Dans une famille recomposée, nommez chaque parent séparément, avec son conjoint s’il le souhaite, dans l’ordre qui vous paraît le plus juste.", items: [
    ["Les deux familles", "Monsieur et Madame Jacques Dumas\nMonsieur et Madame Henri Perrin\nsont heureux de vous faire part du mariage de leurs enfants\nClaire & Mathieu\nle samedi 12 juin 2027 à 15 h en la mairie de Saint-Rémy-de-Provence."],
    ["Parents et mariés", "Anne et Jacques Dumas, Sylvie et Henri Perrin,\nainsi que Claire & Mathieu,\nont la joie de vous inviter au mariage\nqui sera célébré le samedi 12 juin 2027 au Mas des Oliviers."],
    ["Famille recomposée", "Madame Anne Dumas,\nMonsieur Jacques Dumas et Madame Inès Roche,\nMonsieur et Madame Henri Perrin\nont la joie de vous annoncer le mariage de Claire & Mathieu\nle samedi 12 juin 2027."],
    ["Parent seul", "Madame Sylvie Perrin\nest heureuse de vous faire part du mariage de son fils Mathieu avec Claire Dumas\nle samedi 12 juin 2027 à 15 h au Mas des Oliviers."],
    ["Avec les grands-parents", "Madame Louise Dumas, Monsieur et Madame Paul Perrin,\nMonsieur et Madame Jacques Dumas, Monsieur et Madame Henri Perrin\nsont heureux de vous faire part du mariage de leurs petits-enfants et enfants\nClaire & Mathieu, le samedi 12 juin 2027."],
  ] },
  { id: "situations", h2: "Sans enfants, cagnotte, petit comité, bilingue : les situations particulières", answer: "Pour un sujet délicat (pas d’enfants, cagnotte, invitation au vin d’honneur seulement), formulez-le positivement, dans une phrase à part et sans vous justifier longuement. Sur un faire-part digital, ces précisions trouvent souvent mieux leur place dans la section dédiée (infos pratiques, liste de mariage) que dans le texte principal.", items: [
    ["Mariage sans enfants", "Nous avons choisi de célébrer ce jour entre adultes :\nnous vous remercions de votre compréhension\net vous souhaitons une belle soirée en amoureux !"],
    ["Cagnotte", "Votre présence est notre plus beau cadeau.\nSi vous souhaitez nous faire plaisir, une cagnotte pour notre voyage de noces\nest disponible juste en dessous."],
    ["Petit comité", "Nous nous marions en tout petit comité,\nentourés des personnes qui comptent le plus.\nVous en faites partie : samedi 12 juin 2027, au Mas des Oliviers."],
    ["Vin d’honneur seulement", "Claire & Mathieu\nseraient heureux de vous retrouver pour le vin d’honneur de leur mariage\nle samedi 12 juin 2027 à 17 h au Mas des Oliviers."],
    ["Bilingue", "Claire & Mathieu se marient !\nClaire & Mathieu are getting married!\nSamedi 12 juin 2027 / Saturday, June 12th, 2027\nMas des Oliviers, Saint-Rémy-de-Provence, France"],
  ] },
];

const FAQ: [string, string][] = [
  ["Faut-il écrire la date en toutes lettres ?", "Sur un faire-part formel, oui : « le samedi douze juin deux mille vingt-sept ». Sur un faire-part moderne ou digital, les chiffres sont tout à fait acceptés et plus lisibles sur un téléphone. Gardez le jour de la semaine, il évite les erreurs."],
  ["Quelle est la différence entre faire-part et carton d’invitation ?", "Traditionnellement, le faire-part annonce le mariage à un large cercle, et un carton d’invitation séparé convie à la réception. Sur un faire-part digital, tout tient sur la même page : on adapte simplement le texte et le programme."],
  ["Où mettre la date limite de réponse ?", "À la fin du texte ou, mieux, juste à côté du bouton de réponse. Sur Maison Meli, la date limite que vous choisissez s’affiche automatiquement au moment où l’invité répond."],
  ["Peut-on vouvoyer certains invités et tutoyer les autres ?", "Sur un même faire-part, choisissez un seul registre. Le vouvoiement collectif (« vous ») convient à tout le monde, y compris aux proches : il s’adresse au groupe autant qu’à la personne."],
];

export default function Page() {
  return (
    <GuideLayout guide={G}
      intro={<p>Un texte de faire-part de mariage annonce qui se marie et invite à la fête : prénoms, date, heure, lieu, puis la demande de réponse. Voici 40 exemples à copier, classés par ton et par situation, et les règles pour écrire le vôtre sans faux pas.</p>}
      toc={[["que-mettre", "Que mettre dans un texte de faire-part ?"], ["qui-annonce", "Qui annonce le mariage ?"], ...CATS.map((c) => [c.id, c.h2] as [string, string]), ["erreurs", "Les erreurs à éviter"], ["questions", "Questions fréquentes"]]}
      sources={[
        ["Mariages.net — Faire-part de mariage : les règles et idées pour le personnaliser", "https://www.mariages.net/articles/faire-part-mariage-personnalite--c10580"],
        ["Bridebook — Papeterie et formulations de mariage", "https://bridebook.com/fr/advice/wedding-stationery-wording"],
        ["Service-public.fr — Mariage civil : lieu de célébration", "https://www.service-public.gouv.fr/particuliers/vosdroits/F930"],
      ]}>
      <h2 id="que-mettre">Que mettre dans un texte de faire-part de mariage ?</h2>
      <Answer><p>Un faire-part de mariage contient au minimum : les prénoms des mariés (et les noms de ceux qui annoncent), le jour, la date et l’heure, le lieu de la cérémonie, le lieu de la réception et une date limite de réponse. Le reste (programme, dress code, hébergement, liste de mariage) peut aller à part.</p></Answer>
      <p>Sur un faire-part digital, cette séparation est naturelle : le texte principal reste court, et les sections « Programme », « Dress code », « Hébergement » ou « Liste de mariage » se rangent juste en dessous. Vos invités trouvent tout au même endroit, sans carton supplémentaire.</p>
      <h2 id="qui-annonce">Qui annonce le mariage : les parents ou les mariés ?</h2>
      <Answer><p>Les deux se font. La tradition veut que les parents annoncent le mariage de leurs enfants ; c’est encore courant pour les mariages religieux ou très familiaux. Aujourd’hui, la plupart des couples s’annoncent eux-mêmes, parfois avec leurs parents. Choisissez la formule qui correspond à qui organise et reçoit.</p></Answer>
      <Table caption="Les formules selon le ton" head={["Ton", "Formule", "Pour qui"]} rows={[
        ["Très formel", "« ont l’honneur de vous faire part », « vous prient de leur faire l’honneur »", "Mariage religieux, familles attachées à l’étiquette"],
        ["Classique", "« ont la joie de vous inviter », « sont heureux de vous annoncer »", "Presque tous les mariages"],
        ["Moderne", "« se marient ! », « on se dit oui »", "Amis, famille proche, faire-part digital"],
      ]} />
      {CATS.map((c, ci) => (
        <section key={c.id} aria-labelledby={c.id}>
          <h2 id={c.id}>{c.h2}</h2>
          <Answer><p>{c.answer}</p></Answer>
          {c.items.map(([t, txt], i) => <CopyText key={t} label={ci * 5 + i + 1 + ". " + t}>{txt}</CopyText>)}
          {ci === 2 && <Cta title="Ce texte, directement dans votre faire-part" text="Copiez le texte qui vous plaît, collez-le dans l’éditeur : l’aperçu se met à jour en direct. Gratuit." />}
        </section>
      ))}
      <h2 id="erreurs">Les erreurs à éviter</h2>
      <ul>
        <li><strong>Oublier le jour de la semaine</strong> : « samedi 12 juin » évite les confusions de date.</li>
        <li><strong>Une date limite trop tardive</strong> : votre traiteur demandera le nombre de couverts plusieurs semaines avant. Voir notre guide <a href={GUIDES.reponses.path}>organiser les réponses de ses invités</a>.</li>
        <li><strong>Mélanger tutoiement et vouvoiement</strong> dans le même texte.</li>
        <li><strong>Tout mettre dans le texte principal</strong> : hébergement, parking et liste de mariage ont leurs propres sections.</li>
        <li><strong>Ne pas faire relire</strong> : une faute dans le prénom d’un parent se voit plus qu’on ne croit.</li>
      </ul>
      <p>Encore en panne d’inspiration ? Le <a href={PAGES.generateur.path}>générateur de texte de faire-part</a> compose un texte selon le ton et la cérémonie, et les pages d’<a href={PAGES.ambiances.path}>ambiance</a> proposent des textes assortis à chaque style.</p>
      <Faq items={FAQ} />
      <Cta />
    </GuideLayout>
  );
}

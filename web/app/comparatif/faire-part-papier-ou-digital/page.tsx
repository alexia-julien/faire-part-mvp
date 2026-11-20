import type { Metadata } from "next";
import { Answer, Cta, Faq, Table } from "@/components/site/chrome";
import { GuideLayout } from "@/components/site/guide-layout";
import { GUIDES } from "@/lib/guides";
import { PAGES, meta } from "@/lib/site";

const G = GUIDES.papier;
export const metadata: Metadata = meta(G, { type: "article", published: G.published, robots: G.index ? undefined : { index: false, follow: true } });

const FAQ: [string, string][] = [
  ["Peut-on combiner faire-part papier et digital ?", "Oui, c’est même une bonne solution : un faire-part digital pour la majorité des invités, et quelques exemplaires papier pour les proches qui y tiennent, avec le QR code du faire-part digital pour répondre en ligne."],
  ["Le papier est-il plus élégant que le digital ?", "Un beau papier reste un très bel objet. Mais l’élégance tient d’abord au soin : un faire-part digital avec une vraie typographie, une enveloppe et une dorure peut faire autant d’effet qu’un carton, et il ajoute la réponse en un geste."],
  ["Combien de temps prévoir pour un faire-part papier ?", "Comptez le temps de création, la validation d’un échantillon si vous en commandez un, l’impression, la livraison, la mise sous pli, puis le courrier (trois jours ouvrés en Lettre verte). Mariages.net conseille de recevoir ses faire-part au moins six mois avant le mariage."],
];

export default function Page() {
  return (
    <GuideLayout guide={G}
      intro={<p>Le faire-part papier est un bel objet souvenir, mais il coûte plus cher et demande plus de temps ; le faire-part digital arrive le jour même, se modifie et recueille les réponses. Le bon choix dépend de vos invités et de votre budget. Voici le comparatif point par point, limites du digital comprises.</p>}
      toc={[["tableau", "Le comparatif en un tableau"], ["prix", "Lequel coûte le moins cher ?"], ["delais", "Lequel est le plus rapide ?"], ["reponses", "Lequel facilite les réponses ?"], ["emotion", "Lequel fait le plus d’effet ?"], ["ecologie", "Lequel est le plus écologique ?"], ["choisir", "Alors, papier ou digital ?"], ["questions", "Questions fréquentes"]]}
      sources={[
        ["Mariages.net — Prix moyen d’un faire-part de mariage (rapport 2025)", "https://www.mariages.net/articles/modeles-faire-part-en-ligne-mariages-net--c9921"],
        ["Mariages.net — Faire-part de mariage : quand le commander", "https://www.mariages.net/articles/faire-part-mariage-personnalite--c10580"],
        ["Mariages.net — Faire-part de mariage numérique", "https://www.mariages.net/articles/faire-part-mariage-numerique--c11765"],
        ["La Poste — Tarifs Lettre verte 2026", "https://www.laposte.fr/tarif-lettre-verte"],
        ["La Poste (communiqué) — Tarifs au 1er janvier 2027", "https://www.caissedesdepots.fr/sites/ms-cdc-fr/files/2026-07/CP_La_Poste_tarifs_au_010127.pdf"],
      ]}>
      <h2 id="tableau">Le comparatif en un tableau</h2>
      <Table caption="Relevé du 20 novembre 2026" head={["Critère", "Faire-part papier", "Faire-part digital"]} rows={[
        ["Prix pour 100 invités", "425 € en moyenne avec la papeterie (Mariages.net), plus les timbres", "De 0 € à quelques dizaines d’euros selon l’outil"],
        ["Délai", "Création, impression, livraison, mise sous pli, courrier", "Le jour même"],
        ["Réponses des invités", "Carton-réponse, téléphone ou e-mail, à compiler", "Souvent intégrées, avec un tableau de suivi"],
        ["Modifications", "Impossible après impression", "Possible à tout moment, même lien"],
        ["Objet souvenir", "Oui, c’est son grand atout", "Non (une capture ou un QR code au mieux)"],
        ["Invités âgés ou peu connectés", "Idéal", "Possible, avec un peu d’accompagnement"],
        ["Invités à l’étranger", "Affranchissement international et délais", "Aucune différence"],
      ]} />

      <h2 id="prix">Lequel coûte le moins cher ?</h2>
      <Answer><p>Le digital, presque toujours. Selon Mariages.net, les couples dépensent en moyenne 425 € pour 100 invitations et le reste de leur papeterie. Il faut y ajouter les timbres : 1,52 € la Lettre verte de 20 g en 2026, 1,67 € à partir du 1er janvier 2027. Beaucoup de faire-part digitaux sont gratuits.</p></Answer>
      <p>Pour 100 envois en 2027, les timbres seuls représentent donc au moins 167 € (100 × 1,67 €), et davantage si l’enveloppe dépasse 20 g. Le prix du papier varie énormément selon le format, le grammage et les finitions (dorure, découpe, calque).</p>

      <h2 id="delais">Lequel est le plus rapide ?</h2>
      <p>Le digital part dès qu’il est prêt. Le papier demande plusieurs semaines entre la création, l’éventuel échantillon, l’impression, la livraison et la mise sous pli, puis trois jours ouvrés de courrier en Lettre verte. Mariages.net recommande d’ailleurs de recevoir ses faire-part papier au moins six mois avant le mariage.</p>

      <h2 id="reponses">Lequel facilite les réponses des invités ?</h2>
      <Answer><p>Le digital avec réponse intégrée. Avec le papier, il faut un carton-réponse affranchi, ou demander aux invités d’appeler ou d’écrire, puis tout reporter dans un tableau. Avec un faire-part digital comme Maison Meli, l’invité répond sur le faire-part et les totaux se calculent seuls.</p></Answer>
      <p>Voir <a href={PAGES.rsvp.path}>comment fonctionne le RSVP en ligne</a> et notre guide pour <a href={GUIDES.reponses.path}>organiser les réponses de ses invités</a>.</p>

      <Cta title="Testez le digital en trois minutes" text="Créez votre faire-part et ouvrez-le sur votre téléphone : vous saurez tout de suite si c’est pour vous. Gratuit." />

      <h2 id="emotion">Lequel fait le plus d’effet ?</h2>
      <p>Soyons honnêtes : rien ne remplace le plaisir de tenir un beau papier épais, de le sortir d’une enveloppe et de le garder des années. C’est l’argument numéro un du papier, et il est valable. Le digital mise sur une autre émotion : l’enveloppe qui s’ouvre sur l’écran, le cachet qui se fend, la carte qui glisse, puis la réponse en un geste. Un faire-part digital banal fait peu d’effet ; un faire-part digital soigné peut surprendre autant qu’un carton.</p>

      <h2 id="ecologie">Lequel est le plus écologique ?</h2>
      <p>Le digital évite la fabrication du papier, l’impression, les enveloppes et l’acheminement du courrier. Il n’est pas sans impact (serveurs, appareils), mais pour un envoi ponctuel il supprime les principaux postes du papier. Si vous choisissez le papier, privilégiez un papier recyclé ou certifié, un imprimeur proche et un format standard.</p>

      <h2 id="choisir">Alors, papier ou digital ?</h2>
      <ul>
        <li><strong>Choisissez le papier</strong> si l’objet souvenir compte avant tout, si vos invités sont majoritairement âgés ou si votre famille y est très attachée.</li>
        <li><strong>Choisissez le digital</strong> si vous voulez gagner du temps et de l’argent, recevoir les réponses facilement, modifier le programme, ou si vos invités sont dispersés.</li>
        <li><strong>Combinez les deux</strong> : digital pour la plupart, quelques papiers pour les proches qui y tiennent, avec le QR code du faire-part digital pour répondre.</li>
      </ul>
      <p>Ce que Maison Meli ne fait pas : imprimer des faire-part papier, ni créer un site de mariage complet avec plusieurs pages. Si c’est ce que vous cherchez, un papetier ou une plateforme de site de mariage conviendra mieux. Pour tout savoir sur le format, lisez <a href={GUIDES.digital.path}>le guide complet du faire-part digital</a>.</p>
      <Faq items={FAQ} />
      <Cta />
    </GuideLayout>
  );
}

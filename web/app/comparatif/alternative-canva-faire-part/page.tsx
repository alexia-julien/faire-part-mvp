import type { Metadata } from "next";
import { Answer, Cta, Faq, Table } from "@/components/site/chrome";
import { GuideLayout } from "@/components/site/guide-layout";
import { GUIDES } from "@/lib/guides";
import { PAGES, meta } from "@/lib/site";

const G = GUIDES.canva;
export const metadata: Metadata = meta(G, { type: "article", published: G.published, robots: G.index ? undefined : { index: false, follow: true } });

const FAQ: [string, string][] = [
  ["Peut-on importer un design Canva dans Maison Meli ?", "Non. Maison Meli fonctionne avec ses propres ambiances, dessinées pour l’écran et l’ouverture d’enveloppe. Vous pouvez en revanche ajouter jusqu’à trois photos, dont une illustration créée sur Canva."],
  ["Canva est-il gratuit pour un faire-part de mariage ?", "Canva propose une version gratuite avec de nombreux modèles de faire-part. Certains modèles et éléments sont réservés à l’abonnement Pro, et l’impression via Canva est payante."],
  ["Canva permet-il de recevoir les réponses des invités ?", "Pas directement dans un faire-part image ou PDF. Il faut passer par un site de mariage Canva avec un formulaire, ou par une application tierce disponible dans Canva (Jotform, Easy RSVP…)."],
];

export default function Page() {
  return (
    <GuideLayout guide={G}
      intro={<p>Canva est excellent pour dessiner un faire-part, surtout s’il doit être imprimé. Pour un faire-part envoyé par lien, il lui manque l’essentiel d’un mariage : la réponse des invités et son suivi. Un outil spécialisé comme Maison Meli réunit l’invitation et les réponses sur une seule page. Voici comment choisir.</p>}
      toc={[["canva-fort", "Ce que Canva fait très bien"], ["canva-manque", "Ce qui manque à Canva pour un mariage"], ["tableau", "Canva ou Maison Meli : le tableau"], ["choisir", "Quand choisir l’un ou l’autre ?"], ["questions", "Questions fréquentes"]]}
      sources={[
        ["Canva — Modèles de faire-part de mariage", "https://www.canva.com/fr_fr/faire-part-de-mariage/"],
        ["Canva — Créateur de site de mariage", "https://www.canva.com/fr_fr/creer/site-mariage/"],
        ["Canva Apps — Easy RSVP", "https://www.canva.com/fr_ca/apps/AAGN0i9muPI/easy-rsvp"],
        ["Jotform — Formulaires pour site de mariage Canva", "https://www.jotform.com/fr/canva-forms/use-cases/wedding-website/"],
        ["Mariages.net — Faire-part de mariage numérique", "https://www.mariages.net/articles/faire-part-mariage-numerique--c11765"],
      ]}>
      <h2 id="canva-fort">Ce que Canva fait très bien</h2>
      <Answer><p>Canva offre une immense bibliothèque de modèles de faire-part, une liberté de mise en page totale et une version gratuite. Il propose aussi l’impression et un créateur de site de mariage. Pour un faire-part papier, ou si vous voulez dessiner chaque détail vous-même, c’est un excellent outil.</p></Answer>
      <p>Si vous maîtrisez déjà Canva, vous pouvez créer en une soirée un visuel qui vous ressemble, l’exporter en image ou en PDF et l’envoyer. Les guides mariage le recommandent d’ailleurs souvent comme solution par défaut.</p>

      <h2 id="canva-manque">Ce qui manque à Canva pour un faire-part de mariage</h2>
      <ul>
        <li><strong>Les réponses des invités.</strong> Une image ou un PDF ne permet pas de répondre. Il faut ajouter un formulaire séparé ou une application tierce, donc un deuxième lien.</li>
        <li><strong>Le suivi.</strong> Totaux, accompagnants, enfants, régimes alimentaires : à compiler vous-même, ou dans l’outil tiers.</li>
        <li><strong>Les mises à jour.</strong> Une image envoyée ne change plus : si l’horaire bouge, il faut renvoyer une nouvelle version à tout le monde.</li>
        <li><strong>L’expérience sur téléphone.</strong> Un visuel pensé pour le papier se lit mal sur un petit écran (texte petit, zoom nécessaire) et n’a ni bouton de plan, ni ajout à l’agenda.</li>
      </ul>

      <Cta title="Le faire-part et les réponses, sur un seul lien" text="Neuf ambiances prêtes, l’enveloppe animée, le RSVP et le tableau de suivi. Gratuit." />

      <h2 id="tableau">Canva ou Maison Meli : le tableau</h2>
      <Table caption="Relevé du 20 novembre 2026, d’après les pages publiques de Canva" head={["Critère", "Canva", "Maison Meli"]} rows={[
        ["Liberté de design", "Totale, des milliers de modèles", "9 ambiances, palettes, polices et ornements ajustables"],
        ["Faire-part papier", "Oui, impression payante", "Non, 100 % digital"],
        ["Réponse des invités", "Via un site de mariage ou une application tierce", "Intégrée au faire-part"],
        ["Suivi des réponses", "Selon l’outil tiers", "Tableau, régimes regroupés, export CSV"],
        ["Ouverture d’enveloppe animée", "Non", "Oui, cachet de cire aux initiales"],
        ["Modification après l’envoi", "Renvoyer le visuel", "Même lien, mis à jour"],
        ["Prix", "Version gratuite, options Pro payantes", "Gratuit"],
      ]} />

      <h2 id="choisir">Quand choisir Canva, quand choisir Maison Meli ?</h2>
      <ul>
        <li><strong>Choisissez Canva</strong> si vous voulez un faire-part papier, une liberté graphique totale, ou un site de mariage de plusieurs pages.</li>
        <li><strong>Choisissez Maison Meli</strong> si vous envoyez votre faire-part par lien et voulez recevoir et suivre les réponses au même endroit, avec un rendu de papeterie sans passer des heures sur la mise en page.</li>
      </ul>
      <p>Les deux ne s’excluent pas : rien ne vous empêche de dessiner une illustration sur Canva et de l’ajouter en photo dans votre faire-part Maison Meli. Pour comparer avec le papier, lisez <a href={GUIDES.papier.path}>faire-part papier ou digital</a> ; pour voir le rendu, ouvrez <a href={PAGES.exemple.path}>l’exemple de Camille et Thomas</a>.</p>
      <Faq items={FAQ} />
      <Cta />
    </GuideLayout>
  );
}

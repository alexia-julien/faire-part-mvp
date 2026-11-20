import type { Metadata } from "next";
import { DocPage } from "@/components/site/doc-page";
import { PAGES, fmtDate, meta } from "@/lib/site";

export const metadata: Metadata = meta(PAGES.mentions);

// Texte du brief SEO/GEO (section 5). À COMPLÉTER par Julien avant que la page soit conforme (LCEN, art. 6-III) :
// statut (« entrepreneur individuel (EI) » + SIREN/RNE si immatriculé), téléphone, et adresse (non publiée en
// attendant sa décision : domicile personnel, voir le risque « adresse personnelle publiée » du brief).
export default function Page() {
  return (
    <DocPage trail={[PAGES.mentions]}>
      <h1>Mentions légales</h1>
      <p>Dernière mise à jour : {fmtDate(PAGES.mentions.updated)}.</p>
      <h2>Éditeur du site</h2>
      <p>Le site maison-meli.com est édité par Julien Meli.<br />E-mail : <a href="mailto:julien.meli.jm@gmail.com">julien.meli.jm@gmail.com</a></p>
      <h2>Directeur de la publication</h2>
      <p>Julien Meli</p>
      <h2>Hébergement</h2>
      <p>GitHub Pages, service de GitHub, Inc.<br />88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis<br />Téléphone : +1 877 448 4820</p>
      <h2>Propriété intellectuelle</h2>
      <p>Le site, ses ambiances, illustrations, textes et éléments graphiques sont la propriété de Julien Meli. Toute reproduction sans autorisation écrite est interdite. Les textes et photos ajoutés par les utilisateurs dans leur faire-part restent leur propriété.</p>
      <h2>Données personnelles</h2>
      <p>Le traitement des données (comptes, faire-part, réponses des invités) est décrit dans la page <a href={PAGES.confidentialite.path}>Confidentialité</a>.</p>
      <h2>Contact</h2>
      <p><a href="mailto:julien.meli.jm@gmail.com">julien.meli.jm@gmail.com</a></p>
    </DocPage>
  );
}

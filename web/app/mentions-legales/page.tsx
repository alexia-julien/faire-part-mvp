import type { Metadata } from "next";
import { DocPage } from "@/components/site/doc-page";
import { PAGES, fmtDate, meta } from "@/lib/site";

export const metadata: Metadata = meta(PAGES.mentions);

// Texte du brief SEO/GEO (section 5). Statut : micro-entreprise (entrepreneur individuel, mention « EI » obligatoire).
// Adresse publiée le 21/11/2026 (obligatoire pour une micro-entreprise). Reste à ajouter : le numéro SIREN.
export default function Page() {
  return (
    <DocPage trail={[PAGES.mentions]}>
      <h1>Mentions légales</h1>
      <p>Dernière mise à jour : {fmtDate(PAGES.mentions.updated)}.</p>
      <h2>Éditeur du site</h2>
      <p>Le site maison-meli.com est édité par Julien Meli EI, entrepreneur individuel (micro-entreprise).<br />Adresse : 16 rue de Cotte, 75012 Paris<br />E-mail : <a href="mailto:contact@maison-meli.com">contact@maison-meli.com</a><br />Téléphone : <a href="tel:+33688964968">06 88 96 49 68</a></p>
      <h2>Directeur de la publication</h2>
      <p>Julien Meli</p>
      <h2>Hébergement</h2>
      <p>Cloudflare, Inc.<br />101 Townsend St, San Francisco, CA 94107, États-Unis<br />Téléphone : +1 650 319 8930</p>
      <h2>Propriété intellectuelle</h2>
      <p>Le site, ses ambiances, illustrations, textes et éléments graphiques sont la propriété de Julien Meli. Toute reproduction sans autorisation écrite est interdite. Les textes et photos ajoutés par les utilisateurs dans leur faire-part restent leur propriété.</p>
      <h2>Données personnelles</h2>
      <p>Le traitement des données (comptes, faire-part, réponses des invités) est décrit dans la page <a href={PAGES.confidentialite.path}>Confidentialité</a>.</p>
      <h2>Contact</h2>
      <p><a href="mailto:contact@maison-meli.com">contact@maison-meli.com</a></p>
    </DocPage>
  );
}

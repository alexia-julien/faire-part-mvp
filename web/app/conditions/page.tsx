import type { Metadata } from "next";
import { DocPage } from "@/components/site/doc-page";
import { SITE } from "@/lib/config";

export const metadata: Metadata = {
  title: "Conditions d’utilisation",
  description: "Les règles d’utilisation de Maison Meli, créateur gratuit de faire-part de mariage digital.",
  alternates: { canonical: SITE + "/conditions.html" },
};

export default function Page() {
  return (
    <DocPage>
      <h1>Conditions d’utilisation</h1>
      <p>Maison Meli permet de créer un faire-part de mariage en ligne, de le partager par un lien et de recevoir les réponses des invités. Dernière mise à jour : 19 novembre 2026.</p>
      <h2>Le service</h2>
      <ul>
        <li>Le service est gratuit. Il est fourni tel quel, sans garantie de disponibilité permanente.</li>
        <li>Un compte (adresse email ou compte Google) est nécessaire pour publier un faire-part. Un compte peut avoir un faire-part à la fois.</li>
        <li>Les invités n’ont pas besoin de compte pour consulter le faire-part et y répondre.</li>
      </ul>
      <h2>Votre contenu</h2>
      <ul>
        <li>Vous restez propriétaire des textes et photos que vous publiez, et vous devez avoir le droit de les utiliser.</li>
        <li>Le faire-part est visible par toute personne qui possède son lien : ne partagez le lien qu’avec les personnes concernées.</li>
        <li>Sont interdits les contenus illicites, haineux, trompeurs, ou portant atteinte aux droits d’autrui, ainsi que l’usage du service pour envoyer du spam ou collecter des données à l’insu des personnes.</li>
        <li>Un faire-part ou un compte qui ne respecte pas ces règles peut être supprimé.</li>
      </ul>
      <h2>Les réponses de vos invités</h2>
      <p>Vous choisissez les questions posées à vos invités et vous êtes seul à voir leurs réponses. Utilisez ces informations uniquement pour l’organisation de votre mariage, et supprimez-les quand vous n’en avez plus besoin.</p>
      <h2>Suppression</h2>
      <p>Vous pouvez supprimer à tout moment votre faire-part, ses réponses et votre compte depuis la page <a href="admin.html">Mon faire-part</a>. La suppression est immédiate et définitive.</p>
      <h2>Données personnelles</h2>
      <p>Ce que nous enregistrons et pourquoi est décrit dans la page <a href="confidentialite.html">Confidentialité</a>.</p>
      <h2>Évolution</h2>
      <p>Ces conditions peuvent évoluer avec le service. La date de mise à jour figure en haut de cette page.</p>
    </DocPage>
  );
}

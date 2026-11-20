import type { Metadata } from "next";
import { DocPage } from "@/components/site/doc-page";
import { PAGES, meta } from "@/lib/site";

export const metadata: Metadata = meta(PAGES.confidentialite);

export default function Page() {
  return (
    <DocPage trail={[PAGES.confidentialite]}>
      <h1>Confidentialité</h1>
      <p>Cette page décrit, sans jargon, ce que Maison Meli enregistre et pourquoi. Dernière mise à jour : 21 novembre 2026.</p>

      <h2>En bref</h2>
      <ul>
        <li>Pas de publicité, pas de cookie, pas d’outil de mesure d’audience tiers : seulement une mesure interne, sans identifiant (voir plus bas).</li>
        <li>Les réponses de vos invités ne sont visibles que par vous, une fois connecté à votre compte.</li>
        <li>Vous pouvez supprimer votre faire-part, ses réponses et votre compte à tout moment.</li>
      </ul>

      <h2>Si vous créez un faire-part</h2>
      <p>Nous enregistrons ce que vous saisissez pour l’afficher à vos invités : <strong>prénoms, date, lieu, textes, photos et réglages de style</strong>. Toute personne qui possède le lien public peut voir ce contenu ; le lien contient une partie aléatoire et la page n’est pas référencée par les moteurs de recherche.</p>
      <p>Pour publier, vous créez un <strong>compte</strong> : nous enregistrons votre adresse email (et, si vous passez par Google, l’identifiant de votre compte Google ainsi que le nom et la photo de profil que Google nous transmet). Il n’y a pas de mot de passe : la connexion se fait par un code envoyé par email ou par Google. Votre adresse sert à vous connecter et, si vous le laissez activé, à vous envoyer au plus un récapitulatif par jour des nouvelles réponses de vos invités (désactivable dans « Mon faire-part »). Nous ne vous envoyons pas de publicité.</p>
      <p>Si vous demandez à être prévenu(e) du lancement du Pack Premium, nous gardons l’adresse email que vous indiquez pour ce seul message. Écrivez à <a href="mailto:contact@maison-meli.com">contact@maison-meli.com</a> pour la faire supprimer.</p>

      <h2>Si vous répondez à un faire-part</h2>
      <p>Votre réponse (nom, présence, et selon les questions choisies par les mariés : nombre de personnes, régime alimentaire, email, téléphone, adresse, message) est transmise <strong>uniquement aux mariés</strong>, pour l’organisation de leur mariage. Ce sont eux qui décident des questions posées et qui consultent les réponses : pour corriger ou faire supprimer la vôtre, adressez-vous à eux, ils peuvent le faire depuis leur compte.</p>
      <h3>Régimes alimentaires et allergies</h3>
      <p>Une allergie ou un régime lié à la santé peut être une donnée de santé. Cette information est <strong>toujours facultative</strong> : ne l’indiquez que si vous le souhaitez, pour que les mariés préviennent le traiteur. Elle n’est visible que par les mariés, n’est utilisée pour rien d’autre que le repas, et disparaît avec la réponse ou le faire-part quand ils les suppriment. En la renseignant, vous acceptez qu’elle leur soit transmise dans ce seul but.</p>
      <h3>Coordonnées des invités</h3>
      <p>Par défaut, aucune coordonnée n’est demandée aux invités. Les mariés peuvent choisir de demander un email, un téléphone ou une adresse postale (par exemple pour envoyer un faire-part ou des remerciements) ; ces champs sont alors indiqués dans le formulaire et ne servent qu’aux mariés.</p>

      <h2>Ce qui reste dans votre navigateur</h2>
      <p>Maison Meli n’utilise pas de cookies. Votre navigateur garde en mémoire locale : le brouillon en cours, votre session de connexion (pour ne pas vous reconnecter à chaque visite), la réponse que vous avez envoyée à une invitation (pour la retrouver et la corriger), et la catégorie de provenance de votre dernière visite (par exemple « moteur de recherche » ou « faire-part », pendant 30 jours). Rien de tout cela n’est un identifiant. Vider les données du site dans votre navigateur efface ces informations.</p>

      <h2>Données techniques et mesure d’audience</h2>
      <p>Pour limiter les abus (créations ou réponses en masse) et mesurer l’usage du service, nous tenons un journal d’actions associé à une <strong>empreinte irréversible de l’adresse IP</strong>, jamais à l’adresse elle-même.</p>
      <p>Ce journal compte les grandes étapes du parcours : visite de la page d’accueil, début de création, écran de connexion, publication, ouverture d’un faire-part, envoi d’une réponse (avec le temps mis à répondre), partage et clic sur « Créez le vôtre ». Il retient la <strong>catégorie</strong> de provenance (moteur de recherche, assistant IA, réseau social, faire-part…), jamais l’adresse de la page d’où vous venez. Il ne contient ni votre nom, ni votre email, ni le contenu de vos réponses, et n’est jamais croisé avec d’autres sites. Les entrées de plus de 13 mois sont effacées.</p>
      <p>Si votre navigateur envoie le signal « Do Not Track » ou « Global Privacy Control », votre navigateur n’envoie aucun de ces événements.</p>

      <h2>Connexion avec Google</h2>
      <p>Si vous choisissez « Continuer avec Google », Google nous transmet uniquement votre <strong>adresse email</strong>, votre <strong>nom</strong> et votre <strong>photo de profil</strong>, pour créer et retrouver votre compte. Nous n’accédons à aucune autre donnée de votre compte Google, ne les partageons avec personne et ne les utilisons à aucune autre fin. Ces informations sont supprimées avec votre compte.</p>

      <h2>Prestataires techniques</h2>
      <ul>
        <li><strong>Supabase</strong> : base de données et comptes, hébergés dans l’Union européenne (Francfort).</li>
        <li><strong>Un service d’envoi d’emails</strong> : il reçoit votre adresse pour vous transmettre le code de connexion.</li>
        <li><strong>Google</strong>, si vous choisissez « Continuer avec Google » : la connexion passe par ses serveurs.</li>
        <li><strong>Cloudflare</strong> : hébergement et diffusion des pages du site. Comme tout hébergeur, Cloudflare reçoit l’adresse IP des visiteurs.</li>
      </ul>
      <p>Les polices de caractères sont hébergées avec le site : aucun service de polices tiers ne reçoit l’adresse IP des visiteurs. Aucune donnée n’est vendue ni utilisée à des fins publicitaires.</p>

      <h2>Statistiques agrégées</h2>
      <p>Pour améliorer le service et, le cas échéant, publier des études sur le faire-part digital (par exemple le délai moyen de réponse des invités), Maison Meli peut calculer des statistiques <strong>agrégées et anonymes</strong> sur l’ensemble des faire-part : moyennes, proportions, totaux. Aucune statistique publiée ne permet d’identifier un couple, un faire-part ou un invité.</p>

      <h2>Durée de conservation et suppression</h2>
      <p>Un faire-part, ses réponses et le compte associé sont conservés tant que vous ne les supprimez pas. Tout se fait depuis la page <a href="/mon-faire-part/">Mon faire-part</a> : supprimer une réponse, supprimer le faire-part et ses réponses, ou supprimer le compte entier. La suppression est immédiate et définitive.</p>
    </DocPage>
  );
}

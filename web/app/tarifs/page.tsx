import type { Metadata } from "next";
import { Check } from "lucide-react";
import { Answer, ContentPage, Cta, Faq, PROSE } from "@/components/site/chrome";
import { JsonLd, webApplication } from "@/lib/schema";
import { FEATURES } from "@/lib/content";
import { PAGES, fmtDate, meta } from "@/lib/site";

export const metadata: Metadata = meta(PAGES.tarifs);

const FREE = [
  "Créer et personnaliser votre faire-part : 9 ambiances, 12 palettes, 8 typographies, dorures, jusqu’à 3 photos",
  "L’enveloppe animée, le cachet de cire à vos initiales, le compte à rebours et l’ajout à l’agenda",
  "Le lien à partager sur WhatsApp, par SMS ou par e-mail, et le QR code",
  "Les réponses des invités (RSVP), jusqu’à 1 000 par faire-part",
  "Le tableau de suivi, la liste des régimes pour le traiteur et l’export CSV",
  "Les modifications après l’envoi, sans changer de lien",
];

const FAQ: [string, string][] = [
  ["Maison Meli est-il vraiment gratuit ?", "Oui. Aujourd’hui, tout ce que propose Maison Meli est gratuit : création, ambiances, lien, réponses des invités, suivi et export. Aucune carte bancaire n’est demandée, ni à la création ni à la publication."],
  ["Pourquoi est-ce gratuit ?", "Maison Meli est un service jeune, né d’un mariage. La priorité est d’offrir le plus beau faire-part digital possible et de l’améliorer avec les retours des couples. Le site n’affiche pas de publicité et ne revend aucune donnée."],
  ["Y aura-t-il une version payante ?", "Peut-être, sous forme d’options supplémentaires avec un paiement unique par faire-part, pas d’abonnement. Le cœur du service (créer, partager, recevoir et suivre les réponses) restera gratuit. Tout changement sera annoncé sur cette page."],
  ["Mes invités paient-ils quelque chose ?", "Non, jamais. Ouvrir le faire-part et répondre est gratuit, sans compte ni application."],
];

export default function Page() {
  return (
    <ContentPage trail={[PAGES.tarifs]} current={PAGES.tarifs.path}>
      <JsonLd data={webApplication(FEATURES)} />
      <p className="t-label mb-4">Tarifs</p>
      <h1 className="t-display !text-[clamp(38px,5.5vw,60px)]">Ce qui est gratuit, et ce qui le restera</h1>
      <div className={PROSE}>
        <Answer><p>Maison Meli coûte 0 €. Créer votre faire-part de mariage digital, le partager par lien, recevoir les réponses de vos invités et les suivre est gratuit, sans carte bancaire et sans publicité. Si des options payantes arrivent un jour, ce sera un paiement unique par faire-part, et le cœur du service restera gratuit.</p></Answer>
        <h2>Gratuit aujourd’hui</h2>
        <ul className="!list-none !pl-0">
          {FREE.map((f) => <li key={f} className="flex gap-3"><span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-foreground text-background"><Check className="size-3" aria-hidden="true" /></span>{f}</li>)}
        </ul>
        <h2>Ce qui restera gratuit</h2>
        <p>Créer un faire-part, le partager, recevoir les réponses de vos invités et les consulter. Ce sont les fonctions sans lesquelles un faire-part digital n’a pas de sens : elles ne deviendront pas payantes.</p>
        <h2>Ce qui pourrait devenir payant</h2>
        <p>Des options en plus, réservées à ceux qui les veulent : par exemple des ambiances ou des finitions exclusives, plus de photos, ou des fonctions avancées pour les grands mariages. Le principe envisagé est un paiement unique par faire-part, pas un abonnement. Rien de tout cela n’existe aujourd’hui, et cette page sera mise à jour le jour où ça changera.</p>
        <h2>Les limites actuelles</h2>
        <p>Un faire-part par compte, trois photos par faire-part, 1 000 réponses par faire-part. Maison Meli est 100 % digital : il n’imprime pas de faire-part papier et n’envoie pas de messages à votre place.</p>
        <p className="text-[15px] !text-muted-foreground">Page mise à jour le {fmtDate(PAGES.tarifs.updated)}.</p>
        <Faq items={FAQ} title="Questions sur les tarifs" />
        <Cta title="Gratuit, ce soir comme le jour J" />
      </div>
    </ContentPage>
  );
}

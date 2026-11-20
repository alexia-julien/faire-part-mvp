import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumbs, CREATE, Cta, PROSE, SiteFooter } from "@/components/site/chrome";
import { ExampleInvitation } from "./example-invitation";
import { PAGES, meta } from "@/lib/site";

export const metadata: Metadata = meta(PAGES.exemple);

// Page exemple (brief SEO/GEO, section 5) : la preuve que Google, les IA et les visiteurs peuvent voir.
// Les vrais faire-part des clients, eux, ne sont jamais indexables.
export default function Page() {
  return (
    <>
      <div className="fixed inset-x-0 top-3 z-50 flex justify-center px-3">
        <p className="glass flex items-center gap-3 rounded-full py-1.5 pl-4 pr-1.5 text-[13px] shadow-soft">
          <span><strong className="font-medium">Exemple</strong> · les réponses ne sont pas enregistrées</span>
          <Button asChild size="sm" className="h-8"><a href={CREATE} data-create>Créer le mien</a></Button>
        </p>
      </div>
      <main id="root">
        <ExampleInvitation />
      </main>
      <section aria-labelledby="h-example" className="paper-grain border-t border-border bg-background">
        <div className={"mx-auto max-w-[760px] px-5 py-20 sm:px-8 " + PROSE}>
          <Breadcrumbs trail={[PAGES.exemple]} />
          <h1 id="h-example" className="t-display !text-[clamp(36px,5vw,54px)]">Le faire-part de Camille et Thomas (exemple)</h1>
          <p className="!mt-6">Ce faire-part de mariage digital est un exemple complet, créé avec Maison Meli pour un couple fictif. Ouvrez l’enveloppe, faites défiler le programme et répondez comme un invité : tout fonctionne, mais aucune réponse n’est enregistrée.</p>
          <h2>Ce que contient ce faire-part</h2>
          <ul>
            <li>L’ambiance <a href="/ambiances/champetre/">Champêtre</a> : papier lin, couronne de feuillage, cachet de cire sauge aux initiales.</li>
            <li>Le texte d’invitation, la date avec compte à rebours et l’ajout à l’agenda, le lieu avec l’adresse.</li>
            <li>Les sections « Notre histoire », « Programme », « Dress code », « Hébergement » et « Infos pratiques ».</li>
            <li>Une réponse complète : présence, nombre de personnes, accompagnants, enfants, régime alimentaire, brunch, une question personnalisée (la navette) et un mot pour les mariés, avec une date limite.</li>
          </ul>
          <h2>Combien de temps pour faire le même ?</h2>
          <p>Environ trois minutes pour l’essentiel : prénoms, date, lieu et ambiance. Les sections et les questions sont pré-remplies ; comptez quelques minutes de plus pour écrire votre histoire et votre programme. Le faire-part reste modifiable après l’envoi, sans changer de lien.</p>
          <p>Pour en savoir plus : <a href={PAGES.rsvp.path}>comment fonctionnent les réponses des invités</a>, <a href={PAGES.whatsapp.path}>comment envoyer le faire-part sur WhatsApp</a>, et <a href={PAGES.ambiances.path}>les neuf ambiances</a>.</p>
          <div className="!mt-8"><Button asChild size="lg"><a href={CREATE} data-create>Créer mon faire-part <ArrowRight /></a></Button></div>
          <Cta title="À vous de jouer" text="Vos prénoms, votre date, votre lieu : le reste est déjà prêt. Gratuit, sans carte bancaire." />
        </div>
      </section>
      <SiteFooter />
    </>
  );
}

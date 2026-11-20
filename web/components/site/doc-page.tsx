import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

// Pages de texte (confidentialité, conditions, page introuvable) : une colonne de lecture de 640 px.
export function DocPage({ children }: { children: ReactNode }) {
  return (
    <div className="paper-grain min-h-dvh">
      <header className="pointer-events-none fixed inset-x-0 top-3 z-40 px-3">
        <nav aria-label="Navigation principale" className="glass pointer-events-auto mx-auto flex h-14 max-w-[1180px] items-center justify-between rounded-full pl-5 pr-2">
          <a href="./" className="font-serif text-[22px] font-medium" aria-label="Maison Meli, accueil">Maison Meli</a>
          <Button asChild size="sm" className="h-10"><a href="creer.html">Créer mon faire-part</a></Button>
        </nav>
      </header>
      <main className="doc mx-auto max-w-[680px] px-5 pb-28 pt-32 sm:px-8 sm:pt-40
        [&_h1]:t-display [&_h1]:!text-[clamp(40px,6vw,60px)] [&_h1]:mb-6
        [&_h2]:font-serif [&_h2]:text-[28px] [&_h2]:font-medium [&_h2]:leading-tight [&_h2]:mt-14 [&_h2]:mb-4
        [&_p]:text-[17px] [&_p]:leading-[1.7] [&_p]:text-foreground/80 [&_p]:mb-4
        [&_ul]:mb-4 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2.5 [&_ul]:pl-5 [&_ul]:list-disc [&_li]:text-[17px] [&_li]:leading-[1.6] [&_li]:text-foreground/80 [&_li]:marker:text-accent
        [&_strong]:font-medium [&_strong]:text-foreground
        [&_a:not([data-slot])]:underline [&_a:not([data-slot])]:decoration-foreground/25 [&_a:not([data-slot])]:underline-offset-4 hover:[&_a:not([data-slot])]:decoration-foreground">
        {children}
      </main>
      <footer className="mx-auto flex max-w-[680px] flex-wrap gap-x-6 gap-y-2 px-5 pb-12 text-[14px] text-muted-foreground sm:px-8">
        <a href="./" className="hover:text-foreground">Accueil</a>
        <a href="confidentialite.html" className="hover:text-foreground">Confidentialité</a>
        <a href="conditions.html" className="hover:text-foreground">Conditions d’utilisation</a>
      </footer>
    </div>
  );
}

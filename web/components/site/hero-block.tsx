import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CREATE } from "@/components/site/chrome";

// En-tête des pages produit : la réponse à la question de la page dans les deux premières phrases, puis l'appel à l'action.
export function HeroBlock({ label, title, lead, cta = "Créer mon faire-part", href = CREATE, aside }: { label: string; title: ReactNode; lead: ReactNode; cta?: string; href?: string; aside?: ReactNode }) {
  return (
    <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <div>
        <p className="t-label mb-4">{label}</p>
        <h1 className="t-display !text-[clamp(38px,5.5vw,60px)]">{title}</h1>
        <div className="t-lead mt-6 max-w-[58ch]">{lead}</div>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button asChild size="lg"><a href={href} data-create={href === CREATE ? "" : undefined}>{cta} <ArrowRight /></a></Button>
          <span className="text-[14px] text-muted-foreground">Gratuit, sans carte bancaire</span>
        </div>
      </div>
      {aside && <div className="flex justify-center">{aside}</div>}
    </div>
  );
}

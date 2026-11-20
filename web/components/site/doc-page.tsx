import type { ReactNode } from "react";
import { ContentPage, PROSE } from "@/components/site/chrome";
import type { Page } from "@/lib/site";

// Pages de texte (confidentialité, conditions, mentions légales, page introuvable) : une colonne de lecture.
export function DocPage({ children, trail }: { children: ReactNode; trail?: Pick<Page, "path" | "crumb">[] }) {
  return (
    <ContentPage trail={trail}>
      <div className={"doc [&_h1]:t-display [&_h1]:!text-[clamp(40px,6vw,60px)] [&_h1]:mb-6 " + PROSE}>{children}</div>
    </ContentPage>
  );
}

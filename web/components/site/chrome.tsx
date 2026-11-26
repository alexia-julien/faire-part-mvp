// Gabarit commun des pages publiques : navigation, fil d'Ariane (visible + BreadcrumbList), pied de page,
// blocs réutilisables (FAQ en <details>, appel à l'action). Rendu côté serveur : tout est dans le HTML statique.
import type { ReactNode } from "react";
import { ArrowRight, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavAccount } from "@/components/site/landing-islands";
import { BrandMark } from "@/components/site/brand-mark";
import { ReportButton } from "@/components/site/feedback";
import { AMBIANCES } from "@/lib/ambiances";
import { ENTITY, PAGES, type Page } from "@/lib/site";
import { GUIDE_LINKS } from "@/lib/guides";
import { JsonLd, breadcrumb, faqPage } from "@/lib/schema";
import { cn } from "@/lib/utils";

export const CREATE = "/creer/";
const NAV = [PAGES.ambiances, PAGES.exemple, PAGES.guides, PAGES.tarifs];

export function SiteHeader({ current }: { current?: string }) {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-3 z-40 px-3">
      <nav aria-label="Navigation principale" className="glass pointer-events-auto mx-auto flex h-14 max-w-[1180px] items-center justify-between gap-3 rounded-full pl-5 pr-2">
        <a href="/" className="flex items-center gap-2 font-serif text-[22px] font-medium tracking-[-0.01em]" aria-label="Maison Meli, accueil"><BrandMark className="size-8" />Maison Meli</a>
        <div className="flex items-center gap-1 text-[14px]">
          {NAV.map((p) => (
            <a key={p.path} href={p.path} aria-current={current === p.path ? "page" : undefined}
              className="hidden rounded-full px-3 py-2 text-foreground/75 hover:text-foreground aria-[current=page]:text-foreground md:block">{p === PAGES.exemple ? "Exemple" : p.crumb}</a>
          ))}
          <NavAccount />
          <Button asChild size="sm" className="hidden h-10 sm:inline-flex"><a href={CREATE} data-create>Créer mon faire-part</a></Button>
        </div>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  const col = "flex flex-col gap-2.5";
  const link = "hover:text-foreground";
  return (
    <footer className="border-t border-border/70">
      <div className="mx-auto grid max-w-[1180px] gap-10 px-5 py-14 text-[14px] text-muted-foreground sm:grid-cols-2 sm:px-8 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-3">
          <a href="/" className="flex items-center gap-2.5 font-serif text-[26px] text-foreground"><BrandMark className="size-10" />Maison Meli</a>
          <p className="max-w-[34ch] leading-relaxed">{ENTITY}</p>
        </div>
        <nav aria-label="Créer" className={col}>
          <p className="font-medium text-foreground">Créer</p>
          <a href={CREATE} data-create className={link}>Créer mon faire-part</a>
          <a href={PAGES.mine.path} className={link}>Mon faire-part</a>
          <a href={PAGES.exemple.path} className={link}>Voir un exemple</a>
          <a href={PAGES.tarifs.path} className={link}>Tarifs</a>
          <a href={PAGES.outils.path} className={link}>Outils gratuits</a>
        </nav>
        <nav aria-label="Ambiances" className={col}>
          <a href={PAGES.ambiances.path} className="font-medium text-foreground hover:underline">Ambiances</a>
          {AMBIANCES.map((a) => <a key={a.slug} href={a.page.path} className={link}>{a.label}</a>)}
        </nav>
        <nav aria-label="Organiser" className={col}>
          <a href={PAGES.guides.path} className="font-medium text-foreground hover:underline">Organiser</a>
          <a href={PAGES.rsvp.path} className={link}>Réponses des invités (RSVP)</a>
          <a href={PAGES.whatsapp.path} className={link}>Envoyer sur WhatsApp</a>
          {GUIDE_LINKS.map((g) => <a key={g.path} href={g.path} className={link}>{g.crumb}</a>)}
        </nav>
        <nav aria-label="Maison Meli" className={col}>
          <p className="font-medium text-foreground">Maison Meli</p>
          <a href={PAGES.apropos.path} className={link}>À propos</a>
          <a href={PAGES.mentions.path} className={link}>Mentions légales</a>
          <a href={PAGES.confidentialite.path} className={link}>Confidentialité</a>
          <a href={PAGES.conditions.path} className={link}>Conditions d’utilisation</a>
          <a href="mailto:contact@maison-meli.com" className={link}>Contact</a>
          <ReportButton variant="link" />
        </nav>
      </div>
    </footer>
  );
}

// Fil d'Ariane visible + BreadcrumbList. L'accueil est toujours le premier maillon.
export function Breadcrumbs({ trail }: { trail: Pick<Page, "path" | "crumb">[] }) {
  const all = [PAGES.home, ...trail];
  return (
    <>
      <JsonLd data={breadcrumb(all)} />
      <nav aria-label="Fil d’Ariane" className="mb-8 text-[13px] text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1.5">
          {all.map((p, i) => (
            <li key={p.path} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="size-3.5 opacity-60" aria-hidden="true" />}
              {i < all.length - 1 ? <a href={p.path} className="hover:text-foreground hover:underline">{p.crumb}</a> : <span aria-current="page" className="text-foreground/80">{p.crumb}</span>}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}

// Typographie des contenus longs (guides, pages produit, pages de confiance).
export const PROSE = cn(
  "[&_h2]:font-serif [&_h2]:text-[30px] [&_h2]:font-medium [&_h2]:leading-tight [&_h2]:mt-16 [&_h2]:mb-4 [&_h2]:scroll-mt-24",
  "[&_h3]:text-[19px] [&_h3]:font-semibold [&_h3]:mt-9 [&_h3]:mb-2",
  "[&_p]:text-[17px] [&_p]:leading-[1.7] [&_p]:text-foreground/80 [&_p]:mb-4",
  "[&_ul]:mb-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5 [&_ul]:list-disc [&_ol]:mb-5 [&_ol]:flex [&_ol]:flex-col [&_ol]:gap-2 [&_ol]:pl-5 [&_ol]:list-decimal",
  "[&_li]:text-[17px] [&_li]:leading-[1.6] [&_li]:text-foreground/80 [&_li]:marker:text-accent",
  "[&_strong]:font-medium [&_strong]:text-foreground",
  "[&_a:not([data-slot])]:underline [&_a:not([data-slot])]:decoration-foreground/25 [&_a:not([data-slot])]:underline-offset-4 hover:[&_a:not([data-slot])]:decoration-foreground",
);

// Page de contenu : en-tête, colonne de lecture, pied de page. `wide` pour les pages produit.
export function ContentPage({ trail, current, children, wide }: { trail?: Pick<Page, "path" | "crumb">[]; current?: string; children: ReactNode; wide?: boolean }) {
  return (
    <>
      <a href="#contenu" className="skip-link">Aller au contenu</a>
      <SiteHeader current={current} />
      <main id="contenu" className="paper-grain min-h-dvh">
        <div className={cn("mx-auto px-5 pb-24 pt-28 sm:px-8 sm:pt-36", wide ? "max-w-[1180px]" : "max-w-[760px]")}>
          {trail && <Breadcrumbs trail={trail} />}
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

// Tableau lisible sur mobile : défile horizontalement dans son cadre plutôt que de déborder.
export function Table({ caption, head, rows, className }: { caption?: string; head: ReactNode[]; rows: ReactNode[][]; className?: string }) {
  return (
    <div className={cn("my-8 overflow-x-auto rounded-[20px] border border-border bg-card px-5 shadow-soft", className)} role="region" aria-label={caption || "Tableau"} tabIndex={0}>
      <table className="w-full min-w-[560px] border-collapse text-left text-[15px] leading-snug">
        {caption && <caption className="pb-1 pt-4 text-left text-[13px] text-muted-foreground">{caption}</caption>}
        <thead><tr className="border-b border-border">{head.map((h, i) => <th key={i} scope="col" className="py-3 pr-4 align-bottom font-medium">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className="border-b border-border last:border-0">{r.map((c, j) => j === 0 ? <th key={j} scope="row" className="py-3 pr-4 align-top font-medium text-foreground">{c}</th> : <td key={j} className="py-3 pr-4 align-top text-foreground/80">{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

// FAQ : <details> natif (lisible sans JavaScript, réponses dans le DOM) + FAQPage JSON-LD de ces mêmes questions.
export function Faq({ items, id = "questions", title = "Questions fréquentes", schema = true }: { items: readonly (readonly [string, string])[]; id?: string; title?: string; schema?: boolean }) {
  return (
    <section id={id} aria-labelledby={"h-" + id} className="mt-20">
      {schema && <JsonLd data={faqPage(items)} />}
      <h2 id={"h-" + id} className="!mt-0 font-serif text-[34px] font-medium leading-tight">{title}</h2>
      <div className="faq-list mt-6 divide-y divide-border border-y border-border">
        {items.map(([q, a]) => (
          <details key={q} className="q group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[17px] font-medium [&::-webkit-details-marker]:hidden">
              {q}
              <span className="grid size-8 shrink-0 place-items-center rounded-full border border-border transition-transform duration-300 group-open:rotate-45" aria-hidden="true"><Plus className="size-4" /></span>
            </summary>
            <p className="!mb-0 max-w-[62ch] pb-5 pr-10 text-[16px] leading-relaxed text-muted-foreground">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function Cta({ title = "Votre faire-part peut partir ce soir", text = "Prénoms, date, lieu : le reste est déjà prêt. Gratuit, sans carte bancaire.", href = CREATE, label = "Créer mon faire-part", data }: { title?: string; text?: string; href?: string; label?: string; data?: Record<string, string> }) {
  return (
    <aside className="paper-grain relative my-14 overflow-hidden rounded-[32px] bg-[#1C1A17] px-6 py-14 text-center text-[#FAF7F2] sm:px-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_70%_at_50%_0%,rgba(184,151,90,0.22),transparent_70%)]" />
      <div className="relative">
        <p className="font-serif text-[clamp(30px,4.5vw,44px)] leading-[1.05]">{title}</p>
        <p className="!mx-auto !mt-4 max-w-md !text-[17px] !text-[#FAF7F2]/75">{text}</p>
        <Button asChild size="lg" className="mt-8 bg-[#FAF7F2] text-[#1C1A17] hover:bg-white"><a href={href} data-create={href === CREATE ? "" : undefined} {...data}>{label} <ArrowRight /></a></Button>
      </div>
    </aside>
  );
}

// Encadré « à retenir » : la réponse autonome de 40 à 60 mots, citable telle quelle (GEO).
export function Answer({ children }: { children: ReactNode }) {
  return <div className="my-6 rounded-[20px] border border-border bg-card px-6 py-5 text-[17px] leading-[1.65] text-foreground/85 shadow-soft [&_p]:!mb-0">{children}</div>;
}

// Bloc de texte à copier (textes de faire-part).
export function CopyText({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <figure className="my-5 rounded-[20px] border border-dashed border-foreground/20 bg-background/70 px-6 py-5">
      {label && <figcaption className="t-label mb-3">{label}</figcaption>}
      <blockquote data-copy className="whitespace-pre-line font-serif text-[20px] leading-[1.5] text-foreground">{children}</blockquote>
    </figure>
  );
}

import type { ReactNode } from "react";
import { Breadcrumbs, PROSE, SiteFooter, SiteHeader } from "@/components/site/chrome";
import { GUIDES, type Guide } from "@/lib/guides";
import { JsonLd, article } from "@/lib/schema";
import { PAGES, fmtDate } from "@/lib/site";

// Gabarit des guides et comparatifs (brief SEO/GEO, section 5) : réponse directe en tête, sommaire, H2 formulés comme
// les questions des gens, auteur nommé, dates visibles, sources en lien, appels à l'action, lien vers le pilier.
export function GuideLayout({ guide, intro, toc, sources, children }: {
  guide: Guide; intro: ReactNode; toc: [string, string][]; sources: [string, string][]; children: ReactNode;
}) {
  const parent = guide.kind === "comparatif" ? { path: PAGES.guides.path, crumb: "Guides et comparatifs" } : PAGES.guides;
  return (
    <>
      <a href="#contenu" className="skip-link">Aller au contenu</a>
      <JsonLd data={article(guide)} />
      <SiteHeader current={PAGES.guides.path} />
      <main id="contenu" className="paper-grain min-h-dvh">
        <article className="mx-auto max-w-[760px] px-5 pb-24 pt-28 sm:px-8 sm:pt-36">
          <Breadcrumbs trail={[parent, guide]} />
          <p className="t-label mb-4">{guide.kind === "comparatif" ? "Comparatif" : "Guide"}</p>
          <h1 className="t-display !text-[clamp(36px,5.2vw,56px)]">{guide.headline}</h1>
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 text-[14px] text-muted-foreground">
            <a href={PAGES.apropos.path + "#julien"} className="flex items-center gap-2.5 text-foreground">
              <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-[#F1E9DC] font-serif text-[15px] text-gold-ink">JM</span>
              <span>Par <strong className="font-medium">Julien Meli</strong>, fondateur de Maison Meli</span>
            </a>
            <span>Publié le <time dateTime={guide.published}>{fmtDate(guide.published)}</time></span>
            <span>Mis à jour le <time dateTime={guide.updated}>{fmtDate(guide.updated)}</time></span>
          </div>
          <div className={"mt-8 " + PROSE}>
            <div className="text-[19px] leading-[1.6] [&_p]:!text-[19px] [&_p]:!text-foreground/85">{intro}</div>
            <nav aria-labelledby="h-toc" className="my-10 rounded-[20px] border border-border bg-card px-6 py-5 shadow-soft">
              <p id="h-toc" className="!mb-3 !text-[13px] font-medium uppercase tracking-[0.12em] !text-muted-foreground">Sommaire</p>
              <ol className="!mb-0 !gap-1.5">{toc.map(([id, label]) => <li key={id} className="!text-[16px]"><a href={"#" + id}>{label}</a></li>)}</ol>
            </nav>
            {children}
            <section aria-labelledby="h-sources" className="mt-16 border-t border-border pt-8">
              <h2 id="h-sources" className="!mt-0 !text-[22px]">Sources</h2>
              <ul className="!text-[15px]">{sources.map(([label, href]) => <li key={href} className="!text-[15px]"><a href={href} rel="noopener" target="_blank">{label}</a></li>)}</ul>
              <p className="!text-[14px] !text-muted-foreground">Rédigé avec l’aide d’une IA, relu et vérifié par Julien Meli. Une erreur ? Écrivez à <a href="mailto:contact@maison-meli.com">contact@maison-meli.com</a>.</p>
            </section>
            {guide !== GUIDES.digital && guide.kind === "guide" && <p className="!mt-8">Pour tout savoir sur le format : <a href={GUIDES.digital.path}>le faire-part de mariage digital, le guide complet</a>.</p>}
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}

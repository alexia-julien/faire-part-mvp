import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Answer, ContentPage, CopyText, Cta, Faq, PROSE } from "@/components/site/chrome";
import { AmbianceDemo } from "@/components/site/ambiance-demo";
import { MiniCard } from "@/components/invitation/mini-card";
import { AMBIANCES, ambianceBySlug } from "@/lib/ambiances";
import { PRESETS, sampleConfig } from "@/lib/invitation";
import { PAGES, meta } from "@/lib/site";

export const dynamicParams = false;
export function generateStaticParams() { return AMBIANCES.map((a) => ({ slug: a.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = ambianceBySlug((await params).slug);
  return a ? meta(a.page) : {};
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const a = ambianceBySlug((await params).slug);
  if (!a) notFound();
  const create = "/creer/#s=" + a.preset;
  const others = AMBIANCES.filter((x) => x !== a);
  return (
    <ContentPage trail={[PAGES.ambiances, a.page]} current={PAGES.ambiances.path} wide>
      <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div>
          <p className="t-label mb-4">Ambiance {a.label} · {a.tagline}</p>
          <h1 className="t-display !text-[clamp(38px,5.5vw,60px)]">{a.h1}</h1>
          <p className="t-lead mt-6 max-w-[58ch]">{a.intro}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg"><a href={create} data-style={a.preset}>Créer avec cette ambiance <ArrowRight /></a></Button>
            <a href={PAGES.exemple.path} className="px-2 text-[15px] font-medium underline decoration-foreground/25 underline-offset-4">Voir un faire-part complet</a>
          </div>
          <div className={"mt-14 max-w-[68ch] " + PROSE}>
            <h2>La palette et le papier</h2>
            <ul aria-label={"Couleurs de l’ambiance " + a.label} className="!mb-6 !flex-row !flex-wrap !gap-3 !pl-0 !list-none">
              {a.palette.colors.map(([n, c]) => (
                <li key={c} className="flex items-center gap-2 rounded-full border border-border bg-card py-1.5 pl-1.5 pr-4 !text-[14px]">
                  <span className="size-7 rounded-full shadow-[inset_0_0_0_1px_rgba(28,26,23,.12)]" style={{ background: c }} aria-hidden="true" />{n} <span className="text-muted-foreground">{c}</span>
                </li>
              ))}
            </ul>
            <p>{a.palette.text}</p>
            <h2>Les typographies</h2>
            <p>{a.typo}</p>
            <h2>L’enveloppe, le cachet et les ornements</h2>
            <p>{a.details}</p>
            <h2>Les lieux qui vont avec</h2>
            <p>{a.lieux}</p>
          </div>
        </div>
        <div className="lg:sticky lg:top-28">
          <AmbianceDemo preset={a.preset} label={"Le faire-part " + a.label + ", tel que vos invités le reçoivent"} />
        </div>
      </div>

      <div className={"mx-auto mt-6 max-w-[760px] " + PROSE}>
        <h2>Trois textes pour un faire-part {a.label.toLowerCase()}</h2>
        <p>Des exemples adaptés au style de l’ambiance, à copier puis à personnaliser dans l’éditeur. Les prénoms et les lieux sont fictifs.</p>
        {a.textes.map((t) => <CopyText key={t.titre} label={t.titre}>{t.texte}</CopyText>)}
        <Answer><p>Besoin d’autres idées ? Retrouvez <a href={a.guide.path}>{a.guide.label.toLowerCase()}</a>, et le <a href={PAGES.generateur.path}>générateur de texte de faire-part</a>.</p></Answer>
        <Faq items={a.faq} title={"Questions sur le faire-part " + a.label.toLowerCase()} />
        <Cta title={"Votre faire-part " + a.label.toLowerCase() + ", ce soir"} text="Prénoms, date, lieu : l’ambiance est déjà appliquée. Gratuit, sans carte bancaire." href={create} label="Créer avec cette ambiance" data={{ "data-style": a.preset }} />
      </div>

      <section aria-labelledby="h-others" className="mt-10">
        <h2 id="h-others" className="font-serif text-[30px] leading-tight">Les autres ambiances</h2>
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {others.map((o) => {
            const p = PRESETS.find((x) => x.id === o.preset)!;
            return (
              <li key={o.slug}>
                <a href={o.page.path} className="group flex flex-col gap-3 rounded-[24px] bg-card p-2.5 shadow-soft hover:shadow-lift">
                  <div className="overflow-hidden rounded-[18px]" aria-hidden="true"><MiniCard cfg={sampleConfig({}, p)} /></div>
                  <span className="px-1.5 pb-1 font-serif text-[20px] leading-tight">{o.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </section>
    </ContentPage>
  );
}

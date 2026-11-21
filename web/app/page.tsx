import type { Metadata } from "next";
import { ArrowRight, Check, Plus } from "lucide-react";
import { COMPARE, DEFINITION, DESC, FAQ, STORY, TITLE, jsonLd } from "@/lib/content";
import { SITE } from "@/lib/config";
import { PRESETS, sampleConfig } from "@/lib/invitation";
import { Button } from "@/components/ui/button";
import { BlurFade } from "@/components/magic/blur-fade";
import { NumberTicker } from "@/components/magic/number-ticker";
import { CardsCarousel } from "@/components/aceternity/cards-carousel";
import { MiniCard } from "@/components/invitation/mini-card";
import { FloatingCta, FontWarmer, GuestsStory, Hero, LinkSync } from "@/components/site/landing-islands";
import { SiteFooter, SiteHeader, Table } from "@/components/site/chrome";
import { AMBIANCES } from "@/lib/ambiances";
import { GUIDES } from "@/lib/guides";
import { PAGES } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESC,
  alternates: { canonical: SITE + "/" },
  robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  openGraph: {
    type: "website", siteName: "Maison Meli", locale: "fr_FR", url: SITE + "/",
    title: "Le faire-part de mariage digital qui fait dire « oh »", description: DESC,
    images: [{ url: "/img/og-accueil.png", width: 1200, height: 630, alt: "Maison Meli : un faire-part de mariage digital affiché sur un téléphone" }],
  },
  twitter: { card: "summary_large_image", title: "Faire-part de mariage digital gratuit avec RSVP", description: DESC, images: ["/img/og-accueil.png"] },
};

// Page d'accueil : rendue côté serveur (HTML statique), avec quelques îlots interactifs (héros, récit, liens).
export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()).replace(/</g, "\\u003c") }} />
      <LinkSync />
      <a href="#contenu" className="skip-link">Aller au contenu</a>
      <SiteHeader current="/" />

      <main id="contenu">
        <section aria-labelledby="h-hero" className="paper-grain relative overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_55%_at_75%_35%,#F1E9DC,transparent_70%)]" />
          <Hero />
        </section>

        {/* Paragraphe-définition (GEO) : la réponse à « qu'est-ce que Maison Meli ? », citable telle quelle. */}
        <section aria-labelledby="h-def" className="mx-auto max-w-[1180px] px-5 pt-10 sm:px-8">
          <div className="grid gap-6 border-y border-border py-10 md:grid-cols-[0.8fr_1.2fr] md:items-baseline">
            <h2 id="h-def" className="font-serif text-[30px] leading-tight">Maison Meli, en deux phrases</h2>
            <p className="max-w-[62ch] text-[18px] leading-relaxed text-foreground/80">{DEFINITION}</p>
          </div>
        </section>

        <section id="ambiances" aria-labelledby="h-styles" className="py-24 sm:py-32 [content-visibility:auto] [contain-intrinsic-size:auto_900px]">
          <FontWarmer />
          <div className="mx-auto mb-12 grid max-w-[1180px] gap-6 px-5 sm:px-8 md:grid-cols-2 md:items-end">
            <BlurFade><p className="t-label mb-4">Neuf collections</p><h2 id="h-styles" className="t-section max-w-[14ch]">Neuf ambiances, de la plus champêtre à la plus habillée</h2></BlurFade>
            <BlurFade delay={0.08}><p className="t-lead">Chacune règle d’un geste couleurs, typographie, ornements, papier de l’enveloppe et cachet de cire, comme une collection chez un papetier. Tout reste modifiable ensuite.</p></BlurFade>
          </div>
          <CardsCarousel label="Les neuf ambiances">
            {PRESETS.map((p) => (
              <a key={p.id} href={"/creer/#s=" + p.id} data-style={p.id}
                className="style-card group relative flex w-[min(78vw,300px)] flex-col gap-4 rounded-[28px] bg-card p-3 shadow-soft transition-shadow duration-300 hover:shadow-lift">
                <div className="overflow-hidden rounded-[20px]"><div className="transition-transform duration-500 ease-out group-hover:scale-[1.03]"><MiniCard cfg={sampleConfig({}, p)} /></div></div>
                <div className="flex items-end justify-between gap-3 px-2 pb-1">
                  <div><p className="style-name font-serif text-[24px] leading-tight">{p.label}</p><p className="text-[13px] text-muted-foreground">{p.tagline}</p></div>
                  <span className="style-go grid size-10 shrink-0 place-items-center rounded-full bg-foreground text-background transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true"><ArrowRight className="size-4" /></span>
                  <span className="sr-only">Commencer avec ce style</span>
                </div>
              </a>
            ))}
          </CardsCarousel>
          <nav aria-label="Pages des ambiances" className="mx-auto mt-10 flex max-w-[1180px] flex-wrap items-center gap-x-1 gap-y-2 px-5 text-[15px] sm:px-8">
            <span className="mr-2 text-muted-foreground">Découvrir chaque ambiance :</span>
            {AMBIANCES.map((a) => <a key={a.slug} href={a.page.path} className="rounded-full border border-border px-3 py-1.5 hover:border-foreground/40">{a.label}</a>)}
            <a href={PAGES.ambiances.path} className="ml-1 rounded-full px-3 py-1.5 font-medium underline decoration-foreground/25 underline-offset-4">Toutes les ambiances</a>
          </nav>
        </section>

        <section id="invites" aria-labelledby="h-guests" className="bg-[linear-gradient(180deg,transparent,#F3EDE3_12%,#F3EDE3_88%,transparent)] py-24 sm:py-32">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-8">
            <BlurFade className="mb-14 max-w-xl"><p className="t-label mb-4">Côté invités</p><h2 id="h-guests" className="t-section">Ce que vivent vos invités</h2></BlurFade>
            <GuestsStory steps={STORY} />
          </div>
        </section>

        <section aria-labelledby="h-you" className="mx-auto max-w-[1180px] px-5 py-24 sm:px-8 sm:py-32 [content-visibility:auto] [contain-intrinsic-size:auto_1000px]">
          <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <BlurFade>
              <p className="t-label mb-4">Côté mariés</p>
              <h2 id="h-you" className="t-section max-w-[16ch]">Toutes les réponses, au même endroit</h2>
              <ul className="mt-8 flex flex-col gap-4 text-[17px]">
                {["Qui vient, combien d’adultes et d’enfants", "Les régimes et allergies, regroupés pour le traiteur", "La présence au brunch et les accompagnants", "Un export CSV pour Excel ou Google Sheets", "Le faire-part modifiable à tout moment, même lien"].map((t) => (
                  <li key={t} className="flex gap-3"><span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-foreground text-background"><Check className="size-3" aria-hidden="true" /></span>{t}</li>
                ))}
              </ul>
            </BlurFade>
            <BlurFade delay={0.1}>
              <div aria-hidden="true" className="rounded-[28px] border border-white/70 bg-card p-6 shadow-float sm:p-8">
                <p className="t-label">Suivi des réponses</p>
                <p className="mt-2 font-serif text-[34px] leading-tight">Camille <span className="italic text-muted-foreground">&amp;</span> Hugo</p>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {([[86, "présents"], [9, "absents"], [212, "jours"]] as const).map(([n, l]) => (
                    <div key={l} className="rounded-[20px] bg-background p-4"><NumberTicker value={n} className="font-serif text-[36px] leading-none [font-variant-numeric:lining-nums]" /><p className="mt-1 text-[13px] text-muted-foreground">{l}</p></div>
                  ))}
                </div>
                <div className="mt-5 divide-y divide-border rounded-[20px] border border-border">
                  {[["Sophie Martin", "Oui", "Végétarien"], ["Marc & Inès", "Oui", "Sans gluten"], ["Léa Bernard", "Non", ""]].map(([n, a, d]) => (
                    <div key={n} className="flex items-center justify-between gap-3 px-4 py-3 text-[14px]">
                      <span className="font-medium">{n}</span>
                      <span className="flex items-center gap-2 text-muted-foreground">{d && <span className="hidden sm:inline">{d}</span>}<span className={"rounded-full px-2.5 py-0.5 text-[12px] " + (a === "Oui" ? "bg-[#5F6E4E]/10 text-[#46533A]" : "bg-muted")}>{a}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            </BlurFade>
          </div>
        </section>

        <section className="mx-auto max-w-[1180px] px-5 py-24 sm:px-8 sm:py-32 [content-visibility:auto] [contain-intrinsic-size:auto_1000px]" aria-labelledby="h-account">
          <div className="grid gap-10 md:grid-cols-[1fr_1.2fr] md:items-end">
            <BlurFade><p className="t-label mb-4">Votre compte</p><h2 id="h-account" className="t-section">Un compte, sans mot de passe</h2></BlurFade>
            <BlurFade delay={0.08}>
              <p className="t-lead">Vous composez votre faire-part sans rien créer. Au moment de publier, vous indiquez votre <strong className="font-medium text-foreground">adresse email</strong> et recevez un code à 6 chiffres, ou vous continuez avec <strong className="font-medium text-foreground">Google</strong>. Vous retrouvez ensuite votre faire-part et les réponses depuis n’importe quel appareil. Vos invités, eux, n’ont aucun compte à créer.</p>
            </BlurFade>
          </div>
        </section>

        <section aria-labelledby="h-compare" className="mx-auto max-w-[1180px] px-5 py-24 sm:px-8 sm:py-32 [content-visibility:auto] [contain-intrinsic-size:auto_900px]">
          <div className="grid gap-6 md:grid-cols-2 md:items-end">
            <div><p className="t-label mb-4">Comparer</p><h2 id="h-compare" className="t-section max-w-[16ch]">Maison Meli, le papier ou un modèle Canva ?</h2></div>
            <p className="t-lead">Le papier reste le plus beau souvenir à tenir en main ; un modèle Canva est parfait pour une jolie image. Maison Meli ajoute ce qu’aucun des deux ne fait seul : l’enveloppe qui s’ouvre, la réponse des invités et le suivi, sur un seul lien.</p>
          </div>
          <Table caption="Relevé du 20 novembre 2026. Sources : Mariages.net (rapport 2025 sur le secteur nuptial), La Poste (tarifs 2026 et 2027)." head={COMPARE.head} rows={COMPARE.rows} className="mt-10" />
          <p className="text-[15px] text-muted-foreground">Le détail, limites du digital comprises : <a href={GUIDES.papier.path} className="underline decoration-foreground/25 underline-offset-4">faire-part papier ou digital, le comparatif honnête</a>.</p>
        </section>

        <section aria-labelledby="h-origin" className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-8 [content-visibility:auto] [contain-intrinsic-size:auto_600px]">
          <div className="grid gap-8 rounded-[32px] bg-card p-8 shadow-soft sm:p-12 md:grid-cols-[auto_1fr] md:items-center">
            <div aria-hidden="true" className="grid size-24 place-items-center rounded-full bg-[#F1E9DC] font-serif text-[34px] text-gold-ink">JM</div>
            <div>
              <h2 id="h-origin" className="font-serif text-[34px] leading-tight">Né d’un vrai mariage</h2>
              <p className="mt-4 max-w-[64ch] text-[17px] leading-relaxed text-foreground/80">Maison Meli est né de la préparation du mariage de Julien, son fondateur : il a d’abord conçu le faire-part qu’il voulait envoyer à ses propres invités. Il l’a ensuite ouvert à tous les couples, gratuitement. Il le fait évoluer avec leurs retours.</p>
              <p className="mt-4 text-[15px]"><a href={PAGES.apropos.path} className="font-medium underline decoration-foreground/25 underline-offset-4">Pourquoi Maison Meli existe</a></p>
            </div>
          </div>
        </section>

        <section aria-labelledby="h-more" className="mx-auto max-w-[1180px] px-5 pb-8 sm:px-8 [content-visibility:auto] [contain-intrinsic-size:auto_500px]">
          <h2 id="h-more" className="font-serif text-[34px] leading-tight">Pour bien préparer votre faire-part</h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              [PAGES.exemple.path, "Voir un exemple complet", "Ouvrez le faire-part fictif de Camille et Thomas et testez la réponse invité."],
              [PAGES.rsvp.path, "Les réponses de vos invités", "Présence, accompagnants, enfants, régimes : comment fonctionne le RSVP en ligne."],
              [PAGES.whatsapp.path, "Envoyer sur WhatsApp", "Le message, l’aperçu du lien, les groupes : envoyer son faire-part en un lien."],
              [GUIDES.textes.path, "40 textes de faire-part", "Classiques, simples, originaux : des textes à copier dans votre faire-part."],
              [GUIDES.digital.path, "Le guide du faire-part digital", "Avantages, limites, étiquette : tout savoir avant de choisir le digital."],
              [GUIDES.reponses.path, "Organiser les réponses", "Date limite, relances, régimes : obtenir toutes les réponses à temps."],
            ].map(([href, t, d]) => (
              <li key={href}><a href={href} className="flex h-full flex-col gap-2 rounded-[24px] border border-border bg-background p-6 transition-colors hover:border-foreground/30"><span className="font-serif text-[24px] leading-tight">{t}</span><span className="text-[15px] text-muted-foreground">{d}</span></a></li>
            ))}
          </ul>
        </section>

        {/* FAQ en accordéon natif (details/summary) : lisible sans JavaScript, indexable, accessible au clavier. */}
        <section id="questions" aria-labelledby="h-faq" className="mx-auto max-w-[1180px] px-5 py-24 sm:px-8 sm:py-32 [content-visibility:auto] [contain-intrinsic-size:auto_1000px]">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div><p className="t-label mb-4">Questions</p><h2 id="h-faq" className="t-section">Questions fréquentes</h2></div>
            <div className="faq-list divide-y divide-border border-y border-border">
              {FAQ.map(([q, a]) => (
                <details key={q} className="q group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-[18px] font-medium [&::-webkit-details-marker]:hidden">
                    {q}
                    <span className="grid size-9 shrink-0 place-items-center rounded-full border border-border transition-transform duration-300 group-open:rotate-45" aria-hidden="true"><Plus className="size-4" /></span>
                  </summary>
                  <p className="max-w-[60ch] pb-6 pr-12 text-[16px] leading-relaxed text-muted-foreground">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="h-final" data-final-cta className="px-3 pb-3 [content-visibility:auto] [contain-intrinsic-size:auto_1000px]">
          <div className="paper-grain relative mx-auto max-w-[1240px] overflow-hidden rounded-[36px] bg-[#1C1A17] px-6 py-24 text-center text-[#FAF7F2] sm:py-32">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_70%_at_50%_0%,rgba(184,151,90,0.22),transparent_70%)]" />
            <BlurFade className="relative">
              <h2 id="h-final" className="t-display !text-[clamp(40px,6vw,68px)]">Votre faire-part peut partir ce soir</h2>
              <p className="mx-auto mt-5 max-w-md text-[18px] text-[#FAF7F2]/70">Prénoms, date, lieu : le reste est déjà prêt.</p>
              <Button asChild size="lg" className="mt-10 bg-[#FAF7F2] text-[#1C1A17] hover:bg-white"><a href="/creer/" data-create>Créer mon faire-part <ArrowRight /></a></Button>
            </BlurFade>
          </div>
        </section>
      </main>
      <SiteFooter />
      <FloatingCta />
    </>
  );
}

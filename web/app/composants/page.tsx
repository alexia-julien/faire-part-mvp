import type { Metadata } from "next";
import { ArrowRight, Check, Mail } from "lucide-react";
import { PRESETS, sampleConfig } from "@/lib/invitation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { MiniCard } from "@/components/invitation/mini-card";
import { ComponentsDemo } from "./demo";

export const metadata: Metadata = { title: "Référence des composants", robots: { index: false, follow: false } };

const COLORS = [
  ["background", "#FAF7F2", "Ivoire — fond de toutes les pages"], ["card", "#FFFFFF", "Cartes, panneaux, faire-part"],
  ["muted", "#EFE8DD", "Lin — zones secondaires"], ["foreground", "#1C1A17", "Encre — texte, boutons"],
  ["muted-foreground", "#6B645B", "Taupe — texte secondaire"], ["accent", "#B8975A", "Or champagne — rare, jamais en aplat"],
  ["gold-ink", "#8A6D33", "Or lisible (texte court, AA)"],
];

// Page de référence (livrable du brief design) : tokens et composants restylés, tels qu'utilisés dans le produit.
export default function Page() {
  return (
    <main className="paper-grain min-h-dvh">
      <div className="mx-auto max-w-[1080px] px-5 py-16 sm:px-8">
        <p className="t-label mb-3">Maison Meli · système de design</p>
        <h1 className="t-display">Référence des composants</h1>
        <p className="t-lead mt-4 max-w-[52ch]">shadcn/ui pour le socle, Magic UI pour le mouvement du quotidien, Aceternity UI (réécrit) pour la vitrine. Aucun composant ne garde son style par défaut.</p>

        <h2 className="t-section mt-16 mb-6">Couleurs</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {COLORS.map(([n, v, d]) => (
            <div key={n} className="rounded-[20px] border border-border bg-card p-3 shadow-soft">
              <div className="h-16 rounded-[14px] border border-border" style={{ background: v }} />
              <p className="mt-3 font-mono text-[13px]">{n}</p><p className="text-[12px] text-muted-foreground">{v} · {d}</p>
            </div>
          ))}
        </div>

        <h2 className="t-section mt-16 mb-6">Typographie</h2>
        <div className="flex flex-col gap-4 rounded-[28px] border border-border bg-card p-8 shadow-soft">
          <p className="t-display">Camille &amp; Hugo</p>
          <p className="t-section">Titre de section</p>
          <p className="text-[17px]">Texte courant, Inter 17 px, interligne 1,5. Vouvoiement, phrases courtes, chaleureux sans mièvrerie.</p>
          <p className="t-label">Légende · capitales espacées</p>
        </div>

        <h2 className="t-section mt-16 mb-6">Boutons</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Créer mon faire-part <ArrowRight /></Button>
          <Button variant="outline">Secondaire</Button>
          <Button variant="secondary">Lin</Button>
          <Button variant="ghost">Discret</Button>
          <Button variant="glass">Verre</Button>
          <Button variant="link">Lien</Button>
          <Button size="sm"><Mail /> Petit</Button>
          <Button size="lg">Grand</Button>
          <Button disabled>Indisponible</Button>
        </div>

        <h2 className="t-section mt-16 mb-6">Champs</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input placeholder="Prénom" aria-label="Exemple de champ" />
          <Input type="date" aria-label="Exemple de date" />
          <Textarea placeholder="Un petit mot pour les mariés ?" aria-label="Exemple de zone de texte" className="sm:col-span-2" />
        </div>

        <ComponentsDemo />

        <h2 className="t-section mt-16 mb-6">Pastilles et chargement</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="rounded-full border-[#5F6E4E]/30 bg-[#5F6E4E]/10 text-[#46533A]">Oui</Badge>
          <Badge variant="outline" className="rounded-full bg-muted text-muted-foreground">Non</Badge>
          <Badge variant="outline" className="rounded-full"><Check /> Enregistré</Badge>
          <Skeleton className="h-10 w-40 rounded-full" /><Skeleton className="h-10 w-10 rounded-full" />
        </div>

        <h2 className="t-section mt-16 mb-6">Matière : verre et ombres</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="glass rounded-[28px] p-6">Verre (barres et panneaux flottants)</div>
          <div className="rounded-[20px] bg-card p-6 shadow-soft">Ombre douce</div>
          <div className="rounded-[28px] bg-card p-6 shadow-float">Ombre flottante</div>
        </div>

        <h2 className="t-section mt-16 mb-6">Les neuf ambiances</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-9">
          {PRESETS.map((p) => <div key={p.id}><MiniCard cfg={sampleConfig({}, p)} className="rounded-[12px]" /><p className="mt-1.5 text-center text-[12px]">{p.label}</p></div>)}
        </div>
      </div>
    </main>
  );
}

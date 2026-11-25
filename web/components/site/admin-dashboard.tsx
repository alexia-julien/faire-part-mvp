"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { api, type AdminData, type AdminKpis, type ApiError } from "@/lib/api";
import { auth, consumeRedirect, type User } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AuthPanel } from "./auth-panel";
import { Loading, Shell } from "./dashboard";

// /admin/ : indicateurs de Maison Meli, réservés au compte administrateur.
// La page ne contient aucune donnée : tout vient de public.admin_dashboard, qui refuse toute autre session (« not admin »).

const LAUNCH = "2026-11-01";
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const parse = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const dayCount = (a: string, b: string) => Math.round((+parse(b) - +parse(a)) / 864e5) + 1;
const short = (s: string) => { const d = parse(s); return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0"); };

type Preset = "7" | "30" | "90" | "mois" | "tout" | "perso";
function range(p: Preset): { from: string; to: string } {
  const t = new Date();
  if (p === "mois") return { from: iso(new Date(t.getFullYear(), t.getMonth(), 1)), to: iso(t) };
  if (p === "tout") return { from: LAUNCH, to: iso(t) };
  return { from: iso(addDays(t, -(Number(p) - 1))), to: iso(t) };
}

const nf = (v: number | null | undefined, d = 0) => (v == null ? "—" : Number(v).toLocaleString("fr-FR", { maximumFractionDigits: d }));
const pct = (v: number | null | undefined) => (v == null ? "—" : nf(v, 1) + " %");
function dur(s: number | null | undefined) {
  if (s == null) return "—";
  s = Math.round(s);
  if (s < 60) return s + " s";
  const m = Math.floor(s / 60), r = s % 60;
  return m + " min" + (r ? " " + String(r).padStart(2, "0") + " s" : "");
}
const SRC: Record<string, string> = { direct: "Direct", seo: "Moteurs de recherche", ia: "Assistants IA", "faire-part": "Faire-part (invités)", reseaux: "Réseaux sociaux", email: "E-mail", autre: "Autres sites" };
const DEV: Record<string, string> = { mobile: "Mobile", ordinateur: "Ordinateur", tablette: "Tablette", inconnu: "Non détecté" };

// Évolution vs période précédente : % pour un volume, points pour un taux.
function Evo({ k, a, b }: { k: string; a: AdminKpis; b: AdminKpis }) {
  const x = a[k], y = b[k], rate = k.startsWith("taux_");
  let v: number | null = null;
  if (x != null && y != null) v = rate ? Math.round((x - y) * 10) / 10 : y > 0 ? Math.round(((x - y) / y) * 1000) / 10 : null;
  if (v == null) return <span className="text-muted-foreground">{x && !y ? "Nouveau" : "Pas de comparaison"}</span>;
  return (
    <span className={cn("font-medium", v > 0 ? "text-emerald-700" : v < 0 ? "text-red-700" : "text-muted-foreground")}>
      {(v > 0 ? "▲ +" : v < 0 ? "▼ " : "= ") + nf(v, 1) + (rate ? " pts" : " %")}
    </span>
  );
}

function Card({ id, label, value, children, big }: { id: string; label: string; value: string; children?: React.ReactNode; big?: boolean }) {
  return (
    <div id={id} className={cn("flex min-w-0 flex-col gap-1.5 rounded-[20px] border border-border bg-card shadow-soft", big ? "p-7" : "p-5")}>
      <span className="text-[12px] uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
      <span className={cn("font-serif leading-none tabular-nums", big ? "text-[56px]" : "text-[36px]")}>{value}</span>
      {children && <span className="text-[13px] text-muted-foreground tabular-nums">{children}</span>}
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="flex flex-col gap-4">
      <h2 className="font-serif text-[30px] leading-tight">{title}</h2>
      {children}
    </section>
  );
}

// Barres par jour, en SVG, avec infobulle.
function DailyBars({ rows, series, label }: { rows: AdminData["jours"]; series: { key: "visiteurs" | "comptes" | "faire_part"; label: string; color: string }[]; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(600);
  const [tip, setTip] = useState<{ i: number; x: number } | null>(null);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.max(260, el.clientWidth)));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  const H = 200, m = { t: 10, r: 6, b: 24, l: 28 };
  const max = Math.max(1, ...rows.flatMap((r) => series.map((s) => r[s.key])));
  const top = max <= 4 ? max : Math.ceil(max / 4) * 4;
  const bw = (w - m.l - m.r) / Math.max(rows.length, 1);
  const inner = Math.max(1, bw * 0.75 / series.length);
  const y = (v: number) => H - m.b - (v / top) * (H - m.t - m.b);
  const ticks = top < 4 ? Array.from({ length: top + 1 }, (_, i) => i) : [0, top / 2, top];
  const every = Math.max(1, Math.ceil(rows.length / Math.floor((w - m.l) / 46)));
  return (
    <div ref={box} className="relative w-full">
      {series.length > 1 && (
        <div className="mb-2 flex gap-4 text-[12px] text-muted-foreground">
          {series.map((s) => <span key={s.key} className="flex items-center gap-1.5"><i className="inline-block size-2.5 rounded-sm" style={{ background: s.color }} />{s.label}</span>)}
        </div>
      )}
      <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} role="img" aria-label={label} className="block max-w-full" onMouseLeave={() => setTip(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={w - m.r} y1={y(t)} y2={y(t)} stroke="currentColor" className="text-border" />
            <text x={m.l - 6} y={y(t) + 4} textAnchor="end" className="fill-muted-foreground text-[11px]">{t}</text>
          </g>
        ))}
        {rows.map((r, i) => {
          const x0 = m.l + i * bw + bw * 0.125;
          return (
            <g key={r.jour} onMouseMove={() => setTip({ i, x: m.l + i * bw + bw / 2 })}>
              <rect x={m.l + i * bw} y={m.t} width={bw} height={H - m.t - m.b} fill="transparent" />
              {series.map((s, j) => (
                <rect key={s.key} x={x0 + j * inner} y={y(r[s.key])} width={Math.max(1, inner - 1)} height={H - m.b - y(r[s.key])} rx={2} fill={s.color} />
              ))}
              {i % every === 0 && <text x={m.l + i * bw + bw / 2} y={H - 6} textAnchor="middle" className="fill-muted-foreground text-[11px]">{short(r.jour)}</text>}
            </g>
          );
        })}
      </svg>
      {tip && rows[tip.i] && (
        <div className="pointer-events-none absolute top-0 z-10 rounded-xl border border-border bg-card px-3 py-2 text-[12px] shadow-lift"
          style={{ left: Math.min(Math.max(tip.x - 70, 0), w - 150) }}>
          <div className="font-medium">{parse(rows[tip.i].jour).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</div>
          {series.map((s) => <div key={s.key}>{s.label} : {nf(rows[tip.i][s.key])}</div>)}
        </div>
      )}
    </div>
  );
}

function Funnel({ k }: { k: AdminKpis }) {
  const steps = [
    { f: "visiteurs", l: "Visiteurs", s: "ont ouvert l’accueil" },
    { f: "demarres", l: "Démarrés", s: "ont saisi les prénoms", t: "taux_demarrage", tl: "démarrage" },
    { f: "termines", l: "Terminés", s: "arrivés à « Publier »", t: "taux_finalisation", tl: "finalisation" },
    { f: "comptes", l: "Comptes créés", s: "inscriptions", t: "taux_ouverture", tl: "ouverture de compte" },
    { f: "faire_part", l: "Faire-part publiés", s: "liens créés", t: "taux_publication", tl: "publication" },
  ];
  const top = Math.max(1, k.visiteurs || 0);
  return (
    <div id="entonnoir" className="flex flex-col gap-2 rounded-[20px] border border-border bg-card p-6 shadow-soft">
      {steps.map((s, i) => (
        <div key={s.f} className="flex flex-col gap-2">
          {s.t && <div className="pl-[calc(min(32%,180px)+12px)] text-[12px] text-muted-foreground">↓ {pct(k[s.t])} de {s.tl}</div>}
          <div className="grid grid-cols-[min(32%,180px)_1fr_auto] items-center gap-3">
            <div className="text-[15px] leading-tight">{s.l}<small className="block text-[12px] text-muted-foreground">{s.s}</small></div>
            <div className="relative h-8 rounded-lg bg-muted">
              <div className="absolute inset-y-0 left-0 min-w-[3px] rounded-lg bg-primary" style={{ width: Math.min(100, (100 * (k[s.f] || 0)) / top) + "%", opacity: 1 - i * 0.13 }} />
            </div>
            <span className="min-w-8 text-right text-[17px] font-medium tabular-nums">{nf(k[s.f] || 0)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Board({ d }: { d: AdminData }) {
  const a = d.kpis.actuelle, b = d.kpis.precedente;
  const n = dayCount(d.periode.from, d.periode.to);
  const prevFrom = iso(addDays(parse(d.periode.from), -n)), prevTo = iso(addDays(parse(d.periode.from), -1));
  const maxDev = Math.max(1, ...d.appareils.map((r) => r.visiteurs));
  return (
    <div className="flex flex-col gap-12">
      <p id="resume" className="t-lead max-w-[62ch]">
        <b className="text-foreground">{nf(a.visiteurs)}</b> visiteurs uniques, <b className="text-foreground">{nf(a.comptes)}</b> comptes et{" "}
        <b className="text-foreground">{nf(a.faire_part)}</b> faire-part créés sur la période, soit <b className="text-foreground">{pct(a.taux_transformation)}</b> de visiteurs transformés en compte.
        <span className="block text-[13px] text-muted-foreground">Comparaison avec les {n} jours précédents ({short(prevFrom)} – {short(prevTo)}).</span>
      </p>

      <Section id="key-metrics" title="Key metrics">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card id="km-comptes" big label="Comptes créés" value={nf(a.comptes)}>
            <Evo k="comptes" a={a} b={b} /> · avant : {nf(b.comptes)} · total : {nf(d.totaux.comptes)}
          </Card>
          <Card id="km-faire-part" big label="Faire-part créés" value={nf(a.faire_part)}>
            <Evo k="faire_part" a={a} b={b} /> · avant : {nf(b.faire_part)} · en ligne : {nf(d.totaux.faire_part)}
          </Card>
        </div>
        <div id="ch-creations" className="rounded-[20px] border border-border bg-card p-6 shadow-soft">
          <p className="mb-3 text-[12px] uppercase tracking-[0.08em] text-muted-foreground">Comptes et faire-part créés par jour</p>
          <DailyBars rows={d.jours} label="Comptes et faire-part créés par jour" series={[
            { key: "comptes", label: "Comptes", color: "var(--color-primary)" },
            { key: "faire_part", label: "Faire-part", color: "#B08D57" },
          ]} />
        </div>
      </Section>

      <Section id="trafic" title="Trafic">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card id="t-visiteurs" label="Visiteurs uniques" value={nf(a.visiteurs)}><Evo k="visiteurs" a={a} b={b} /></Card>
          <Card id="t-pages" label="Pages d’accueil vues" value={nf(a.pages_accueil)}><Evo k="pages_accueil" a={a} b={b} /></Card>
          <Card id="t-duree" label="Durée de session médiane" value={dur(a.duree_mediane_s)}>
            Moyenne {dur(a.duree_moyenne_s)} · {nf(a.sessions_mesurees)} sessions mesurées
          </Card>
        </div>
        <div id="ch-visiteurs" className="rounded-[20px] border border-border bg-card p-6 shadow-soft">
          <p className="mb-3 text-[12px] uppercase tracking-[0.08em] text-muted-foreground">Visiteurs uniques par jour</p>
          <DailyBars rows={d.jours} label="Visiteurs uniques par jour" series={[{ key: "visiteurs", label: "Visiteurs", color: "var(--color-primary)" }]} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div id="appareils" className="flex flex-col gap-3 rounded-[20px] border border-border bg-card p-6 shadow-soft">
            <p className="text-[12px] uppercase tracking-[0.08em] text-muted-foreground">Appareils</p>
            {d.appareils.length === 0 && <p className="text-[14px] text-muted-foreground">Aucune visite sur la période.</p>}
            {d.appareils.map((r) => (
              <div key={r.appareil} className="grid grid-cols-[110px_1fr_auto] items-center gap-3 text-[15px]">
                <span>{DEV[r.appareil] || r.appareil}</span>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full", r.appareil === "inconnu" ? "bg-muted-foreground/40" : "bg-primary")} style={{ width: (100 * r.visiteurs) / maxDev + "%" }} />
                </div>
                <span className="tabular-nums">{nf(r.visiteurs)} <span className="text-[12px] text-muted-foreground">· {pct(r.part_pct)}</span></span>
              </div>
            ))}
            <p className="text-[12px] text-muted-foreground">Mesuré depuis le 21/11/2026 : les visites plus anciennes sont « non détecté ».</p>
          </div>
          <div id="sources" className="flex flex-col gap-3 rounded-[20px] border border-border bg-card p-6 shadow-soft">
            <p className="text-[12px] uppercase tracking-[0.08em] text-muted-foreground">Sources de trafic</p>
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap text-[14px] tabular-nums [&_td]:px-1.5 [&_th]:px-1.5">
                <thead><tr className="text-[12px] text-muted-foreground">
                  <th className="py-2 text-left font-medium">Source</th><th className="text-right font-medium">Visiteurs</th><th className="text-right font-medium">Part</th>
                  <th className="text-right font-medium">Démarrages</th><th className="text-right font-medium">Faire-part</th>
                </tr></thead>
                <tbody>
                  {d.sources.length === 0 && <tr><td colSpan={5} className="py-3 text-muted-foreground">Aucune visite sur la période.</td></tr>}
                  {d.sources.map((r) => (
                    <tr key={r.source} className="border-t border-border">
                      <td className="py-2">{SRC[r.source] || r.source}</td><td className="text-right">{nf(r.visiteurs)}</td><td className="text-right">{pct(r.part_pct)}</td>
                      <td className="text-right">{nf(r.demarres)}</td><td className="text-right">{nf(r.faire_part)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Section>

      <Section id="tunnel" title="Tunnel">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card id="r-demarrage" label="Taux de démarrage" value={pct(a.taux_demarrage)}>Démarrés ÷ visiteurs · <Evo k="taux_demarrage" a={a} b={b} /></Card>
          <Card id="r-finalisation" label="Taux de finalisation" value={pct(a.taux_finalisation)}>Terminés ÷ démarrés · <Evo k="taux_finalisation" a={a} b={b} /></Card>
          <Card id="r-ouverture" label="Taux d’ouverture de compte" value={pct(a.taux_ouverture)}>Comptes ÷ terminés · <Evo k="taux_ouverture" a={a} b={b} /></Card>
          <Card id="r-transformation" label="Taux de transformation" value={pct(a.taux_transformation)}>Comptes ÷ visiteurs · <Evo k="taux_transformation" a={a} b={b} /></Card>
        </div>
        <Funnel k={a} />
      </Section>

      <Section id="apres-publication" title="Après publication">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card id="a-ouvertures" label="Ouvertures de faire-part" value={nf(a.ouvertures_invites)}>Invités distincts · <Evo k="ouvertures_invites" a={a} b={b} /></Card>
          <Card id="a-rsvp" label="Réponses RSVP" value={nf(a.reponses_rsvp)}>Taux de réponse {pct(a.taux_reponse_invites)}</Card>
          <Card id="a-viral" label="Faire-part venus d’un faire-part" value={nf(a.faire_part_viraux)}>Créés via « Créez le vôtre »</Card>
        </div>
      </Section>

      <details id="definitions" className="text-[13px] text-muted-foreground">
        <summary className="cursor-pointer text-foreground">Définitions des indicateurs</summary>
        <dl className="mt-2 flex flex-col gap-2">
          <div><dt className="text-foreground">Visiteur unique</dt><dd>Personne distincte (empreinte de son adresse IP) ayant ouvert l’accueil. Mesure interne, sans cookie ; « Do Not Track » non compté.</dd></div>
          <div><dt className="text-foreground">Durée de session</dt><dd>Temps passé page visible, plus longue valeur par visiteur et par jour. Mesurée depuis le 25/11/2026.</dd></div>
          <div><dt className="text-foreground">Démarré · Terminé</dt><dd>A saisi les prénoms dans l’éditeur · est arrivé au moment de publier (écran de connexion ou publication directe).</dd></div>
          <div><dt className="text-foreground">Comptes, faire-part créés</dt><dd>Inscriptions et publications de la période, y compris celles supprimées depuis.</dd></div>
          <div><dt className="text-foreground">Évolution</dt><dd>Écart avec la période de même durée juste avant : % pour les volumes, points pour les taux. Jours de minuit à minuit, heure de Paris.</dd></div>
        </dl>
      </details>
    </div>
  );
}

export function AdminDashboard() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [preset, setPreset] = useState<Preset>("30");
  const [period, setPeriod] = useState(() => range("30"));
  const [data, setData] = useState<AdminData | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "denied" | "error">("idle");

  const load = useCallback(async (p: { from: string; to: string }) => {
    setState("loading");
    try { setData(await api.adminDashboard(p.from, p.to)); setState("idle"); }
    catch (e) {
      const err = e as ApiError;
      if (err?.signedOut) { setUser(null); return; }
      setState(err?.notAdmin ? "denied" : "error");
    }
  }, []);

  useEffect(() => {
    if (window.top !== window.self) { document.body.textContent = ""; return; }
    consumeRedirect();
    setUser(auth.user());
  }, []);
  useEffect(() => { if (user) load(period); }, [user, period, load]);

  const valid = useMemo(() => /^\d{4}-\d{2}-\d{2}$/.test(period.from) && /^\d{4}-\d{2}-\d{2}$/.test(period.to) && period.from <= period.to, [period]);
  const signOut = async () => { await auth.signOut(); setUser(null); setData(null); };

  if (user === undefined) return <Shell user={null}><Loading /></Shell>;
  if (!user) {
    return (
      <Shell user={null}>
        <section id="signin" className="mx-auto mt-6 w-full max-w-[440px] rounded-[28px] border border-white/60 bg-card p-7 shadow-float sm:mt-14">
          <AuthPanel title="Tableau de bord" text="Espace réservé à l’administrateur de Maison Meli." noSignup
            returnTo={location.href.split("#")[0].split("?")[0]} onSignedIn={(u) => setUser(u)} />
        </section>
      </Shell>
    );
  }
  if (state === "denied") {
    return (
      <Shell user={user} onSignOut={signOut}>
        <section id="denied" className="mx-auto mt-14 max-w-[480px] text-center">
          <h1 className="font-serif text-[40px]">Accès réservé</h1>
          <p className="t-lead mt-3">Ce compte n’a pas accès au tableau de bord.</p>
          <a href="/" className="mt-6 inline-block underline underline-offset-4">Retour à l’accueil</a>
        </section>
      </Shell>
    );
  }
  return (
    <Shell user={user} onSignOut={signOut}>
      <div className="flex flex-col gap-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <h1 id="admin-dash-title" className="t-display !text-[clamp(40px,5vw,60px)]">Tableau de bord</h1>
          <div id="periode" className="flex flex-wrap items-end gap-3 text-[13px] text-muted-foreground">
            <label className="flex flex-col gap-1">Période
              <select id="preset" value={preset} className="h-10 rounded-xl border border-border bg-card px-3 text-[15px] text-foreground"
                onChange={(e) => { const v = e.target.value as Preset; setPreset(v); if (v !== "perso") setPeriod(range(v)); }}>
                <option value="7">7 derniers jours</option>
                <option value="30">30 derniers jours</option>
                <option value="90">90 derniers jours</option>
                <option value="mois">Ce mois-ci</option>
                <option value="tout">Depuis le lancement</option>
                <option value="perso">Personnalisée</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">Du
              <input id="d-from" type="date" min="2026-10-01" max={period.to} value={period.from} className="h-10 rounded-xl border border-border bg-card px-3 text-[15px] text-foreground"
                onChange={(e) => { if (e.target.value && e.target.validity.valid) { setPreset("perso"); setPeriod((p) => ({ ...p, from: e.target.value })); } }} />
            </label>
            <label className="flex flex-col gap-1">Au
              <input id="d-to" type="date" min={period.from} max={iso(new Date())} value={period.to} className="h-10 rounded-xl border border-border bg-card px-3 text-[15px] text-foreground"
                onChange={(e) => { if (e.target.value && e.target.validity.valid) { setPreset("perso"); setPeriod((p) => ({ ...p, to: e.target.value })); } }} />
            </label>
            <Button id="refresh" variant="outline" size="icon" aria-label="Actualiser" disabled={!valid || state === "loading"} onClick={() => load(period)}>
              <RefreshCw className={cn("size-4", state === "loading" && "animate-spin")} />
            </Button>
          </div>
        </header>
        {state === "error" && <p id="admin-error" className="rounded-2xl border border-border bg-card p-4 text-[15px]">Les chiffres n’ont pas pu se charger. Réessayez avec le bouton Actualiser.</p>}
        {!data && state === "loading" && <Loading />}
        {data && <div className={cn("transition-opacity", state === "loading" && "opacity-50")}><Board d={data} /></div>}
      </div>
    </Shell>
  );
}

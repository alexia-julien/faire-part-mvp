"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { api, type AdminAccount, type AdminData, type AdminFeedback, type AdminFeedbackItem, type AdminInvitation, type AdminKpis, type ApiError, type FeedbackStatus } from "@/lib/api";
import { markAdminDevice } from "@/lib/track";
import { Switch } from "@/components/ui/switch";
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

function Card({ id, label, value, children, big, onClick, active }: { id: string; label: string; value: string; children?: React.ReactNode; big?: boolean; onClick?: () => void; active?: boolean }) {
  const body = (
    <>
      <span className="text-[12px] uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
      <span className={cn("font-serif leading-none tabular-nums", big ? "text-[56px]" : "text-[36px]")}>{value}</span>
      {children && <span className="text-[13px] text-muted-foreground tabular-nums">{children}</span>}
      {onClick && <span className="mt-1 text-[13px] font-medium text-foreground underline underline-offset-4">{active ? "Masquer le détail" : "Voir le détail"}</span>}
    </>
  );
  const cls = cn("flex min-w-0 flex-col gap-1.5 rounded-[20px] border bg-card text-left shadow-soft", big ? "p-7" : "p-5", active ? "border-foreground" : "border-border");
  if (onClick) return <button id={id} type="button" aria-expanded={active} onClick={onClick} className={cn(cls, "cursor-pointer transition-colors hover:border-foreground/50")}>{body}</button>;
  return <div id={id} className={cls}>{body}</div>;
}

const when = (s: string | null) => (s ? new Date(s).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
const names = (a: string | null, b: string | null) => (a || b ? [a, b].filter(Boolean).join(" & ") : "Prénoms inconnus (supprimé)");

function StatusBadge({ excluded, admin }: { excluded: boolean; admin?: boolean }) {
  return (
    <span className={cn("inline-block rounded-full px-2 py-0.5 text-[12px]", excluded ? "bg-muted text-muted-foreground" : "bg-emerald-50 text-emerald-800")}>
      {admin ? "Vous (admin)" : excluded ? "Exclu" : "Compté"}
    </span>
  );
}

// Détail cliquable des comptes ou des faire-part de la période, avec exclusion à la ligne.
function Detail({ kind, period, exclude, onChanged }: { kind: "comptes" | "faire_part"; period: { from: string; to: string }; exclude: boolean; onChanged: () => void }) {
  const [rows, setRows] = useState<AdminAccount[] | AdminInvitation[] | null>(null);
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState("");
  const fetchRows = useCallback(async () => {
    try { setErr(false); setRows(kind === "comptes" ? await api.adminAccounts(period.from, period.to) : await api.adminInvitations(period.from, period.to, exclude)); }
    catch { setErr(true); }
  }, [kind, period, exclude]);
  useEffect(() => { fetchRows(); }, [fetchRows]);
  const toggle = async (k: "account" | "slug", id: string, excluded: boolean) => {
    setBusy(id);
    try { await api.adminSetExclusion(k, id, excluded); await fetchRows(); onChanged(); } catch { setErr(true); }
    setBusy("");
  };
  const btn = (k: "account" | "slug", id: string, excluded: boolean) => (
    <Button size="sm" variant="outline" disabled={busy === id} onClick={() => toggle(k, id, !excluded)}>{excluded ? "Réintégrer" : "Exclure"}</Button>
  );
  return (
    <div id={kind === "comptes" ? "detail-comptes" : "detail-faire-part"} className="rounded-[20px] border border-border bg-card p-5 shadow-soft">
      <p className="mb-3 text-[12px] uppercase tracking-[0.08em] text-muted-foreground">{kind === "comptes" ? "Comptes créés sur la période" : "Faire-part créés sur la période"}</p>
      {err && <p className="text-[14px] text-muted-foreground">Le détail n’a pas pu se charger.</p>}
      {!rows && !err && <p className="text-[14px] text-muted-foreground">Chargement…</p>}
      {rows && rows.length === 0 && <p className="text-[14px] text-muted-foreground">Rien sur la période.</p>}
      {rows && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-[14px] tabular-nums [&_td]:px-2 [&_td]:py-2.5 [&_th]:px-2 [&_th]:pb-2">
            {kind === "comptes" ? (
              <>
                <thead><tr className="text-left text-[12px] text-muted-foreground">
                  <th className="font-medium">E-mail</th><th className="font-medium">Créé le</th><th className="font-medium">Connexion</th>
                  <th className="font-medium">Dernière connexion</th><th className="font-medium">Faire-part</th><th className="font-medium">Statut</th><th></th>
                </tr></thead>
                <tbody>
                  {(rows as AdminAccount[]).map((r) => (
                    <tr key={r.id} className={cn("border-t border-border", r.excluded && "text-muted-foreground")}>
                      <td className="font-medium">{r.email || "—"}</td><td>{when(r.created_at)}</td><td>{r.provider === "google" ? "Google" : "Code e-mail"}</td>
                      <td>{when(r.last_sign_in_at)}</td><td>{r.faire_part?.length ? r.faire_part.map((f) => names(f.partner1, f.partner2)).join(", ") : "—"}</td>
                      <td><StatusBadge excluded={r.excluded} admin={r.admin} /></td><td className="text-right">{!r.admin && btn("account", r.id, r.excluded)}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            ) : (
              <>
                <thead><tr className="text-left text-[12px] text-muted-foreground">
                  <th className="font-medium">Faire-part</th><th className="font-medium">Mariage</th><th className="font-medium">Créé le</th><th className="font-medium">Compte</th>
                  <th className="text-right font-medium" title="Invités distincts sur la période, hors créateur du faire-part">Ouvertures invités</th><th className="text-right font-medium">Réponses</th><th className="font-medium">Statut</th><th></th>
                </tr></thead>
                <tbody>
                  {(rows as AdminInvitation[]).map((r) => (
                    <tr key={r.slug} className={cn("border-t border-border", r.excluded && "text-muted-foreground")}>
                      <td className="font-medium">{names(r.partner1, r.partner2)}<span className="block text-[12px] font-normal text-muted-foreground">{r.online ? "En ligne" : "Supprimé"} · {r.slug}</span></td>
                      <td>{r.wedding_date ? parse(r.wedding_date).toLocaleDateString("fr-FR") : "—"}</td><td>{when(r.created_at)}</td><td>{r.owner_email || "—"}</td>
                      <td className="text-right">{nf(r.ouvertures)}</td><td className="text-right">{nf(r.reponses)}</td>
                      <td><StatusBadge excluded={r.excluded} /></td>
                      <td className="text-right">{r.excluded_by_account ? <span className="text-[12px]">Exclu avec le compte</span> : btn("slug", r.slug, r.excluded)}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </table>
        </div>
      )}
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

function Board({ d, period, open, setOpen, onChanged }: { d: AdminData; period: { from: string; to: string }; open: "comptes" | "faire_part" | null; setOpen: (k: "comptes" | "faire_part" | null) => void; onChanged: () => void }) {
  const a = d.kpis.actuelle, b = d.kpis.precedente;
  const n = dayCount(d.periode.from, d.periode.to);
  const prevFrom = iso(addDays(parse(d.periode.from), -n)), prevTo = iso(addDays(parse(d.periode.from), -1));
  const maxDev = Math.max(1, ...d.appareils.map((r) => r.visiteurs));
  return (
    <div className="flex flex-col gap-12">
      <p id="resume" className="t-lead max-w-[62ch]">
        <b className="text-foreground">{nf(a.visiteurs)}</b> visiteurs uniques, <b className="text-foreground">{nf(a.comptes)}</b> comptes et{" "}
        <b className="text-foreground">{nf(a.faire_part)}</b> faire-part créés sur la période, soit <b className="text-foreground">{pct(a.taux_transformation)}</b> de visiteurs transformés en compte.
        <span className="block text-[13px] text-muted-foreground">Comparaison avec les {n} jours précédents ({short(prevFrom)} – {short(prevTo)}).
          {d.exclusion?.active ? ` Hors votre activité : ${d.exclusion.comptes} compte(s), ${d.exclusion.faire_part} faire-part et ${d.exclusion.visiteurs} réseau(x) exclus.` : " Votre propre activité est incluse."}</span>
      </p>

      <Section id="key-metrics" title="Key metrics">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card id="km-comptes" big label="Comptes créés" value={nf(a.comptes)} active={open === "comptes"} onClick={() => setOpen(open === "comptes" ? null : "comptes")}>
            <Evo k="comptes" a={a} b={b} /> · avant : {nf(b.comptes)} · total : {nf(d.totaux.comptes)}
          </Card>
          <Card id="km-faire-part" big label="Faire-part créés" value={nf(a.faire_part)} active={open === "faire_part"} onClick={() => setOpen(open === "faire_part" ? null : "faire_part")}>
            <Evo k="faire_part" a={a} b={b} /> · avant : {nf(b.faire_part)} · en ligne : {nf(d.totaux.faire_part)}
          </Card>
        </div>
        {open && <Detail key={open} kind={open} period={period} exclude={d.exclusion?.active ?? true} onChanged={onChanged} />}
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
          <Card id="a-ouvertures" label="Ouvertures de faire-part" value={nf(a.ouvertures_invites)}>Invités distincts, hors créateurs · <Evo k="ouvertures_invites" a={a} b={b} /></Card>
          <Card id="a-rsvp" label="Réponses RSVP" value={nf(a.reponses_rsvp)}>Taux de réponse {pct(a.taux_reponse_invites)}</Card>
          <Card id="a-viral" label="Faire-part venus d’un faire-part" value={nf(a.faire_part_viraux)}>Créés via « Créez le vôtre »</Card>
        </div>
      </Section>

      <details id="definitions" className="text-[13px] text-muted-foreground">
        <summary className="cursor-pointer text-foreground">Définitions des indicateurs</summary>
        <dl className="mt-2 flex flex-col gap-2">
          <div><dt className="text-foreground">Visiteur unique</dt><dd>Personne distincte (empreinte de son adresse IP) ayant ouvert l’accueil. Mesure interne, sans cookie ; « Do Not Track » non compté.</dd></div>
          <div><dt className="text-foreground">Durée de session</dt><dd>Temps passé page visible, plus longue valeur par visiteur et par jour. Mesurée depuis le 25/11/2026.</dd></div>
          <div><dt className="text-foreground">Ouverture de faire-part</dt><dd>Invité distinct (réseau) ayant ouvert un faire-part sur la période. Les ouvertures du créateur du faire-part (même réseau que sa création ou sa gestion) ne comptent pas, ni, si l’exclusion est active, les vôtres.</dd></div>
          <div><dt className="text-foreground">Démarré · Terminé</dt><dd>A saisi les prénoms dans l’éditeur · est arrivé au moment de publier (écran de connexion ou publication directe).</dd></div>
          <div><dt className="text-foreground">Comptes, faire-part créés</dt><dd>Inscriptions et publications de la période, y compris celles supprimées depuis.</dd></div>
          <div><dt className="text-foreground">Évolution</dt><dd>Écart avec la période de même durée juste avant : % pour les volumes, points pour les taux. Jours de minuit à minuit, heure de Paris.</dd></div>
        </dl>
      </details>
    </div>
  );
}

// ---------------------------------------------------------------- Retours utilisateurs (26/11/2026)
const KIND_LABEL: Record<string, string> = { rating: "Note", bug: "Bug", unhappy: "Mécontentement", idea: "Idée" };
const STATUS_LABEL: Record<FeedbackStatus, string> = { new: "Nouveau", in_progress: "En cours", done: "Réglé" };
function ctxLine(c: Record<string, unknown>) {
  const s = (k: string) => (typeof c[k] === "string" || typeof c[k] === "number" ? String(c[k]) : "");
  return [s("page"), DEV[s("device")] || s("device"), s("vw") && s("vh") ? s("vw") + "×" + s("vh") + " px" : "", s("step") ? "étape « " + s("step") + " »" : "", c.editing === true ? "modification" : ""].filter(Boolean).join(" · ");
}

function FeedbackSection({ period, exclude }: { period: { from: string; to: string }; exclude: boolean }) {
  const [d, setD] = useState<AdminFeedback | null>(null);
  const [err, setErr] = useState(false);
  const [filter, setFilter] = useState<"tout" | "notes" | "signalements" | "a_traiter">("tout");
  const [busy, setBusy] = useState<number | null>(null);
  const fetchIt = useCallback(async () => {
    try { setErr(false); setD(await api.adminFeedback(period.from, period.to, exclude)); } catch { setErr(true); }
  }, [period, exclude]);
  useEffect(() => { fetchIt(); }, [fetchIt]);
  const setStatus = async (it: AdminFeedbackItem, st: FeedbackStatus) => {
    setBusy(it.id);
    try { await api.adminSetFeedbackStatus(it.id, st); await fetchIt(); } catch { setErr(true); }
    setBusy(null);
  };
  const items = (d?.items || []).filter((it) =>
    filter === "notes" ? it.kind === "rating" : filter === "signalements" ? it.kind !== "rating" : filter === "a_traiter" ? it.kind !== "rating" && it.status !== "done" : true);
  const maxN = Math.max(1, ...(d?.notes.repartition || [0]));
  return (
    <Section id="retours" title="Retours">
      {err && <p className="text-[14px] text-muted-foreground">Les retours n’ont pas pu se charger.</p>}
      {!d && !err && <p className="text-[14px] text-muted-foreground">Chargement…</p>}
      {d && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card id="f-note" label="Note moyenne de la création" value={d.notes.moyenne == null ? "—" : nf(d.notes.moyenne, 1) + " /10"}>
              {nf(d.notes.nombre)} note{d.notes.nombre > 1 ? "s" : ""} sur la période
            </Card>
            <Card id="f-signalements" label="Signalements" value={nf(d.signalements)}>Bugs, mécontentements et idées</Card>
            <Card id="f-a-traiter" label="À traiter" value={nf(d.a_traiter)}>Signalements pas encore réglés</Card>
          </div>
          {d.notes.nombre > 0 && (
            <div id="f-repartition" className="rounded-[20px] border border-border bg-card p-6 shadow-soft">
              <p className="mb-4 text-[12px] uppercase tracking-[0.08em] text-muted-foreground">Répartition des notes</p>
              <div className="grid grid-cols-11 items-end gap-1.5" style={{ height: 120 }}>
                {d.notes.repartition.map((n, i) => (
                  <div key={i} className="flex h-full flex-col items-center justify-end gap-1" title={`${i}/10 : ${n}`}>
                    <span className="text-[11px] tabular-nums text-muted-foreground">{n || ""}</span>
                    <div className={cn("w-full rounded-t-md", i <= 6 ? "bg-red-300" : i <= 8 ? "bg-amber-300" : "bg-emerald-400")} style={{ height: `${(n / maxN) * 80}px`, minHeight: n ? 4 : 1 }} />
                  </div>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-11 gap-1.5 text-center text-[11px] tabular-nums text-muted-foreground">{d.notes.repartition.map((_, i) => <span key={i}>{i}</span>)}</div>
            </div>
          )}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer les retours">
            {([["tout", "Tout"], ["a_traiter", "À traiter"], ["signalements", "Signalements"], ["notes", "Notes"]] as const).map(([v, l]) => (
              <Button key={v} size="sm" variant={filter === v ? "default" : "outline"} aria-pressed={filter === v} data-filter={v} onClick={() => setFilter(v)}>{l}</Button>
            ))}
          </div>
          <div id="f-liste" className="flex flex-col gap-3">
            {items.length === 0 && <p className="text-[14px] text-muted-foreground">Aucun retour sur la période.</p>}
            {items.map((it) => {
              const errs = Array.isArray(it.context?.errors) ? (it.context.errors as unknown[]).map(String) : [];
              return (
                <article key={it.id} data-feedback={it.kind} className={cn("rounded-[20px] border border-border bg-card p-5 shadow-soft", it.excluded && "opacity-60")}>
                  <div className="flex flex-wrap items-center gap-2 text-[13px]">
                    <span className={cn("rounded-full px-2.5 py-0.5 font-medium",
                      it.kind === "rating" ? (it.score! <= 6 ? "bg-red-50 text-red-800" : it.score! <= 8 ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800")
                        : it.kind === "bug" ? "bg-red-50 text-red-800" : it.kind === "unhappy" ? "bg-amber-50 text-amber-800" : "bg-sky-50 text-sky-800")}>
                      {it.kind === "rating" ? `Note ${it.score}/10` : KIND_LABEL[it.kind]}
                    </span>
                    <span className="text-muted-foreground">{when(it.updated_at)}</span>
                    {it.email ? <a href={"mailto:" + it.email} className="font-medium underline underline-offset-4">{it.email}</a> : <span className="text-muted-foreground">Sans e-mail</span>}
                    <span className="text-muted-foreground">{it.account ? "· avec compte" : "· sans compte"}</span>
                    {it.excluded && <StatusBadge excluded />}
                    {it.kind !== "rating" && (
                      <select aria-label="Statut" value={it.status} disabled={busy === it.id} onChange={(e) => setStatus(it, e.target.value as FeedbackStatus)}
                        className="ml-auto h-9 rounded-xl border border-border bg-card px-2 text-[14px]">
                        {(Object.keys(STATUS_LABEL) as FeedbackStatus[]).map((k) => <option key={k} value={k}>{STATUS_LABEL[k]}</option>)}
                      </select>
                    )}
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">{it.message || <span className="italic text-muted-foreground">Sans commentaire</span>}</p>
                  <p className="mt-2 text-[12px] text-muted-foreground">{[ctxLine(it.context || {}), it.slug].filter(Boolean).join(" · ")}</p>
                  {(errs.length > 0 || typeof it.context?.ua === "string") && (
                    <details className="mt-1 text-[12px] text-muted-foreground">
                      <summary className="cursor-pointer">Détails techniques</summary>
                      {typeof it.context?.ua === "string" && <p className="mt-1 break-all">{String(it.context.ua)}</p>}
                      {errs.map((e, i) => <p key={i} className="mt-1 break-all font-mono">{e}</p>)}
                    </details>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}
    </Section>
  );
}

export function AdminDashboard() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [preset, setPreset] = useState<Preset>("30");
  const [period, setPeriod] = useState(() => range("30"));
  const [data, setData] = useState<AdminData | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "denied" | "error">("idle");
  const [exclude, setExclude] = useState(true);
  const [open, setOpen] = useState<"comptes" | "faire_part" | null>(null);

  const load = useCallback(async (p: { from: string; to: string }, ex: boolean) => {
    setState("loading");
    try { setData(await api.adminDashboard(p.from, p.to, ex)); setState("idle"); markAdminDevice(); }
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
  useEffect(() => { if (user) load(period, exclude); }, [user, period, exclude, load]);

  const valid = useMemo(() => /^\d{4}-\d{2}-\d{2}$/.test(period.from) && /^\d{4}-\d{2}-\d{2}$/.test(period.to) && period.from <= period.to, [period]);
  const signOut = async () => { await auth.signOut(); setUser(null); setData(null); };

  if (user === undefined) return <Shell user={null} report={false}><Loading /></Shell>;
  if (!user) {
    return (
      <Shell user={null} report={false}>
        <section id="signin" className="mx-auto mt-6 w-full max-w-[440px] rounded-[28px] border border-white/60 bg-card p-7 shadow-float sm:mt-14">
          <AuthPanel title="Tableau de bord" text="Espace réservé à l’administrateur de Maison Meli." noSignup
            returnTo={location.href.split("#")[0].split("?")[0]} onSignedIn={(u) => setUser(u)} />
        </section>
      </Shell>
    );
  }
  if (state === "denied") {
    return (
      <Shell user={user} onSignOut={signOut} report={false}>
        <section id="denied" className="mx-auto mt-14 max-w-[480px] text-center">
          <h1 className="font-serif text-[40px]">Accès réservé</h1>
          <p className="t-lead mt-3">Ce compte n’a pas accès au tableau de bord.</p>
          <a href="/" className="mt-6 inline-block underline underline-offset-4">Retour à l’accueil</a>
        </section>
      </Shell>
    );
  }
  return (
    <Shell user={user} onSignOut={signOut} report={false}>
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
            <label className="flex h-10 items-center gap-2 text-[14px] text-foreground">
              <Switch id="exclude" checked={exclude} onCheckedChange={setExclude} aria-label="Exclure mon activité" />Exclure mon activité
            </label>
            <Button id="refresh" variant="outline" size="icon" aria-label="Actualiser" disabled={!valid || state === "loading"} onClick={() => load(period, exclude)}>
              <RefreshCw className={cn("size-4", state === "loading" && "animate-spin")} />
            </Button>
          </div>
        </header>
        {state === "error" && <p id="admin-error" className="rounded-2xl border border-border bg-card p-4 text-[15px]">Les chiffres n’ont pas pu se charger. Réessayez avec le bouton Actualiser.</p>}
        {!data && state === "loading" && <Loading />}
        {data && <div className={cn("transition-opacity", state === "loading" && "opacity-50")}><Board d={data} period={period} open={open} setOpen={setOpen} onChanged={() => load(period, exclude)} /></div>}
        {data && valid && <FeedbackSection period={period} exclude={exclude} />}
      </div>
    </Shell>
  );
}

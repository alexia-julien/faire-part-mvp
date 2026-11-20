"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, m as motion } from "motion/react";
import { ArrowDown, ArrowUp, Download, ExternalLink, Mail, PencilLine, RefreshCw, Search, Trash2, Utensils } from "lucide-react";
import { toast } from "sonner";
import { api, cleanupLegacy, publicLink, userError, type ApiError, type RsvpRow } from "@/lib/api";
import { auth, consumeRedirect, type User } from "@/lib/auth";
import { downloadBlob, EMAIL_RE, eventInstant, formatDate, longDate, parseDate, sanitizeConfig, type Config } from "@/lib/invitation";
import { copyText } from "@/lib/share";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { NumberTicker } from "@/components/magic/number-ticker";
import { BlurFade } from "@/components/magic/blur-fade";
import { MiniCard } from "@/components/invitation/mini-card";
import { AuthPanel } from "./auth-panel";
import { ShareKit } from "./share-kit";

// « Mon faire-part » : le faire-part du compte connecté et les réponses de ses invités. Sans session : connexion.
// Les réponses viennent d'inconnus : on ne fait jamais confiance à leur forme, même si le serveur les filtre aussi.
type Row = RsvpRow & { superseded?: boolean };
const txt = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const int = (v: unknown, min: number, max: number, def: number) => { const n = Number(v); return isFinite(n) && n >= min && n <= max ? Math.floor(n) : def; };
const adults = (d: Record<string, unknown>) => (d.attendance === "yes" ? int(d.guests, 1, 20, 1) : 0);
const kids = (d: Record<string, unknown>) => (d.attendance === "yes" ? int(d.children, 0, 20, 0) : 0);
const yn = (v: unknown) => (v === "yes" ? "Oui" : v === "no" ? "Non" : "");
const pl = (n: number, one: string, many: string) => (n > 1 ? many : one); // en français : 0 et 1 au singulier
const fmt = (iso: string) => { const d = new Date(iso); return isNaN(+d) ? "" : d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); };
const norm = (s: unknown) => txt(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

// Doublons : un invité qui répond deux fois (même navigateur, ou même nom) ; seule la dernière réponse compte.
function markDuplicates(rows: Row[]): Row[] {
  const seen: Record<string, boolean> = {};
  const out = rows.map((r) => ({ ...r, superseded: false }));
  for (let i = out.length - 1; i >= 0; i--) {
    const d = out[i].data, keys: string[] = [];
    if (/^[a-z0-9]{12,32}$/.test(txt(d.rid))) keys.push("r:" + d.rid);
    if (norm(d.name)) keys.push("n:" + norm(d.name));
    if (keys.some((k) => seen[k])) out[i].superseded = true;
    keys.forEach((k) => { seen[k] = true; });
  }
  return out;
}

type Col = { id: string; label: string; sticky?: boolean; wide?: boolean; show?: boolean; sort?: (r: Row) => string | number; get: (r: Row) => string };
function columns(cfg: Config | null, rows: Row[]): Col[] {
  const q = cfg?.rsvp;
  const has = (fn: (d: Record<string, unknown>) => unknown) => rows.some((r) => !!fn(r.data));
  const C: Col[] = [
    { id: "name", label: "Nom", sticky: true, sort: (r) => norm(r.data.name), get: (r) => txt(r.data.name) },
    { id: "att", label: "Présence", sort: (r) => (r.data.attendance === "yes" ? 0 : 1), get: (r) => yn(r.data.attendance) },
    { id: "guests", label: q?.children ? "Adultes" : "Pers.", show: !!q?.guests || has((d) => adults(d) > 1), sort: (r) => adults(r.data), get: (r) => (r.data.attendance === "yes" ? String(adults(r.data)) : "") },
    { id: "children", label: "Enfants", show: !!q?.children || has((d) => kids(d) > 0), sort: (r) => kids(r.data), get: (r) => (r.data.attendance === "yes" ? String(kids(r.data)) : "") },
    { id: "companions", label: "Accompagnants", wide: true, show: !!q?.companions || has((d) => txt(d.companions)), get: (r) => txt(r.data.companions) },
    { id: "brunch", label: "Brunch", show: !!q?.brunch || has((d) => d.brunch), get: (r) => (r.data.attendance === "yes" ? yn(r.data.brunch) : "") },
    { id: "diet", label: "Régime", wide: true, show: !!q?.diet || has((d) => txt(d.diet)), get: (r) => txt(r.data.diet) },
    { id: "email", label: "Email", show: !!q?.email || has((d) => txt(d.email)), get: (r) => txt(r.data.email) },
    { id: "phone", label: "Téléphone", show: !!q?.phone || has((d) => txt(d.phone)), get: (r) => txt(r.data.phone) },
    { id: "address", label: "Adresse", wide: true, show: !!q?.address || has((d) => txt(d.address)), get: (r) => txt(r.data.address) },
    { id: "custom", label: q?.customLabel || "Question perso.", wide: true, show: !!q?.customLabel || has((d) => txt(d.custom)), get: (r) => txt(r.data.custom) },
    { id: "message", label: "Message", wide: true, show: !!q?.message || has((d) => txt(d.message)), get: (r) => txt(r.data.message) },
    { id: "date", label: "Reçu le", sort: (r) => r.created_at || "", get: (r) => fmt(r.created_at) },
  ];
  return C.filter((c) => c.show === undefined || c.show);
}
const csvCell = (v: unknown) => { let s = txt(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; }; // pas de formule Excel
function validEmails(list: Row[]) {
  const out: string[] = [];
  list.forEach((r) => { const e = txt(r.data.email).trim(); if (EMAIL_RE.test(e) && !out.includes(e.toLowerCase())) out.push(e.toLowerCase()); });
  return out;
}

type Data = { slug: string; cfg: Config; rows: Row[] } | null;

export function Dashboard() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [data, setData] = useState<Data | undefined>(undefined);
  const [err, setErr] = useState("");
  const [view, setView] = useState({ filter: "all", q: "", sort: "date", dir: -1, replaced: false });
  const [confirm, setConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr("");
    try {
      const [inv, list] = await Promise.all([api.myInvitation(), api.listRsvps()]);
      if (!inv) { setData(null); return; }
      const rows = (Array.isArray(list) ? list : []).filter((r) => r && r.data && typeof r.data === "object");
      const cfg = sanitizeConfig(inv.config);
      document.title = "Suivi des réponses — " + cfg.partner1 + " & " + cfg.partner2;
      setData({ slug: inv.slug, cfg, rows });
    } catch (e) {
      if ((e as ApiError)?.signedOut) { setUser(null); return; }
      setErr(userError(e)); setData(undefined);
    }
  }, []);

  useEffect(() => {
    if (window.top !== window.self) { document.body.textContent = ""; return; }
    cleanupLegacy(); consumeRedirect();
    const u = auth.user(); setUser(u);
    if (u) load();
  }, [load]);
  useEffect(() => { if (!confirm) return; const t = setTimeout(() => setConfirm(null), 5000); return () => clearTimeout(t); }, [confirm]);

  const rows = useMemo(() => (data ? markDuplicates(data.rows) : []), [data]);
  const live = rows.filter((r) => !r.superseded);
  const cols = useMemo(() => columns(data?.cfg || null, rows), [data, rows]);

  if (user === undefined) return <Shell user={null}><Loading /></Shell>;
  if (!user) {
    return (
      <Shell user={null}>
        <section id="signin" className="mx-auto mt-6 w-full max-w-[440px] rounded-[28px] border border-white/60 bg-card p-7 shadow-float sm:mt-14">
          <AuthPanel title="Mon faire-part" text="Connectez-vous pour retrouver votre faire-part et les réponses de vos invités."
            returnTo={location.href.split("#")[0].split("?")[0]} onSignedIn={(u) => { setUser(u); load(); }} />
        </section>
      </Shell>
    );
  }
  const signOut = () => auth.signOut().then(() => location.replace("/"));

  if (err) return <Shell user={user} onSignOut={signOut}><p id="state" role="status" className="py-20 text-center text-muted-foreground">{err}</p></Shell>;
  if (data === undefined) return <Shell user={user} onSignOut={signOut}><Loading /></Shell>;

  const danger = (
    <section id="danger" aria-labelledby="danger-title" className="mt-20 border-t border-border pt-8">
      <h2 id="danger-title" className="text-[15px] font-medium">Suppression</h2>
      <p className="mt-1 text-[14px] text-muted-foreground">Ces actions sont définitives et immédiates.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {data && <TwoStep id="delete-invitation" label="Supprimer mon faire-part et ses réponses" confirmLabel="Confirmer : le lien envoyé aux invités ne fonctionnera plus" confirm={confirm} setConfirm={setConfirm}
          run={async () => { await api.deleteInvitation(); toast.success("Faire-part supprimé."); load(); }} onSignedOut={() => setUser(null)} />}
        <TwoStep id="delete-account" label="Supprimer mon compte" confirmLabel="Confirmer : compte, faire-part et réponses seront effacés" confirm={confirm} setConfirm={setConfirm}
          run={async () => { await api.deleteAccount(); location.replace("/"); }} onSignedOut={() => setUser(null)} />
      </div>
    </section>
  );

  if (!data) {
    return (
      <Shell user={user} onSignOut={signOut}>
        <div id="none" className="mx-auto flex max-w-md flex-col items-center gap-6 py-16 text-center">
          <div className="w-40 rotate-[-4deg]"><MiniCard cfg={sanitizeConfig({ partner1: "Vous", partner2: "Moi", theme: "sauge", font: "classique", decor: "feuillage", intro: "enveloppe", texture: true })} className="rounded-[14px] shadow-lift" /></div>
          <h1 className="t-section">Aucun <span className="whitespace-nowrap">faire-part</span> pour l’instant</h1>
          <p className="t-lead">Créez-le en quelques minutes : les réponses de vos invités arriveront ensuite ici.</p>
          <Button asChild size="lg"><a href="/creer/">Créer mon faire-part</a></Button>
        </div>
        {danger}
      </Shell>
    );
  }

  const { slug, cfg } = data;
  const url = publicLink(slug);
  const yes = live.filter((r) => r.data.attendance === "yes"), no = live.filter((r) => r.data.attendance === "no");
  const nA = yes.reduce((s, r) => s + adults(r.data), 0), nK = yes.reduce((s, r) => s + kids(r.data), 0);
  const hasCol = (id: string) => cols.some((c) => c.id === id);
  const present = hasCol("guests") || hasCol("children") ? nA + nK : yes.length;
  const target = eventInstant(cfg), days = target ? Math.max(0, Math.ceil((target - Date.now()) / 864e5)) : null;
  const diets = yes.filter((r) => txt(r.data.diet).trim());
  const dups = rows.length - live.length;
  const emails = validEmails(live);
  const dl = parseDate(cfg.rsvp.deadline), wd = formatDate(cfg, false);

  const q = norm(view.q), col = cols.find((c) => c.id === view.sort) || cols[0];
  const list = rows.filter((r) => {
    if (r.superseded && !view.replaced) return false;
    if (view.filter !== "all" && r.data.attendance !== view.filter) return false;
    if (!q) return true;
    return [r.data.name, r.data.companions, r.data.email, r.data.phone].some((v) => norm(v).includes(q));
  }).sort((a, b) => {
    const x = (col.sort || col.get)(a), y = (col.sort || col.get)(b);
    return (x < y ? -1 : x > y ? 1 : 0) * view.dir || (a.id - b.id) * -1;
  });
  const filtered = view.filter !== "all" || !!view.q, shown = view.replaced ? rows.length : live.length;

  function exportCsv() {
    const lines = [cols.map((c) => csvCell(c.label)).join(";")].concat(live.map((r) => cols.map((c) => csvCell(c.get(r))).join(";")));
    downloadBlob(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }), "reponses-" + slug + ".csv");
  }
  async function copyEmails() {
    if (await copyText(emails.join(", "))) toast.success(emails.length + " " + pl(emails.length, "adresse copiée", "adresses copiées") + " : collez-les dans le champ « Cci » de votre email.");
    else toast.error("Copie automatique impossible.");
  }
  async function del(r: Row) {
    try { await api.deleteRsvp(r.id); setData((d) => d && { ...d, rows: d.rows.filter((x) => x.id !== r.id) }); setConfirm(null); }
    catch (e) { if ((e as ApiError)?.signedOut) setUser(null); else toast.error(userError(e)); }
  }

  const tiles: [string, number, string, string?][] = [
    ["present", present, pl(present, "personne présente", "personnes présentes"), hasCol("children") ? `${nA} ${pl(nA, "adulte", "adultes")}, ${nK} ${pl(nK, "enfant", "enfants")}` : hasCol("guests") ? `${yes.length} ${pl(yes.length, "réponse", "réponses")}` : undefined],
    ["absent", no.length, pl(no.length, "ne viendra pas", "ne viendront pas")],
    ["total", live.length, pl(live.length, "réponse", "réponses")],
  ];
  if (hasCol("brunch")) {
    const br = yes.filter((r) => r.data.brunch === "yes").reduce((s, r) => s + adults(r.data) + kids(r.data), 0);
    tiles.push(["brunch", br, "au brunch"]);
  } else if (days != null) tiles.push(["days", days, pl(days, "jour avant le mariage", "jours avant le mariage")]);

  return (
    <Shell user={user} onSignOut={signOut}>
      <BlurFade inView={false} className="flex flex-col gap-2">
        <p className="t-label">Suivi des réponses</p>
        <h1 id="admin-title" className="t-display !text-[clamp(40px,5.4vw,64px)]">{cfg.partner1} <span className="italic text-muted-foreground">&amp;</span> {cfg.partner2}</h1>
        <p id="admin-sub" className="t-lead">{[wd ? "Mariage le " + wd : "", dl ? "réponses attendues avant le " + longDate(dl) : ""].filter(Boolean).join(" · ")}</p>
      </BlurFade>

      <div id="tiles" className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map(([id, n, label, sub], i) => (
          <BlurFade key={id} inView={false} delay={0.06 * i} className={cn("tile rounded-[20px] border border-border bg-card p-5 shadow-soft", i === 0 && tiles.length % 2 === 1 && "col-span-2 lg:col-span-1")}>
            <div className="n font-serif text-[48px] leading-none tracking-tight [font-variant-numeric:lining-nums_tabular-nums]"><NumberTicker value={n} /></div>
            <div className="l mt-2 text-[14px] text-muted-foreground">{label}{sub ? <span className="block text-[13px]">({sub})</span> : null}</div>
          </BlurFade>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild><a id="edit-link" href="/creer/"><PencilLine aria-hidden="true" /> Modifier mon faire-part</a></Button>
        <Button asChild variant="outline"><a id="open-public" href={url} target="_blank" rel="noopener"><ExternalLink aria-hidden="true" /> Voir le faire-part</a></Button>
        <Button id="csv" variant="outline" onClick={exportCsv} disabled={!rows.length}><Download aria-hidden="true" /> Exporter en CSV</Button>
        {emails.length > 0 && <Button id="copy-emails" variant="outline" onClick={copyEmails}><Mail aria-hidden="true" /> {emails.length > 1 ? `Copier les ${emails.length} emails` : "Copier l’email"}</Button>}
        <Button id="refresh" variant="ghost" onClick={load}><RefreshCw aria-hidden="true" /> Actualiser</Button>
      </div>

      <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-labelledby="h-list" className="min-w-0">
          <h2 id="h-list" className="t-section !text-[30px]">Les réponses</h2>
          {dups > 0 && (
            <p id="dup-note" className="mt-3 text-[14px] text-muted-foreground">
              {dups} {pl(dups, "invité a corrigé sa réponse", "invités ont corrigé leur réponse")} : seule la plus récente est comptée{view.replaced ? " (les anciennes sont barrées ci-dessous). " : ". "}
              <button type="button" id="toggle-replaced" className="font-medium text-foreground underline decoration-foreground/25 underline-offset-4" onClick={() => setView((v) => ({ ...v, replaced: !v.replaced }))}>
                {view.replaced ? "Masquer les anciennes réponses" : "Voir les anciennes réponses"}
              </button>
            </p>
          )}
          {rows.length === 0 ? (
            <div id="empty" className="mt-6 flex flex-col items-center gap-3 rounded-[20px] border border-dashed border-foreground/15 px-6 py-14 text-center">
              <Mail className="size-6 text-muted-foreground" aria-hidden="true" />
              <p className="font-medium">Aucune réponse pour l’instant</p>
              <p className="max-w-xs text-[14px] text-muted-foreground">Partagez le lien du faire-part : les premières réponses apparaîtront ici.</p>
            </div>
          ) : (
            <>
              <div id="toolbar" className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input id="search" type="search" placeholder="Rechercher un nom, un email…" aria-label="Rechercher une réponse" autoComplete="off" className="pl-10" value={view.q} onChange={(e) => setView((v) => ({ ...v, q: e.target.value }))} />
                </div>
                <div role="group" aria-label="Filtrer les réponses" className="flex h-12 items-center gap-1 rounded-full bg-muted p-1">
                  {[["all", "Tous"], ["yes", "Présents"], ["no", "Absents"]].map(([v, l]) => (
                    <button key={v} type="button" data-filter={v} aria-pressed={view.filter === v} onClick={() => setView((x) => ({ ...x, filter: v }))}
                      className={cn("h-10 rounded-full px-4 text-[14px] font-medium transition-[background-color,box-shadow] duration-200", view.filter === v ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground")}>{l}</button>
                  ))}
                </div>
              </div>
              {filtered && <p id="count" role="status" className="mt-3 text-[14px] text-muted-foreground">{list.length} sur {shown} {pl(shown, "réponse affichée", "réponses affichées")}</p>}
              {list.length === 0 ? <p id="no-match" className="mt-6 text-muted-foreground">Aucune réponse ne correspond à votre recherche.</p> : (
                <div id="table-wrap" className="table-wrap relative mt-4 overflow-x-auto rounded-[20px] border border-border bg-card shadow-soft">
                  <table id="table" className="rsvp-table w-full border-collapse text-left text-[14px]">
                    <thead><tr>
                      {cols.map((c) => (
                        <th key={c.id} scope="col" className={cn("whitespace-nowrap border-b border-border px-4 py-3 font-medium text-muted-foreground", c.sticky && "sticky left-0 bg-card")}
                          aria-sort={c.sort ? (view.sort === c.id ? (view.dir > 0 ? "ascending" : "descending") : "none") : undefined}>
                          {c.sort ? (
                            <button type="button" className="sort inline-flex items-center gap-1 hover:text-foreground" onClick={() => setView((v) => v.sort === c.id ? { ...v, dir: -v.dir } : { ...v, sort: c.id, dir: c.id === "date" ? -1 : 1 })}>
                              {c.label}{view.sort === c.id && (view.dir > 0 ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />)}
                            </button>
                          ) : c.label}
                        </th>
                      ))}
                      <th scope="col" className="border-b border-border px-4 py-3"><span className="sr-only">Actions</span></th>
                    </tr></thead>
                    <tbody>
                      <AnimatePresence initial={false}>
                        {list.map((r) => (
                          <motion.tr key={r.id} exit={{ opacity: 0 }} className={cn("border-b border-border last:border-0", r.superseded && "superseded text-muted-foreground line-through decoration-foreground/30")}>
                            {cols.map((c) => {
                              const v = c.get(r);
                              return (
                                <td key={c.id} data-label={c.label} data-empty={v ? undefined : ""} className={cn("px-4 py-3 align-top", c.wide && "min-w-[240px] max-w-[340px]", (c.id === "email" || c.id === "phone" || c.id === "date") && "whitespace-nowrap", c.sticky && "sticky left-0 whitespace-nowrap bg-card font-medium")}>
                                  {c.id === "att" ? <Badge variant="outline" className={cn("rounded-full px-2.5", r.data.attendance === "yes" ? "pres-yes border-[#5F6E4E]/30 bg-[#5F6E4E]/10 text-[#46533A]" : "pres-no border-foreground/10 bg-muted text-muted-foreground")}>{v}</Badge> : v}
                                  {c.id === "name" && r.superseded && <Badge variant="outline" className="badge ml-2 rounded-full no-underline">remplacée</Badge>}
                                </td>
                              );
                            })}
                            <td className="act px-4 py-3 text-right">
                              <Button variant="ghost" size="sm" className={cn("text-muted-foreground", confirm === "r" + r.id && "confirm bg-destructive/10 text-destructive")} aria-label={"Supprimer la réponse de " + txt(r.data.name)}
                                onClick={() => (confirm === "r" + r.id ? del(r) : setConfirm("r" + r.id))}>
                                {confirm === "r" + r.id ? "Confirmer ?" : <Trash2 className="size-4" />}
                              </Button>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>

        <aside className="flex flex-col gap-6">
          <section className="flex flex-col gap-3" aria-labelledby="h-share">
            <h2 id="h-share" className="text-[15px] font-medium">Le lien à envoyer à vos invités</h2>
            <ShareKit url={url} cfg={cfg} slug={slug} />
          </section>
          {diets.length > 0 && (
            <section id="diet-box" aria-labelledby="diet-title" className="rounded-[20px] border border-border bg-card p-5 shadow-soft">
              <h2 id="diet-title" className="font-medium"><Utensils className="mr-2 inline size-4 align-[-2px]" aria-hidden="true" />Régimes et allergies <span className="font-normal text-muted-foreground">(pour le traiteur)</span></h2>
              <ul id="diet-list" className="mt-3 flex flex-col gap-2 text-[14px]">
                {diets.map((r) => <li key={r.id}><strong className="font-medium">{txt(r.data.name)}</strong> : {txt(r.data.diet)}</li>)}
              </ul>
            </section>
          )}
        </aside>
      </div>
      {danger}
    </Shell>
  );
}

function TwoStep({ id, label, confirmLabel, confirm, setConfirm, run, onSignedOut }: { id: string; label: string; confirmLabel: string; confirm: string | null; setConfirm: (v: string | null) => void; run: () => Promise<void>; onSignedOut: () => void }) {
  const [busy, setBusy] = useState(false);
  const on = confirm === id;
  return (
    <Button id={id} variant={on ? "destructive" : "ghost"} size="sm" disabled={busy} className={cn(!on && "text-destructive hover:bg-destructive/10", on && "confirm")}
      onClick={async () => {
        if (!on) { setConfirm(id); return; }
        setBusy(true);
        try { await run(); } catch (e) { if ((e as ApiError)?.signedOut) onSignedOut(); else toast.error(userError(e)); }
        finally { setBusy(false); setConfirm(null); }
      }}>
      {on ? confirmLabel : label}
    </Button>
  );
}

function Loading() {
  return (
    <div className="flex flex-col gap-6 py-6" role="status" aria-label="Chargement">
      <Skeleton className="h-4 w-40 rounded-full" /><Skeleton className="h-14 w-80 max-w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-[20px]" />)}</div>
      <Skeleton className="h-64 rounded-[20px]" />
    </div>
  );
}

function Shell({ user, onSignOut, children }: { user: User | null; onSignOut?: () => void; children: React.ReactNode }) {
  return (
    <div className="paper-grain min-h-dvh">
      <Toaster position="top-center" toastOptions={{ classNames: { toast: "!rounded-[20px] !shadow-lift !border-border !font-sans" } }} />
      <header className="glass sticky top-3 z-20 mx-auto mt-3 flex h-14 w-[calc(100%-24px)] max-w-6xl items-center justify-between rounded-full px-5">
        <a href="/" className="font-serif text-[22px] font-medium">Maison Meli</a>
        {user && (
          <div className="flex items-center gap-3 text-[14px]">
            <span id="account-email" className="hidden text-muted-foreground sm:inline">{user.email ? "Connecté : " + user.email : "Connecté"}</span>
            <Button id="signout" variant="ghost" size="sm" onClick={onSignOut}>Se déconnecter</Button>
          </div>
        )}
      </header>
      <main id="detail" className="mx-auto w-full max-w-6xl px-5 pb-24 pt-10 sm:px-8">{children}</main>
    </div>
  );
}

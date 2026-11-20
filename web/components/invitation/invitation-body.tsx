"use client";

import { forwardRef, useEffect, useState, type ReactNode } from "react";
import { CalendarPlus, MapPin } from "lucide-react";
import {
  downloadIcs, eventDate, eventInstant, formatDate, hm, longDate, mapsHref, parseDate, safeImg, safeLink, weekday,
  type Config,
} from "@/lib/invitation";
import { DecorBottom, DecorCorners, DecorTop, Heart, styleAttrs } from "./ornaments";
import { BrandMark } from "@/components/site/brand-mark";

function Paras({ text, preview }: { text: string; preview?: boolean }) {
  const t = String(text || "").trim();
  if (!t) return preview ? <p className="ph">Votre texte apparaîtra ici.</p> : null;
  return <>{t.split(/\n{2,}/).map((p, i) => <p key={i}>{p.split("\n").flatMap((l, j) => (j ? [<br key={j} />, l] : [l]))}</p>)}</>;
}
function Divider() {
  return <div className="divider-heart" aria-hidden="true"><span className="dh-line" /><Heart /><span className="dh-line" /></div>;
}
// Dans une maquette intégrée à une autre page (accueil, éditeur : namesTag ≠ "h1"), les titres de sections ne sont pas
// de vrais titres de la page : on les rend en paragraphe stylé pour ne pas polluer sa structure (SEO, lecteurs d'écran).
function Head({ title, tag = "h2" }: { title: string; tag?: "h2" | "p" }) {
  const T = tag;
  return <div className="section-head"><T className="sh-title">{title}</T><Divider /></div>;
}
function LinkBtn({ url, label }: { url: string; label: string }) {
  const l = safeLink(url);
  if (!l) return null;
  return <div className="center"><a className="maps-btn" href={l.href} target="_blank" rel="noopener nofollow">{label} <span className="host">({l.host})</span></a></div>;
}

const pad = (n: number) => (n < 10 ? "0" : "") + n;
// Compte à rebours vers l'instant absolu du mariage (fuseau du lieu).
export function Countdown({ cfg }: { cfg: Config }) {
  const target = eventInstant(cfg);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (target == null) return null;
  const s = now == null ? null : Math.floor(Math.max(0, target - now) / 1000);
  const parts: [string, string, string][] = [
    ["days", "jours", s == null ? "—" : String(Math.floor(s / 86400))],
    ["hours", "heures", s == null ? "—" : pad(Math.floor((s % 86400) / 3600))],
    ["mins", "minutes", s == null ? "—" : pad(Math.floor((s % 3600) / 60))],
    ["secs", "secondes", s == null ? "—" : pad(s % 60)],
  ];
  return (
    <div className="countdown" aria-hidden="true">
      {parts.map(([k, lab, v]) => (
        <div key={k}><div className="cd-num" data-cd={k}>{v}</div><div className="cd-lab">{lab}</div></div>
      ))}
    </div>
  );
}

type Props = {
  cfg: Config;
  preview?: boolean;
  namesTag?: "h1" | "p";
  /** Joue la révélation des prénoms (écriture), puis de la date et du lieu. Changer la clé du composant la rejoue. */
  reveal?: boolean;
  revealKey?: number;
  rsvp: ReactNode;
  className?: string;
};

// Le faire-part lui-même (page publique ET aperçus) : héros, sections au fond alterné, réponse, pied de page.
export const InvitationBody = forwardRef<HTMLDivElement, Props>(function InvitationBody({ cfg, preview, namesTag = "h1", reveal, revealKey = 0, rsvp, className }, ref) {
  const ht = namesTag === "h1" ? "h2" : "p";
  const photos = cfg.photos.map(safeImg).filter(Boolean), sec = cfg.sections;
  const p1 = cfg.partner1 || "Prénom", p2 = cfg.partner2 || "Prénom";
  const dateLong = formatDate(cfg, false), time = hm(cfg.time), hasDate = !!eventDate(cfg), maps = mapsHref(cfg);
  const NamesTag = namesTag;
  const names = <>{p1} <span className="amp">&amp;</span>{" "}{p2}</>;

  const blocks: { id: string; node: ReactNode }[] = [];
  if (cfg.message) blocks.push({ id: "message", node: <div className="narrow"><Paras text={cfg.message} /></div> });
  if (sec.story.on && (sec.story.text.trim() || preview)) blocks.push({ id: "story", node: <><Head tag={ht} title="Notre histoire" /><div className="narrow"><Paras text={sec.story.text} preview={preview} /></div></> });
  const items = sec.program.items.filter((it) => it.label.trim());
  if (sec.program.on && (items.length || preview)) {
    blocks.push({ id: "program", node: <><Head tag={ht} title="Programme" />{items.length ? (
      <ol className="timeline">{items.map((it, i) => (
        <li key={i}><span className="t-time">{hm(it.time)}</span><span className="t-dot" aria-hidden="true" /><span className="t-label">{it.label}</span></li>
      ))}</ol>) : <p className="ph center">Votre texte apparaîtra ici.</p>}</> });
  }
  if (cfg.venueName) {
    blocks.push({ id: "lieu", node: <>
      <Head tag={ht} title="Lieu" />
      <div className="lieu-card">
        <span className="lieu-pin" aria-hidden="true"><MapPin /></span>
        <div className="lieu-name">{cfg.venueName}</div>
        {cfg.venueAddress && <div className="lieu-address">{cfg.venueAddress}</div>}
        {maps && <div className="center"><a className="maps-btn" href={maps} target="_blank" rel="noopener">Ouvrir dans Maps</a></div>}
      </div>
      {photos.length > 1 && <div className="gallery">{photos.slice(1).map((p, i) => <img key={i} loading="lazy" src={p} alt="" />)}</div>}
    </> });
  }
  ([["dress", "Dress code", ""], ["lodging", "Hébergement", "Voir les hébergements"], ["practical", "Infos pratiques", ""], ["gifts", "Liste de mariage", "Voir la liste"]] as const).forEach(([id, title, btn]) => {
    const s = sec[id], l = btn ? safeLink(s.url || "") : null;
    if (!s.on || !(s.text.trim() || l || preview)) return;
    blocks.push({ id, node: <><Head tag={ht} title={title} /><div className="narrow">{s.text.trim() ? <Paras text={s.text} /> : (l ? null : <Paras text="" preview={preview} />)}</div>{btn && <LinkBtn url={s.url || ""} label={btn} />}</> });
  });

  const dl = parseDate(cfg.rsvp.deadline);
  const todayD = new Date(); todayD.setHours(0, 0, 0, 0);
  const contact = cfg.rsvp.email || cfg.rsvp.phone || cfg.rsvp.address;
  blocks.push({ id: "rsvp", node: <>
    <Head tag={ht} title="Merci de confirmer votre présence" />
    {dl && <p className="deadline">{dl < todayD && !preview ? `La date limite de réponse (${longDate(dl)}) est passée, mais vous pouvez encore nous répondre.` : `Merci de répondre avant le ${longDate(dl)}.`}</p>}
    {preview && <p className="preview-note">Aperçu : le formulaire sera actif une fois le faire-part publié.</p>}
    <div className="form-wrap">
      {rsvp}
      <p className="privacy">{contact ? "Vos réponses et coordonnées sont transmises uniquement aux mariés, pour l’organisation de leur mariage." : "Vos réponses sont transmises uniquement aux mariés."}</p>
    </div>
  </> });

  return (
    <div ref={ref} className={"fp" + (photos.length ? "" : " no-photo") + (reveal ? " fp-reveal" : "") + (className ? " " + className : "")} {...styleAttrs(cfg)} data-shape={cfg.photoShape}>
      <div className="fp-content">
        {photos[0] && <div className="hero-photo-wrap"><img className="hero-photo" src={photos[0]} alt={p1 + " et " + p2} /></div>}
        <div className="hero-text" key={"h" + revealKey}>
          <DecorCorners cfg={cfg} />
          <DecorTop cfg={cfg} />
          <NamesTag className="names">{names}</NamesTag>
          {cfg.subtitle && <div className="subtitle rv rv-1">{cfg.subtitle}</div>}
          <div className="rule rv rv-1" />
          <div className="date rv rv-2">{dateLong || "Date à venir"}</div>
          {hasDate && <div className="date-sub rv rv-2">{weekday(cfg)}{time ? " · " + time : ""}</div>}
          {cfg.venueName && <div className="hero-venue rv rv-3">{cfg.venueName}</div>}
          {hasDate && cfg.countdown && <div className="rv rv-3"><Countdown cfg={cfg} /></div>}
          {hasDate && (
            <button type="button" className="btn rv rv-3" data-ics onClick={() => downloadIcs(cfg)}>
              <CalendarPlus aria-hidden="true" className="btn-ic" /> Ajouter à mon agenda
            </button>
          )}
          <DecorBottom cfg={cfg} />
        </div>
        {blocks.map((b, i) => <section key={b.id} className={"sec-" + b.id + (i % 2 === 0 ? " alt" : "")}>{b.node}</section>)}
        <footer>
          <Divider />
          <div className="fnames">{names}</div>
          {dateLong && <div className="fdate">{dateLong}</div>}
          {/* Signature discrète, non cliquable (PRD US-14 : aucun lien commercial avant la réponse). Retirée en Premium (US-22). */}
          <p className="fp-brand"><BrandMark className="fp-brand-mark" />Maison Meli</p>
        </footer>
      </div>
    </div>
  );
});

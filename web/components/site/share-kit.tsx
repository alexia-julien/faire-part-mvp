"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, Mail, MessageCircle, MessageSquareText, Share2 } from "lucide-react";
import { toast } from "sonner";
import type { Config } from "@/lib/invitation";
import { copyText, downloadQr, qrDataUrl, shareSubject, shareText } from "@/lib/share";
import { track } from "@/lib/track";
import { Button } from "@/components/ui/button";

// Partage en un clic (US-10, US-11) : lien à copier, partage natif du téléphone, WhatsApp, SMS, email, QR code HD.
export function ShareKit({ url, cfg, slug }: { url: string; cfg: Config; slug: string }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [qr, setQr] = useState("");
  const text = shareText(cfg, url);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && !!navigator.share);
    try { setQr(qrDataUrl(url, 264)); } catch { setQr(""); }
  }, [url]);

  async function copy() {
    if (await copyText(url)) {
      track("share", { channel: "copie" }, slug);
      setCopied(true); setTimeout(() => setCopied(false), 1600);
    } else toast.error("Copie impossible : sélectionnez le lien à la main.");
  }
  const links = [
    { id: "whatsapp", label: "WhatsApp", Icon: MessageCircle, href: "https://wa.me/?text=" + encodeURIComponent(text), blank: true },
    { id: "sms", label: "SMS", Icon: MessageSquareText, href: "sms:?&body=" + encodeURIComponent(text) },
    { id: "email", label: "Email", Icon: Mail, href: "mailto:?subject=" + encodeURIComponent(shareSubject(cfg)) + "&body=" + encodeURIComponent(text + "\n\n") },
  ];

  return (
    <div className="share-kit flex flex-col gap-5">
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-1.5 pl-4 shadow-soft">
        <input id="public-link" readOnly value={url} aria-label="Lien du faire-part" onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 truncate bg-transparent text-[16px] text-foreground outline-none" />
        <Button type="button" size="sm" onClick={copy} data-copy="public-link" className="h-10 px-4">
          {copied ? <><Check aria-hidden="true" /> Copié</> : <><Copy aria-hidden="true" /> Copier</>}
        </Button>
      </div>
      <div className="share-row flex flex-wrap gap-2.5 [&>*]:min-w-[118px] [&>*]:flex-1">
        {canShare && (
          <Button type="button" variant="outline" className="share-native"
            onClick={() => navigator.share({ title: shareSubject(cfg), text: text.replace(" : " + url, "."), url }).then(() => track("share", { channel: "natif" }, slug), () => {})}>
            <Share2 aria-hidden="true" /> Partager…
          </Button>
        )}
        {links.map(({ id, label, Icon, href, blank }) => (
          <Button key={id} asChild variant="outline" className={"share-" + id}>
            <a href={href} target={blank ? "_blank" : undefined} rel={blank ? "noopener" : undefined} onClick={() => track("share", { channel: id }, slug)}>
              <Icon aria-hidden="true" /> {label}
            </a>
          </Button>
        ))}
      </div>
      {qr && (
        <div className="qr-wrap flex items-center gap-4 rounded-[20px] border border-border bg-card p-4 shadow-soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="qr-img size-[104px] shrink-0 rounded-xl" src={qr} alt="QR code du faire-part" width={104} height={104} />
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="font-medium">QR code du faire-part</p>
            <p className="text-[14px] leading-snug text-muted-foreground">À scanner avec l’appareil photo d’un téléphone. Pratique sur une affiche ou une table d’accueil.</p>
            <Button type="button" variant="link" className="qr-download h-auto self-start whitespace-normal p-0 text-left text-[14px]" onClick={() => { downloadQr(url, cfg); track("qr_download", {}, slug); }}>
              <Download aria-hidden="true" className="size-4" /> Télécharger en PNG
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

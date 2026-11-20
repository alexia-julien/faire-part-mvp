// Partage du faire-part (US-10, US-11) : textes prêts à envoyer et QR code en PNG haute définition.
import { formatDate, type Config, downloadBlob } from "./invitation";
import { qrCanvas } from "./qr";
import { slugify } from "./api";

// Prénoms et date dans le message lui-même (l'aperçu du lien est générique : site statique).
export function shareText(cfg: Pick<Config, "partner1" | "partner2" | "date" | "time">, url: string) {
  const names = (cfg.partner1 || "") + " & " + (cfg.partner2 || ""), date = formatDate(cfg, false);
  return names + (date ? " se marient le " + date + " !" : " se marient !") + " Découvrez notre faire-part et dites-nous si vous serez là : " + url;
}
export const shareSubject = (cfg: Pick<Config, "partner1" | "partner2">) => "Notre faire-part de mariage — " + (cfg.partner1 || "") + " & " + (cfg.partner2 || "");
export function qrDataUrl(url: string, px = 264) { return (qrCanvas(url, px) as HTMLCanvasElement).toDataURL("image/png"); }
export function downloadQr(url: string, cfg: Pick<Config, "partner1" | "partner2">) {
  const cv = qrCanvas(url, 1024) as HTMLCanvasElement;
  const name = "qr-faire-part-" + (slugify(cfg.partner1 + "-" + cfg.partner2) || "mariage") + ".png";
  cv.toBlob((b) => { if (b) downloadBlob(b, name); }, "image/png");
}
export async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand("copy"); } catch {}
    document.body.removeChild(ta); return ok;
  }
}

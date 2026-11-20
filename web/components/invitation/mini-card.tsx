import { formatDate, type Config } from "@/lib/invitation";
import { cn } from "@/lib/utils";
import { DecorBottom, DecorCorners, DecorTop, styleAttrs } from "./ornaments";

// Miniature d'un faire-part : mêmes palettes, polices, ornements et finitions que le rendu réel.
// Composant sans état (rendu côté serveur possible) : la police de l'ambiance est chargée par la page qui l'affiche.
export function MiniCard({ cfg, className }: { cfg: Config; className?: string }) {
  const d = formatDate(cfg, false) || "7 août 2027";
  return (
    <span className={cn("fp fp-mini block", className)} {...styleAttrs(cfg)} aria-hidden="true">
      <span className="mini-card">
        <DecorCorners cfg={cfg} />
        <span className="mini-body">
          <DecorTop cfg={cfg} />
          <span className="mini-names">{cfg.partner1 || "Camille"} <span className="amp">&amp;</span> {cfg.partner2 || "Hugo"}</span>
          <span className="mini-rule" />
          <span className="mini-date">{d}</span>
        </span>
        <DecorBottom cfg={cfg} />
      </span>
    </span>
  );
}

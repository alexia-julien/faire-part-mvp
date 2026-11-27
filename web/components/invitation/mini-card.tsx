import { formatDate, type Config } from "@/lib/invitation";
import { cn } from "@/lib/utils";
import { DecorBottom, DecorCorners, DecorTop, styleAttrs } from "./ornaments";

// Miniature d'un faire-part : mêmes palettes, polices, ornements et finitions que le rendu réel.
// Composant sans état (rendu côté serveur possible) : la police de l'ambiance est chargée par la page qui l'affiche.
// real : faire-part d'un couple (brouillon) : jamais de prénoms ni de date d'exemple à la place des siens.
export function MiniCard({ cfg, className, real = false }: { cfg: Config; className?: string; real?: boolean }) {
  const d = formatDate(cfg, false) || (real ? "Date à venir" : "7 août 2027");
  const ph = (v: string, def: string) => v.trim() || (real ? "…" : def);
  return (
    <span className={cn("fp fp-mini block", className)} {...styleAttrs(cfg)} aria-hidden="true">
      <span className="mini-card">
        <DecorCorners cfg={cfg} />
        <span className="mini-body">
          <DecorTop cfg={cfg} />
          <span className="mini-names">{ph(cfg.partner1, "Camille")} <span className="amp">&amp;</span> {ph(cfg.partner2, "Hugo")}</span>
          <span className="mini-rule" />
          <span className="mini-date">{d}</span>
        </span>
        <DecorBottom cfg={cfg} />
      </span>
    </span>
  );
}

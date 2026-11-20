// Symbole de la marque : cachet de cire encre frappé d'un M doré (piste « le cachet », 21/11/2026).
// Décoratif : toujours accompagné du nom « Maison Meli » en texte, donc masqué aux lecteurs d'écran.
import { SEAL_M, SEAL_PATH } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function BrandMark({ className, inverse = false }: { className?: string; inverse?: boolean }) {
  const wax = inverse ? "#B8975A" : "#1C1A17";
  const gold = inverse ? "#1C1A17" : "#B8975A";
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" className={cn("shrink-0", className)}>
      <path d={SEAL_PATH} fill={wax} />
      <circle cx="50" cy="50" r="36.7" fill="none" stroke={gold} strokeOpacity=".55" strokeWidth="1.2" />
      <path transform={`translate(${SEAL_M.x} ${SEAL_M.y})`} d={SEAL_M.d} fill={gold} />
    </svg>
  );
}

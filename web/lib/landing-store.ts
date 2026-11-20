// Petit état partagé de la page d'accueil (prénoms saisis, ambiance choisie) entre les îlots interactifs.
import { useSyncExternalStore } from "react";

type S = { p1: string; p2: string; style: string };
let state: S = { p1: "", p2: "", style: "" };
const subs = new Set<() => void>();
export const landing = {
  get: () => state,
  set(patch: Partial<S>) { state = { ...state, ...patch }; subs.forEach((f) => f()); },
  subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f); }; },
};
const server: S = { p1: "", p2: "", style: "" };
export function useLanding() { return useSyncExternalStore(landing.subscribe, landing.get, () => server); }

// Lien vers l'éditeur avec les prénoms et l'ambiance choisis (dans le fragment d'URL : jamais envoyés au serveur).
export function editorHref(p1: string, p2: string, style?: string) {
  const h = new URLSearchParams();
  if (p1) h.set("p1", p1.slice(0, 40));
  if (p2) h.set("p2", p2.slice(0, 40));
  if (style) h.set("s", style);
  const s = h.toString();
  return "/creer/" + (s ? "#" + s : "");
}

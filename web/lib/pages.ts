// Toutes les pages publiques connues (plan du site, images Open Graph, contrôles de la recette SEO).
import { AMBIANCES } from "./ambiances";
import { GUIDE_LIST } from "./guides";
import { PAGES, type Page } from "./site";

export function allPages(): Page[] {
  return [...Object.values(PAGES), ...AMBIANCES.map((a) => a.page), ...GUIDE_LIST];
}

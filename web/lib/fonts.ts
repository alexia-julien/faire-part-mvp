// Polices des faire-part, auto-hébergées (fontsource) et chargées à la demande : seule celle du faire-part affiché
// est téléchargée. Les sous-ensembles (unicode-range) limitent le poids au strict nécessaire.
const loaders: Record<string, () => Promise<unknown>> = {
  classique: () => Promise.all([import("@fontsource/mulish/400.css"), import("@fontsource/mulish/600.css")]),
  romantique: () => Promise.all([import("@fontsource/great-vibes/400.css"), import("@fontsource/mulish/400.css"), import("@fontsource/mulish/600.css")]),
  moderne: () => Promise.all([import("@fontsource/dm-serif-display/400.css"), import("@fontsource/dm-serif-display/400-italic.css"), import("@fontsource/dm-sans/400.css"), import("@fontsource/dm-sans/500.css")]),
  minimal: () => Promise.all([import("@fontsource/josefin-sans/300.css"), import("@fontsource/josefin-sans/400.css"), import("@fontsource/lato/400.css"), import("@fontsource/lato/700.css")]),
  calligraphie: () => Promise.all([import("@fontsource/pinyon-script/400.css"), import("@fontsource/mulish/400.css"), import("@fontsource/mulish/600.css")]),
  editorial: () => Promise.all([import("@fontsource/playfair-display/400.css"), import("@fontsource/playfair-display/400-italic.css"), import("@fontsource/mulish/400.css"), import("@fontsource/mulish/600.css")]),
  bodoni: () => Promise.all([import("@fontsource/bodoni-moda/400.css"), import("@fontsource/bodoni-moda/400-italic.css"), import("@fontsource/mulish/400.css"), import("@fontsource/mulish/600.css")]),
  artdeco: () => Promise.all([import("@fontsource/italiana/400.css"), import("@fontsource/jost/300.css"), import("@fontsource/jost/400.css"), import("@fontsource/jost/500.css")]),
};
const done: Record<string, boolean> = {};
export function loadFont(id: string) {
  if (done[id] || !loaders[id]) return;
  done[id] = true;
  loaders[id]().catch(() => { done[id] = false; });
}
export const loadAllFonts = () => Object.keys(loaders).forEach(loadFont);

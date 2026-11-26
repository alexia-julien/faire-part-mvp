// Générateur de texte de faire-part (outil gratuit, famille G du brief). Tout se calcule dans le navigateur :
// rien n'est envoyé au serveur. Le résultat se copie, ou s'insère dans l'éditeur (fragment #sub=…&msg=…).

export type Tone = "classique" | "moderne" | "humour" | "formel";
export type Ceremony = "civil" | "religieux" | "laique";
export type GenInput = {
  p1: string; p2: string; date: string; time: string; place: string;
  tone: Tone; ceremony: Ceremony; byParents: boolean; parents: string;
  noKids: boolean; kitty: boolean; small: boolean; variant: number;
};
export type GenOutput = { subtitle: string; message: string; full: string };

const UNITS = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize"];
const TENS = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante"];
// Nombres de 0 à 99 en toutes lettres (orthographe traditionnelle, traits d'union).
export function words(n: number): string {
  if (n < 17) return UNITS[n];
  if (n < 20) return "dix-" + UNITS[n - 10];
  if (n < 70) { const t = Math.floor(n / 10), u = n % 10; return TENS[t] + (u === 0 ? "" : u === 1 ? " et un" : "-" + UNITS[u]); }
  if (n < 80) return n === 71 ? "soixante et onze" : "soixante-" + words(n - 60);
  if (n === 80) return "quatre-vingts";
  return "quatre-vingt-" + words(n - 80);
}
const yearWords = (y: number) => "deux mille " + words(y - 2000);
const dayWords = (d: number) => (d === 1 ? "premier" : words(d));
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

function parts(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return null;
  const y = +m[1], mo = +m[2] - 1, d = +m[3], wd = new Date(Date.UTC(y, mo, d)).getUTCDay();
  return { y, mo, d, wd };
}
export function dateText(iso: string, letters: boolean) {
  const p = parts(iso);
  if (!p) return "";
  return letters ? `le ${DAYS[p.wd]} ${dayWords(p.d)} ${MONTHS[p.mo]} ${yearWords(p.y)}` : `le ${DAYS[p.wd]} ${p.d === 1 ? "1er" : p.d} ${MONTHS[p.mo]} ${p.y}`;
}
export function timeText(t: string, letters: boolean) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t || "");
  if (!m) return "";
  const h = +m[1], mi = +m[2];
  if (letters) return "à " + (h === 0 ? "minuit" : h === 12 ? "midi" : words(h) + (h === 1 ? " heure" : " heures")) + (mi ? " " + words(mi) : "");
  return "à " + h + " h" + (mi ? " " + String(mi).padStart(2, "0") : "");
}

// « à Château de Vaux » → « au Château de Vaux » : article devant les noms de lieux courants.
const MASC = /^(château|domaine|manoir|moulin|mas|clos|prieuré|relais|hôtel particulier|restaurant|jardin|parc|pavillon|cloître)\s/i;
const FEM = /^(abbaye|orangerie|bastide|ferme|grange|salle|mairie|église|chapelle|villa|maison|longère|cathédrale|basilique|guinguette|péniche)\s/i;
const NOUN = /^(hôtel|orangerie|auberge|église|abbaye)\s/i;
const VOWEL = /^[aeiouyéèêâîôûh]/i;
const pick = <T>(list: T[], v: number) => list[((v % list.length) + list.length) % list.length];

export function generate(i: GenInput): GenOutput {
  const p1 = i.p1.trim() || "Camille", p2 = i.p2.trim() || "Thomas", names = `${p1} & ${p2}`;
  const letters = i.tone === "formel";
  const day = dateText(i.date, letters);
  const when = day ? [day, timeText(i.time, letters)].filter(Boolean).join(" ") : ""; // l'heure seule, sans date, ne veut rien dire
  const place = i.place.trim();
  const cer = i.ceremony === "religieux" ? "la cérémonie religieuse de leur mariage" : i.ceremony === "laique" ? "la cérémonie laïque de leur mariage" : "leur mariage";

  let subtitle: string, message: string, intro = "";
  if (i.byParents && i.parents.trim()) {
    intro = `${i.parents.trim()} ${i.tone === "formel" ? "ont l’honneur de vous faire part du mariage de leurs enfants" : "sont heureux de vous annoncer le mariage de leurs enfants"}`;
    subtitle = i.tone === "formel" ? "ont l’honneur de vous faire part de leur mariage" : "ont la joie de vous annoncer leur mariage";
    message = intro + ".";
  } else if (i.tone === "formel") {
    subtitle = "vous prient de leur faire l’honneur d’assister à " + cer;
    message = pick(["Votre présence sera pour nous le plus précieux des cadeaux.", "Une réception suivra la cérémonie.", "Nous serions honorés de vous compter parmi nous."], i.variant);
  } else if (i.tone === "classique") {
    subtitle = pick(["ont la joie de vous inviter à " + cer, "sont heureux de vous convier à " + cer, "ont le plaisir de vous inviter à " + cer], i.variant);
    message = pick(["Nous serions très heureux de partager ce jour unique avec vous.", "Votre présence à nos côtés rendra ce jour encore plus beau.", "La fête se poursuivra autour d’un dîner et d’une soirée dansante."], i.variant);
  } else if (i.tone === "moderne") {
    subtitle = pick(["se marient, et on ne se voit pas le faire sans vous", "se disent oui !", "vous invitent à fêter leur mariage"], i.variant);
    message = pick(["Bloquez la date : cérémonie, long dîner et piste de danse. Tout le programme est juste en dessous.", "Après de belles années à deux, on a décidé de se dire oui. Venez fêter ça avec nous !", "Vous étiez là pour les débuts, soyez là pour la suite."], i.variant);
  } else {
    subtitle = pick(["ont signé un accord à vie", "passent à la version 2.0", "ont enfin trouvé une date"], i.variant);
    message = pick(["La cérémonie de signature aura lieu en présence de leurs proches. Présence fortement recommandée, buffet garanti.", "Installation prévue en présence de leurs proches, redémarrage de la fête jusqu’à l’aube. Aucune mise à jour ne sera refusée.", "Après des mois de négociations avec les deux familles, c’est officiel. Prévoyez des chaussures pour danser."], i.variant);
  }
  const extras: string[] = [];
  if (i.small) extras.push(i.tone === "formel" ? "Le mariage sera célébré dans l’intimité de nos proches." : "Nous nous marions en petit comité, entourés de celles et ceux qui comptent le plus.");
  if (i.noKids) extras.push(i.tone === "formel" ? "Nous avons choisi de célébrer ce jour entre adultes et vous remercions de votre compréhension." : "Nous avons choisi de célébrer ce jour entre adultes : merci de votre compréhension, et belle soirée en amoureux !");
  // Pas deux fois « votre présence… cadeau » quand le message choisi le dit déjà.
  if (i.kitty) extras.push((/cadeau/i.test(message) ? "" : "Votre présence est notre plus beau cadeau. ") + "Pour ceux qui le souhaitent, une cagnotte est à votre disposition.");
  if (extras.length) message = [message, ...extras].join(" ");
  message = message.slice(0, 600);
  subtitle = subtitle.slice(0, 100);

  const where = !place ? "" : /^(à|au|aux|en|chez|dans|sur)\s/i.test(place) ? place : /^le\s/i.test(place) ? "au " + place.slice(3) : /^les\s/i.test(place) ? "aux " + place.slice(4) : /^la\s/i.test(place) ? "à " + place : /^l[’']/i.test(place) ? "à " + place
    : VOWEL.test(place) && (MASC.test(place) || FEM.test(place) || NOUN.test(place)) ? "à l’" + place : MASC.test(place) ? "au " + place : FEM.test(place) ? "à la " + place : "à " + place;
  const whenWhere = [when, where].filter(Boolean).join(", ");
  const lines = intro ? [intro, names, whenWhere, ...extras] : [names, subtitle, whenWhere, message];
  const full = lines.filter(Boolean).map((l) => l.trim()).join("\n");
  return { subtitle, message, full };
}

export function editorLink(i: GenInput, o: GenOutput) {
  const h = new URLSearchParams();
  if (i.p1.trim()) h.set("p1", i.p1.trim().slice(0, 40));
  if (i.p2.trim()) h.set("p2", i.p2.trim().slice(0, 40));
  h.set("sub", o.subtitle); h.set("msg", o.message);
  return "/creer/#" + h.toString();
}

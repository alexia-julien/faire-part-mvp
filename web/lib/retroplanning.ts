// Rétroplanning du faire-part (outil gratuit). Délais tirés des guides cités sur la page (Mariages.net, Bridebook,
// ABC Salles) ; les relances sont un conseil Maison Meli. Calcul dans le navigateur, rien n'est envoyé.
export type Kind = "standard" | "vacances" | "etranger";
export type Step = { id: string; label: string; date: string; note: string };

const add = (iso: string, days = 0, months = 0) => {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(d, last) + days);
  return t.toISOString().slice(0, 10);
};

export function plan(wedding: string, kind: Kind): Step[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(wedding)) return [];
  const fp = kind === "etranger" ? -10 : kind === "vacances" ? -6 : -5;
  const std = kind === "etranger" ? -12 : -9;
  const deadline = add(wedding, 0, -2);
  return [
    { id: "std", label: "Envoyer le save the date", date: add(wedding, 0, std), note: kind === "standard" ? "Facultatif pour un mariage proche de vos invités ; utile s’ils doivent poser des congés." : "Recommandé : vos invités doivent réserver transport, hébergement ou congés." },
    { id: "fp", label: "Envoyer le faire-part", date: add(wedding, 0, fp), note: kind === "etranger" ? "Jusqu’à 10 mois avant pour un mariage à l’étranger ou à la logistique complexe." : kind === "vacances" ? "Environ 6 mois avant pour un mariage en été, sur un pont ou pendant les vacances." : "Entre 4 et 6 mois avant pour un mariage standard." },
    { id: "r1", label: "Relance douce", date: add(deadline, -14), note: "Un petit message à ceux qui n’ont pas encore répondu, avec le lien du faire-part." },
    { id: "dl", label: "Date limite de réponse", date: deadline, note: "Idéalement deux mois avant le mariage, pour finaliser invités, plan de table et organisation." },
    { id: "r2", label: "Dernière relance", date: add(deadline, 3), note: "Un appel ou un message personnel aux derniers retardataires." },
    { id: "tr", label: "Nombre de couverts au traiteur", date: add(wedding, -21), note: "Date indicative : vérifiez celle prévue dans votre contrat avec le traiteur ou le lieu." },
    { id: "j", label: "Le mariage", date: wedding, note: "Profitez !" },
  ];
}

export const fmtLong = (iso: string) => new Date(iso + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

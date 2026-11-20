"use client";

// Faire-part d'exemple, public et indexable : un couple fictif. La réponse fonctionne mais n'est pas enregistrée.
import { useMemo } from "react";
import { InvitationView } from "@/components/invitation/invitation-view";
import { PRESETS, sampleConfig, sanitizeConfig, sectionDefaults, type Config, type Section } from "@/lib/invitation";

export function exampleConfig(): Config {
  const c = sampleConfig({ p1: "Camille", p2: "Thomas" }, PRESETS[0]);
  c.date = "2027-06-19"; c.time = "15:30";
  c.venueName = "Domaine des Tilleuls"; c.venueAddress = "Chemin des Vergers\n84220 Gordes";
  c.subtitle = "vous invitent à célébrer leur mariage";
  c.message = "Après sept ans, deux déménagements et un chien, nous avons décidé de nous dire oui. Nous serions très heureux de partager ce jour avec vous.";
  c.sections.story = { on: true, text: "Nous nous sommes rencontrés à un mariage, justement, en 2020. Thomas a raté le bouquet, Camille a raté le dernier train : la suite s’est écrite toute seule." };
  c.sections.program = sectionDefaults("program", c) as Config["sections"]["program"];
  c.sections.dress = sectionDefaults("dress", c) as Section;
  c.sections.lodging = { on: true, text: "Quelques chambres d’hôtes à moins de 10 minutes du domaine. Réservez tôt : juin est très demandé dans le Luberon.", url: "" };
  c.sections.practical = { on: true, text: "Parking gratuit sur place. Navette depuis la gare d’Avignon TGV à 13 h 30, sur réservation dans votre réponse." };
  c.rsvp = { ...c.rsvp, guests: true, companions: true, children: true, diet: true, brunch: true, message: true, customLabel: "Avez-vous besoin de la navette depuis la gare ?", deadline: "2027-04-19" };
  return sanitizeConfig(c);
}

export function ExampleInvitation() {
  const cfg = useMemo(exampleConfig, []);
  return <InvitationView cfg={cfg} namesTag="p" onSubmit={async () => { await new Promise((r) => setTimeout(r, 400)); }} />;
}

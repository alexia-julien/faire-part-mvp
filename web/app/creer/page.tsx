import type { Metadata } from "next";
import { Editor } from "@/components/editor/editor";

export const metadata: Metadata = {
  title: "Créer mon faire-part",
  description: "Créez votre faire-part de mariage digital avec réponses des invités intégrées. Gratuit.",
  robots: { index: false, follow: true },
  referrer: "no-referrer",
};

export default function Page() {
  return <Editor />;
}

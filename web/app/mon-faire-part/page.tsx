import type { Metadata } from "next";
import { Dashboard } from "@/components/site/dashboard";

export const metadata: Metadata = {
  title: "Mon faire-part",
  robots: { index: false, follow: true },
  referrer: "no-referrer",
};

export default function Page() {
  return <Dashboard />;
}

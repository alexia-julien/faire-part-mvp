import type { Metadata } from "next";
import { AdminDashboard } from "@/components/site/admin-dashboard";

export const metadata: Metadata = {
  title: "Tableau de bord",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function Page() {
  return <AdminDashboard />;
}

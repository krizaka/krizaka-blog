import type { Metadata } from "next";
import SavedPage from "@/app/components/pages/SavedPage";
import { getDictionary } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

const t = getDictionary("fr");
export const metadata: Metadata = { ...pageMetadata({ locale: "fr", path: "/saved", title: t.engage.savedTitle, description: t.engage.savedLead, alternates: ["en", "fr"] }), robots: { index: false, follow: true } };

export default function Page() {
  return <SavedPage locale="fr" />;
}

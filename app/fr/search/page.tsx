import type { Metadata } from "next";
import SearchPage from "@/app/components/pages/SearchPage";
import { getDictionary } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

const t = getDictionary("fr");
export const metadata: Metadata = pageMetadata({ locale: "fr", path: "/search", title: t.search.title, description: t.search.lead, alternates: ["en", "fr"] });

export default function Page() {
  return <SearchPage locale="fr" />;
}

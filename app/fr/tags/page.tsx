import type { Metadata } from "next";
import { TagsPage } from "@/app/components/pages/TagsPage";
import { getDictionary } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

const t = getDictionary("fr");
export const metadata: Metadata = pageMetadata({ locale: "fr", path: "/tags", title: t.tags.title, description: t.tags.lead, alternates: ["en", "fr"] });

export default function Page() {
  return <TagsPage locale="fr" />;
}

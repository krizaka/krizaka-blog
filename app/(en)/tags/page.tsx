import type { Metadata } from "next";
import { TagsPage } from "@/app/components/pages/TagsPage";
import { getDictionary } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

const t = getDictionary("en");
export const metadata: Metadata = pageMetadata({ locale: "en", path: "/tags", title: t.tags.title, description: t.tags.lead, alternates: ["en", "fr"] });

export default function Page() {
  return <TagsPage locale="en" />;
}

import type { Metadata } from "next";
import { StoryPage } from "@/app/components/pages/StoryPage";
import { getDictionary } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

const t = getDictionary("fr");
export const metadata: Metadata = pageMetadata({ locale: "fr", path: "/story", title: t.story.title, description: t.story.lead, alternates: ["en", "fr"] });

export default function Page() {
  return <StoryPage locale="fr" />;
}

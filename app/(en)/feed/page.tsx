import type { Metadata } from "next";
import FeedPage from "@/app/components/feed/FeedPage";
import { getDictionary } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

const t = getDictionary("en");
export const metadata: Metadata = pageMetadata({ locale: "en", path: "/feed", title: t.feedPage.title, description: t.feedPage.lead, alternates: ["en", "fr"] });

export default function Page() {
  return <FeedPage locale="en" />;
}

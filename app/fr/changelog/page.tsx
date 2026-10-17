import type { Metadata } from "next";
import { ChangelogView } from "@/app/components/ChangelogView";
import { getDictionary } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

const c = getDictionary("fr").changelog;
export const metadata: Metadata = pageMetadata({ locale: "fr", path: "/changelog", title: c.metaTitle, description: c.metaDescription, alternates: ["en", "fr"] });

export default function Page() {
  return <ChangelogView locale="fr" />;
}

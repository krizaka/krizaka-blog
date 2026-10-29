import type { Metadata } from "next";
import { NewsletterPage } from "@/app/components/newsletter/NewsletterPages";
import { getDictionary } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

const t = getDictionary("fr");
export const metadata: Metadata = pageMetadata({
  locale: "fr",
  path: "/newsletter",
  title: t.newsletter.title,
  description: t.newsletter.lead,
  alternates: ["en", "fr"],
});

export default function Page() {
  return <NewsletterPage locale="fr" />;
}

import type { Metadata } from "next";
import { UnsubscribePage } from "@/app/components/newsletter/NewsletterPages";
import { getDictionary } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

const t = getDictionary("fr");
/* Asking for an unsubscribe link: never indexed. */
export const metadata: Metadata = { ...pageMetadata({ locale: "fr", path: "/newsletter/unsubscribe", title: t.newsletter.unsubscribeTitle, description: t.newsletter.unsubscribeLead, alternates: ["en", "fr"] }), robots: { index: false, follow: true } };

export default function Page() {
  return <UnsubscribePage locale="fr" />;
}

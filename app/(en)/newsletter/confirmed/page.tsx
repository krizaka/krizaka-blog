import type { Metadata } from "next";
import { NewsletterStatusPage } from "@/app/components/newsletter/NewsletterPages";
import { getDictionary } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

const t = getDictionary("en");
/* A landing page of an e-mail link: never indexed. */
export const metadata: Metadata = { ...pageMetadata({ locale: "en", path: "/newsletter/confirmed", title: t.newsletter.confirmedTitle, description: t.newsletter.confirmedLead, alternates: ["en", "fr"] }), robots: { index: false, follow: true } };

export default function Page() {
  return <NewsletterStatusPage locale="en" status="confirmed" />;
}

import type { Metadata } from "next";
import { NewsletterStatusPage } from "@/app/components/newsletter/NewsletterPages";
import { getDictionary } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

const t = getDictionary("fr");
/* A landing page of an e-mail link: never indexed. */
export const metadata: Metadata = {
  ...pageMetadata({
    locale: "fr",
    path: "/newsletter/expired",
    title: t.newsletter.expiredTitle,
    description: t.newsletter.expiredLead,
    alternates: ["en", "fr"],
  }),
  robots: { index: false, follow: true },
};

export default function Page() {
  return <NewsletterStatusPage locale="fr" status="expired" />;
}

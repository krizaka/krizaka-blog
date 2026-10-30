import type { Metadata } from "next";
import { OfflinePage } from "@/app/components/pages/OfflinePage";
import { getDictionary } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

const t = getDictionary("fr");
/* The offline page is for a reader without a connection: never indexed, whatever the site's indexing (krizaka-blog#211). */
export const metadata: Metadata = {
  ...pageMetadata({
    locale: "fr",
    path: "/offline",
    title: t.offline.title,
    description: t.offline.lead,
    alternates: ["en", "fr"],
  }),
  robots: { index: false, follow: false },
};

export default function Page() {
  return <OfflinePage locale="fr" />;
}

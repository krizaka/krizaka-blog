import type { Metadata } from "next";
import { BasicsPage } from "@/app/components/pages/BasicsPage";
import { seriesLead, seriesName } from "@/app/components/pages/series-label";
import { pageMetadata } from "@/lib/seo";

export const generateMetadata = (): Metadata =>
  pageMetadata({
    locale: "fr",
    path: "/basics",
    title: seriesName("fr", "basics"),
    description: seriesLead("fr", "basics"),
  });

export default function Page() {
  return <BasicsPage locale="fr" />;
}

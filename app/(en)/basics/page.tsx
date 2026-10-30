import type { Metadata } from "next";
import { BasicsPage } from "@/app/components/pages/BasicsPage";
import { seriesLead, seriesName } from "@/app/components/pages/series-label";
import { pageMetadata } from "@/lib/seo";

export const generateMetadata = (): Metadata =>
  pageMetadata({
    locale: "en",
    path: "/basics",
    title: seriesName("en", "basics"),
    description: seriesLead("en", "basics"),
  });

export default function Page() {
  return <BasicsPage locale="en" />;
}

import type { Metadata } from "next";
import { SeriesIndexPage } from "@/app/components/pages/SeriesPage";
import { getDictionary } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  const t = getDictionary("fr");
  return pageMetadata({ locale: "fr", path: "/series", title: t.series.title, description: t.series.lead });
}

export default function Page() {
  return <SeriesIndexPage locale="fr" />;
}

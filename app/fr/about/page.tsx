import type { Metadata } from "next";
import { AboutPage } from "@/app/components/about/AboutPage";
import { getDictionary } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

const t = getDictionary("fr");
export const metadata: Metadata = pageMetadata({
  locale: "fr",
  path: "/about",
  title: t.about.title,
  description: t.about.lead,
  alternates: ["en", "fr"],
});

export default function Page() {
  return <AboutPage locale="fr" />;
}

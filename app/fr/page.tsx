import type { Metadata } from "next";
import HomePage from "@/app/components/pages/HomePage";
import { getDictionary } from "@/lib/i18n";
import { blogJsonLd, pageMetadata } from "@/lib/seo";

const t = getDictionary("fr");
export const metadata: Metadata = pageMetadata({ locale: "fr", path: "/", title: t.site.name + " — " + t.site.tagline, description: t.site.description, alternates: ["en", "fr"] });

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd("fr")) }} />
      <HomePage locale="fr" />
    </>
  );
}

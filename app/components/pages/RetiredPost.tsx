import Link from "next/link";
import type { Metadata } from "next";
import { Section } from "@krizaka/ui/page";
import { chapterOf } from "@/lib/chapters";
import { format, getDictionary, type Locale } from "@/lib/i18n";
import { retiredTarget, type Retired } from "@/lib/retired";
import { SITE_URL } from "@/lib/site";

/* The stub at a retired post's old address: it moves the reader to the chapter that absorbed it. The 0-second refresh and the
   canonical are both the chapter's section (a permanent move for search engines); noindex keeps the stub out of the results. */
export function retiredMetadata(locale: Locale, target: Retired): Metadata {
  return {
    robots: { index: false, follow: true },
    alternates: { canonical: `${SITE_URL}${target.href}` },
  };
}

export default function RetiredPost({ locale, slug }: { locale: Locale; slug: string }) {
  const target = retiredTarget(locale, slug);
  if (!target) return null;
  const t = getDictionary(locale);
  const chapter = chapterOf(locale, target.chapterSlug);
  return (
    <>
      <meta httpEquiv="refresh" content={`0; url=${target.href}`} />
      <Section reveal={false}>
        <p>{t.retired.lead}</p>
        <p>
          <Link href={target.href}>{format(t.retired.link, { title: chapter?.title ?? "" })}</Link>
        </p>
      </Section>
    </>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import { Section } from "@krizaka/ui/page";
import { chapterOf } from "@/lib/chapters";
import { format, getDictionary, type Locale } from "@/lib/i18n";
import { postOf } from "@/lib/posts";
import { retiredTarget, type Retired } from "@/lib/retired";
import { SITE_URL } from "@/lib/site";

/* The stub at a retired address: it moves the reader to where the page now lives (a chapter's section, a shelf post, or the story).
   The 0-second refresh and the canonical are both that place (a permanent move for search engines); noindex keeps the stub out of the results. */
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
  const shelf = target.href.includes("/basics/");
  const post = shelf ? postOf(locale, target.chapterSlug) : undefined;
  const chapter = shelf || !target.chapterSlug ? undefined : chapterOf(locale, target.chapterSlug);
  const label = post ? format(t.retired.linkPost, { title: post.title }) : chapter ? format(t.retired.link, { title: chapter.title }) : t.retired.linkStory;
  return (
    <>
      <meta httpEquiv="refresh" content={`0; url=${target.href}`} />
      <Section reveal={false}>
        <p>{shelf ? t.retired.leadBasics : t.retired.lead}</p>
        <p>
          <Link href={target.href}>{label}</Link>
        </p>
      </Section>
    </>
  );
}

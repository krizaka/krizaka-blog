import Link from "next/link";
import { ChapterFoot } from "@krizaka/ui/chapter";
import { Section } from "@krizaka/ui/page";
import { getDictionary, localizedPath, type Locale } from "@/lib/i18n";
import { chapterNumber, chaptersOf, type Chapter } from "@/lib/chapters";
import { chaptersAround } from "@/lib/book";
import { chapterPath } from "@/lib/seo";

/* The end of a post is the book's: the chapter just before it, the one just after it (by when they went out), and the way
   back to the whole story — the same foot as a chapter's (krizaka-internal#3911). */
export function BookNav({ post, locale }: { post: { publishedAt?: string; date?: string }; locale: Locale }) {
  const tc = getDictionary(locale).chapter;
  const { before, after } = chaptersAround(post, chaptersOf(locale));
  const link = (c: Chapter) => ({
    number: chapterNumber(c.chapter),
    title: c.title,
    href: localizedPath(locale, chapterPath(c.slug)),
  });
  return (
    <Section reveal={false} spacing="sm" className="bl-book">
      <ChapterFoot
        previous={before && link(before)}
        next={after && link(after)}
        back={{ href: localizedPath(locale, "/"), label: tc.toStory }}
        labels={{ previous: tc.previous, next: tc.nextLabel }}
        label={tc.nav}
        linkAs={Link}
      />
    </Section>
  );
}

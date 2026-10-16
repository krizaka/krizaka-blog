import Link from "next/link";
import { CardGrid } from "@krizaka/ui/card-grid";
import { LinkCard } from "@krizaka/ui/link-card";
import { format, getDictionary, localizedPath, type Locale } from "@/lib/i18n";
import type { Post } from "@/lib/posts";
import { postPath } from "@/lib/seo";

export const formatDate = (iso: string, locale: Locale): string =>
  new Intl.DateTimeFormat(locale === "en" ? "en-CA" : "fr-CA", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));

/* The posts as cards: the whole card is one link — date and reading time, title, summary. */
export function PostList({ posts, locale, reveal = true }: { posts: Post[]; locale: Locale; reveal?: boolean }) {
  const t = getDictionary(locale);
  return (
    <CardGrid min={320} reveal={reveal} aria-label={t.home.latest}>
      {posts.map((p) => (
        <LinkCard
          key={p.slug}
          linkAs={Link}
          href={localizedPath(locale, postPath(p.slug))}
          meta={`${formatDate(p.date, locale)} · ${format(t.post.readingTime, { minutes: String(p.readingMinutes) })}`}
          title={p.title}
          description={p.description}
          titleAs="h3"
          layout="stack"
        />
      ))}
    </CardGrid>
  );
}

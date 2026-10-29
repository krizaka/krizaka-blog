import { CardGrid } from "@krizaka/ui/card-grid";
import type { Locale } from "@/lib/i18n";
import type { Post } from "@/lib/posts";
import { PostCard } from "./PostCard";

export const formatDate = (iso: string, locale: Locale): string =>
  new Intl.DateTimeFormat(locale === "en" ? "en-CA" : "fr-CA", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${iso}T12:00:00Z`),
  );

/** A chapter's period (`YYYY-MM-DD` or `YYYY-MM-DD/YYYY-MM-DD`) as one short range: `Oct 16 – 23, 2026`, `16–23 oct. 2026`. */
export function formatPeriod(period: string, locale: Locale): string {
  const [from, to] = period.split("/");
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-CA" : "fr-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const day = (iso: string) => new Date(`${iso}T12:00:00Z`);
  return to && to !== from ? fmt.formatRange(day(from), day(to)) : fmt.format(day(from));
}

/* The posts as cards: cover, date and reading time, title, summary, topics — the whole card is one link. */
export function PostList({
  posts,
  locale,
  label,
  reveal = true,
}: {
  posts: Post[];
  locale: Locale;
  label: string;
  reveal?: boolean;
}) {
  return (
    <CardGrid min={320} reveal={reveal} aria-label={label}>
      {posts.map((p) => (
        <PostCard key={p.slug} post={p} locale={locale} />
      ))}
    </CardGrid>
  );
}

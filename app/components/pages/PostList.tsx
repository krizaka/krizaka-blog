import { CardGrid } from "@krizaka/ui/card-grid";
import { getDictionary, type Locale } from "@/lib/i18n";
import type { Post } from "@/lib/posts";
import { PostCard } from "./PostCard";

export const formatDate = (iso: string, locale: Locale): string =>
  new Intl.DateTimeFormat(locale === "en" ? "en-CA" : "fr-CA", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));

/* The posts as cards: cover, date and reading time, title, summary, topics — the whole card is one link. */
export function PostList({ posts, locale, reveal = true }: { posts: Post[]; locale: Locale; reveal?: boolean }) {
  const t = getDictionary(locale);
  return (
    <CardGrid min={320} reveal={reveal} aria-label={t.home.latest}>
      {posts.map((p) => (
        <PostCard key={p.slug} post={p} locale={locale} />
      ))}
    </CardGrid>
  );
}

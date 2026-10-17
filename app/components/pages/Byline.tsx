import Link from "next/link";
import { Avatar } from "@krizaka/ui/avatar";
import { KrizakaLogo } from "@krizaka/ui";
import { Button } from "@krizaka/ui/button";
import { ClockIcon, GlobeIcon } from "@krizaka/icons";
import { format, getDictionary, localizedPath, type Locale } from "@/lib/i18n";
import type { Post } from "@/lib/posts";
import { formatDate } from "./PostList";

/** The initials of a name ("Oussama Abid" → "OA"). */
const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/* Who wrote a post and when: the author (initials, no stock photo), the date, the reading time, the update; then the
   post's actions in one row (the other language, and what the page passes: « Read later »). */
export function Byline({ post, other, children }: { post: Post; other?: Post; children?: React.ReactNode }) {
  const t = getDictionary(post.locale);
  /* The other language's address, from known values only: one of the two locales, a slug of lower-case words. */
  const otherLang: Locale = other?.locale === "fr" ? "fr" : "en";
  const otherSlug = other && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(other.slug) ? other.slug : "";
  const otherHref = localizedPath(otherLang, `/posts/${otherSlug}/`);
  const author = (t.authors as Record<string, string>)[post.author] ?? post.author;
  return (
    <div className="bl-byline">
      {post.author === "krizaka" ? <span className="bl-byline-mark" aria-hidden="true"><KrizakaLogo size={28} animated={false} /></span> : <Avatar size="md" alt="" fallback={initials(author)} />}
      <div className="bl-byline-text">
        <p className="bl-byline-name">{author}</p>
        <p className="bl-byline-meta">
          <time dateTime={post.date}>{formatDate(post.date, post.locale)}</time>
          <span aria-hidden="true">·</span>
          <span className="bl-byline-time">
            <ClockIcon size={13} aria-hidden="true" />
            {format(t.post.readingTime, { minutes: String(post.readingMinutes) })}
          </span>
          {post.updated && (
            <>
              <span aria-hidden="true">·</span>
              <span>{format(t.post.updated, { date: formatDate(post.updated, post.locale) })}</span>
            </>
          )}
        </p>
      </div>
      {/* The actions of the post, one row centred on the author block: the same Button size and family for each. */}
      {(other || children) && (
        <div className="bl-byline-actions">
          {other && (
            <Button asChild variant="secondary" size="sm">
              <Link href={otherHref} hrefLang={otherLang} lang={otherLang} title={t.post.otherLabel}>
                <GlobeIcon size={15} aria-hidden="true" />
                {t.post.readInOther}
              </Link>
            </Button>
          )}
          {children}
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { Avatar } from "@krizaka/ui/avatar";
import { KrizakaLogo } from "@krizaka/ui";
import { ClockIcon, GlobeIcon } from "@krizaka/icons";
import { format, getDictionary, localizedPath } from "@/lib/i18n";
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

/* Who wrote a post and when: the author (initials, no stock photo), the date, the reading time, the update, and the same
   post in the other language when it exists. */
export function Byline({ post, other }: { post: Post; other?: Post }) {
  const t = getDictionary(post.locale);
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
      {other && (
        <Link className="bl-byline-lang" href={localizedPath(other.locale, `/posts/${other.slug}`)} hrefLang={other.locale} lang={other.locale} title={t.post.otherLabel}>
          <GlobeIcon size={14} aria-hidden="true" />
          {t.post.readInOther}
        </Link>
      )}
    </div>
  );
}

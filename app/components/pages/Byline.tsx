import Link from "next/link";
import { KrizakaLogo } from "@krizaka/ui";
import { Button } from "@krizaka/ui/button";
import { ClockIcon, GlobeIcon } from "@krizaka/icons";
import { format, getDictionary, localizedPath, type Locale } from "@/lib/i18n";
import type { Post } from "@/lib/posts";
import { authorPicture, hasStory } from "@/lib/author-picture";
import { WuSamaMark } from "../about/WuSamaMark";
import { formatDate } from "./PostList";

/* Who wrote a post and when: the author (the company's mark for the team, his own picture for an author who has one — the
   Wu-sama mark for Oussama —, the org JSON's default picture for the others), his name leading to his story (/about/), the date, the reading time, the update; then the
   post's actions in one row (the other language, and what the page passes). A chapter says its reading time in its head
   (ChapterHead), so it passes `readingTime={false}`. */
export function Byline({
  post,
  other,
  children,
  section = "basics",
  readingTime = true,
}: {
  post: Post;
  other?: Post;
  children?: React.ReactNode;
  section?: "basics" | "story";
  readingTime?: boolean;
}) {
  const t = getDictionary(post.locale);
  /* The other language's address, from known values only: one of the two locales, a slug of lower-case words. */
  const otherLang: Locale = other?.locale === "fr" ? "fr" : "en";
  const otherSlug = other && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(other.slug) ? other.slug : "";
  const otherHref = localizedPath(otherLang, `/${section}/${otherSlug}/`);
  const author = (t.authors as Record<string, string>)[post.author] ?? post.author;
  const picture = authorPicture(post.author, 40);
  return (
    <div className="bl-byline">
      <span className="bl-byline-mark" aria-hidden="true">
        {picture?.kind === "custom" ? (
          <WuSamaMark size={28} />
        ) : picture?.kind === "default" ? (
          // eslint-disable-next-line @next/next/no-img-element -- a 40 px default picture from the org JSON, already sized on the CDN
          <img src={picture.src} alt="" width={40} height={40} loading="lazy" decoding="async" />
        ) : (
          <KrizakaLogo size={28} animated={false} />
        )}
      </span>
      <div className="bl-byline-text">
        <p className="bl-byline-name">
          {hasStory(post.author) ? (
            <Link href={localizedPath(post.locale, "/about/")} className="bl-byline-story" title={t.post.authorStory}>
              {author}
            </Link>
          ) : (
            author
          )}
        </p>
        <p className="bl-byline-meta">
          <time dateTime={post.date}>{formatDate(post.date, post.locale)}</time>
          {readingTime && (
            <>
              <span aria-hidden="true">·</span>
              <span className="bl-byline-time">
                <ClockIcon size={13} aria-hidden="true" />
                {format(t.post.readingTime, { minutes: String(post.readingMinutes) })}
              </span>
            </>
          )}
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

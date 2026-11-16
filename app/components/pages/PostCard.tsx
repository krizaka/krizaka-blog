import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@krizaka/ui/card";
import { CoverImage } from "./CoverImage";
import { format, getDictionary, localizedPath, type Locale } from "@/lib/i18n";
import { coverOf, mediaOf } from "@/lib/media";
import { CardLoop } from "./CardLoop";
import type { Post } from "@/lib/posts";
import { postPath } from "@/lib/seo";
import { formatDate } from "./PostList";
import { tagLabel } from "./tag-label";
import { tagSlug } from "@/lib/posts";
import { seriesName } from "./series-label";

/* A post as a card: its cover (blur placeholder, responsive), its topic, date · reading time, the title, a one-line hook
   (the summary, cut at two lines; whole on the featured card) and its series. The whole card is one link (the title's,
   stretched). `feature` is the large horizontal card of the home's Featured. A chapter is a post with its own address (`href`),
   its own first line (`kicker`: « Chapter 08 ») and the way in (`cta`: « Read the chapter »). */
export function PostCard({
  post,
  locale,
  feature = false,
  priority = false,
  href,
  kicker,
  cta,
  titleAs,
}: {
  post: Post;
  locale: Locale;
  feature?: boolean;
  priority?: boolean;
  href?: string;
  kicker?: ReactNode;
  cta?: string;
  titleAs?: "h2" | "h3";
}) {
  const t = getDictionary(locale);
  const cover = post.cover ? coverOf(post.cover) : undefined;
  const clip = post.cover ? mediaOf(post.cover) : undefined;
  /* The featured card's picture is the page's first: fetched at once (and preloaded). The others when they come near the window. */
  return (
    <Card.Root className={`bl-card${feature ? " bl-card-feature" : ""}`}>
      <Card.Media aspect="video">
        {cover ? (
          <span className="bl-card-visual">
            <CoverImage
              className="bl-cover-img"
              cover={cover}
              sizes={
                feature ? "(min-width: 64rem) 640px, 100vw" : "(min-width: 64rem) 360px, (min-width: 40rem) 50vw, 100vw"
              }
              alt=""
              priority={priority}
            />
            {/* A clip cover: the poster above, its muted loop on hover or in view (CardLoop). */}
            {clip?.kind === "video" && <CardLoop mp4={clip.mp4} webm={clip.webm} />}
          </span>
        ) : (
          <Card.Image fallback={<span className="bl-cover-fallback" aria-hidden />} />
        )}
      </Card.Media>
      <Card.Body>
        <p className="bl-card-meta">
          {kicker ? (
            <span className="bl-topic">{kicker}</span>
          ) : (
            post.tags[0] && <span className="bl-topic">{tagLabel(locale, tagSlug(post.tags[0]))}</span>
          )}
          <span>
            <time dateTime={post.date}>{formatDate(post.date, locale)}</time> ·{" "}
            {format(t.post.readingTime, { minutes: String(post.readingMinutes) })}
          </span>
        </p>
        <Card.Title as={titleAs ?? (feature ? "h2" : "h3")}>
          <Link
            href={
              href ?? localizedPath(locale, postPath(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug) ? post.slug : ""))
            }
            className="bl-card-link"
          >
            {post.title}
          </Link>
        </Card.Title>
        <Card.Description className="bl-card-hook">{post.description}</Card.Description>
        {post.series && <p className="bl-card-series">{seriesName(locale, post.series)}</p>}
        {/* The way in, said once: the whole card is already the title's link, so this is its words, not a second link. */}
        {cta && (
          <p className="bl-card-cta" aria-hidden="true">
            {cta} <span className="bl-card-cta-arrow">→</span>
          </p>
        )}
      </Card.Body>
    </Card.Root>
  );
}

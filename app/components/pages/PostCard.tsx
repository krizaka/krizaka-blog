import { blurUrl } from "@/lib/blur";
import Link from "next/link";
import { Card } from "@krizaka/ui/card";
import { format, getDictionary, localizedPath, type Locale } from "@/lib/i18n";
import { coverOf } from "@/lib/media";
import type { Post } from "@/lib/posts";
import { postPath } from "@/lib/seo";
import { formatDate } from "./PostList";
import { tagLabel } from "./tag-label";
import { tagSlug } from "@/lib/posts";

/* A post as a card: its cover (blur placeholder, responsive), date · reading time, title, summary, topics. The whole card is
   one link (the title's, stretched). `feature` is the large horizontal card of the home. */
export function PostCard({ post, locale, feature = false, priority = false }: { post: Post; locale: Locale; feature?: boolean; priority?: boolean }) {
  const t = getDictionary(locale);
  const cover = post.cover ? coverOf(post.cover) : undefined;
  return (
    <Card.Root interactive className={`bl-card${feature ? " bl-card-feature" : ""}`}>
      <Card.Media aspect="video">
        {cover ? (
          <img
            className="bl-cover-img"
            src={cover.src}
            srcSet={cover.srcSet}
            sizes={feature ? "(min-width: 64rem) 640px, 100vw" : "(min-width: 64rem) 360px, (min-width: 40rem) 50vw, 100vw"}
            width={cover.width}
            height={cover.height}
            alt=""
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
            style={{ backgroundImage: blurUrl(cover.blur) }}
          />
        ) : (
          <Card.Image fallback={<span className="bl-cover-fallback" aria-hidden />} />
        )}
      </Card.Media>
      <Card.Body>
        <p className="bl-card-meta">
          {formatDate(post.date, locale)} · {format(t.post.readingTime, { minutes: String(post.readingMinutes) })}
        </p>
        <Card.Title as={feature ? "h2" : "h3"}>
          <Link href={localizedPath(locale, postPath(post.slug))} className="bl-card-link">
            {post.title}
          </Link>
        </Card.Title>
        <Card.Description>{post.description}</Card.Description>
        {post.tags.length > 0 && (
          <ul className="bl-card-tags" aria-label={t.post.topics}>
            {post.tags.slice(0, 3).map((tag) => (
              <li key={tag}>
                <span className="bl-chip">{tagLabel(locale, tagSlug(tag))}</span>
              </li>
            ))}
          </ul>
        )}
      </Card.Body>
    </Card.Root>
  );
}

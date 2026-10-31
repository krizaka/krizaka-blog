import Link from "next/link";
import { CoverImage } from "./CoverImage";
import { StepState } from "./PathMark";
import { format, getDictionary, localizedPath, type Locale } from "@/lib/i18n";
import { basicsInOrder } from "@/lib/basics";
import { coverOf } from "@/lib/media";
import type { Post } from "@/lib/posts";
import { postPath } from "@/lib/seo";

/* The basics as a compact reading path (krizaka-internal#1869): an ordered list 1 → N, one row a step — the number on a rail that
   links the steps, a small cover (the series' art), « Read n of N · minutes », the title (the row's one link) and its line, the state
   at the right (« Start here », « Next », « Read »; local to this device). Four rows fit one screen at 1440×900. */
export function BasicsPath({ posts, locale, label }: { posts: Post[]; locale: Locale; label: string }) {
  const t = getDictionary(locale);
  const ordered = basicsInOrder(posts);
  const slugs = ordered.map((p) => p.slug);
  const labels = { startHere: t.basics.startHere, next: t.basics.next, read: t.basics.read };
  return (
    <ol className="bl-path" aria-label={label}>
      {ordered.map((p, i) => {
        const cover = p.cover ? coverOf(p.cover) : undefined;
        return (
          <li key={p.slug} className="bl-path-step">
            <span className="bl-path-no" aria-hidden="true">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="bl-path-thumb" aria-hidden="true">
              {cover && <CoverImage className="bl-cover-img" cover={cover} sizes="96px" alt="" />}
            </span>
            <div className="bl-path-body">
              <p className="bl-path-meta">
                {format(t.basics.step, { n: String(i + 1), total: String(ordered.length) })} ·{" "}
                {format(t.post.readingTime, { minutes: String(p.readingMinutes) })}
              </p>
              <h3 className="bl-path-title">
                <Link href={localizedPath(locale, postPath(p.slug))} className="bl-path-link">
                  {p.title}
                </Link>
              </h3>
              <p className="bl-path-hook">{p.description}</p>
            </div>
            <StepState slug={p.slug} slugs={slugs} labels={labels} />
          </li>
        );
      })}
    </ol>
  );
}

import { format, getDictionary, type Locale } from "@/lib/i18n";
import { basicsInOrder } from "@/lib/basics";
import type { Post } from "@/lib/posts";
import { PostCard } from "./PostCard";

/* The basics as a reading path: a numbered list 1 → N, each step the post card (cover in the same ratio, reading time, one
   line), the number in the margin like a chapter's §, the first step marked « Start here ». */
export function BasicsPath({ posts, locale, label }: { posts: Post[]; locale: Locale; label: string }) {
  const b = getDictionary(locale).basics;
  const ordered = basicsInOrder(posts);
  return (
    <ol className="bl-path" aria-label={label}>
      {ordered.map((p, i) => (
        <li key={p.slug} className="bl-path-step">
          <p className="bl-path-no">
            <span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
            <span className="bl-path-of">{format(b.step, { n: String(i + 1), total: String(ordered.length) })}</span>
            {i === 0 && <strong className="bl-path-start">{b.startHere}</strong>}
          </p>
          <PostCard post={p} locale={locale} titleAs="h3" />
        </li>
      ))}
    </ol>
  );
}

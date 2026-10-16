import Link from "next/link";
import { ChipLink } from "@krizaka/ui/chip-link";
import { getDictionary, localizedPath, type Locale } from "@/lib/i18n";
import { tagsOf } from "@/lib/posts";
import { tagLabel } from "./tag-label";

/* The topics as filters. Each filter is a page (the home for « all », /tags/<topic> for one): no script, crawlable, and
   the page a search engine indexes for that topic. */
export function TopicFilter({ locale, current }: { locale: Locale; current?: string }) {
  const t = getDictionary(locale);
  const tags = tagsOf(locale);
  if (!tags.length) return null;
  return (
    <nav className="bl-filter" aria-label={t.home.filterLabel}>
      <ul className="bl-tags">
        <li>
          <ChipLink asChild selected={!current}>
            <Link href={localizedPath(locale, "/")}>{t.home.allTopics}</Link>
          </ChipLink>
        </li>
        {tags.map(({ tag, count }) => (
          <li key={tag}>
            <ChipLink asChild selected={current === tag}>
              <Link href={localizedPath(locale, `/tags/${tag}`)}>
                {tagLabel(locale, tag)} <span className="bl-count">{count}</span>
              </Link>
            </ChipLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

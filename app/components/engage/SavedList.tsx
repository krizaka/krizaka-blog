"use client";

import Link from "next/link";
import { BookmarkIcon } from "@krizaka/icons";
import { Button } from "@krizaka/ui/button";
import { CardGrid } from "@krizaka/ui/card-grid";
import { EmptyState } from "@krizaka/ui/empty-state";
import { LinkCard } from "@krizaka/ui/link-card";
import { format } from "@/lib/locale";
import { useI18n } from "../I18nProvider";
import { useSaved } from "./useSaved";

export type SavedCandidate = { slug: string; href: string; title: string; description: string };

/* The saved posts of this browser, newest save first. `posts` is every published post of the page's language (and the
   other language's for a post that exists only there), built on the server — no fetch in the browser. */
export function SavedList({ posts, homeHref }: { posts: SavedCandidate[]; homeHref: string }) {
  const { t } = useI18n();
  const e = t.engage;
  const { saved, remove } = useSaved();
  const bySlug = new Map(posts.map((p) => [p.slug, p]));
  const items = saved.map((s) => bySlug.get(s.slug)).filter((p): p is SavedCandidate => Boolean(p));

  if (!items.length) {
    return (
      <EmptyState
        icon={<BookmarkIcon size={22} />}
        title={e.emptyTitle}
        description={e.emptyBody}
        action={
          <Button asChild variant="primary" size="md">
            <Link href={homeHref}>{e.emptyAction}</Link>
          </Button>
        }
      />
    );
  }
  return (
    <div className="bl-saved">
      <p className="bl-status" role="status" aria-live="polite">
        {items.length === 1 ? e.countOne : format(e.count, { count: String(items.length) })} · {e.localOnly}
      </p>
      <CardGrid min={320} reveal={false}>
        {items.map((p) => (
          <div key={p.slug} className="bl-saved-item">
            <LinkCard linkAs={Link} href={p.href} title={p.title} description={p.description} titleAs="h2" />
            <Button type="button" variant="ghost" size="sm" onClick={() => remove(p.slug)} aria-label={format(e.removeAria, { title: p.title })}>
              {e.remove}
            </Button>
          </div>
        ))}
      </CardGrid>
    </div>
  );
}

import Link from "next/link";
import { Section } from "@krizaka/ui/page";
import { PageHero } from "@krizaka/ui/page-hero";
import { LinkCard } from "@krizaka/ui/link-card";
import { CardGrid } from "@krizaka/ui/card-grid";
import { EmptyState } from "@krizaka/ui/empty-state";
import { ChipLink } from "@krizaka/ui/chip-link";
import { NotificationIcon } from "@krizaka/icons";
import { Button } from "@krizaka/ui/button";
import { format, getDictionary, localizedPath, type Locale } from "@/lib/i18n";
import { postsOf, tagsOf } from "@/lib/posts";
import { JAVA_URL, KRIZAKA_URL, UI_URL } from "@/lib/site";
import { PostList } from "./PostList";
import { postCount, tagLabel } from "./tag-label";

/* The home: the blog's promise, the posts (or the honest "first posts soon"), the topics, where the work lives. */
export default function HomePage({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const posts = postsOf(locale);
  const tags = tagsOf(locale);
  const feed = `${locale === "en" ? "" : "/fr"}/feed.xml`;
  return (
    <>
      <PageHero eyebrow={t.home.eyebrow} title={t.home.title} lead={t.home.lead} linkAs={Link} />
      <Section title={t.home.latest} lead={posts.length ? t.home.latestLead : undefined} reveal={false}>
        {posts.length ? (
          <PostList posts={posts} locale={locale} reveal={false} />
        ) : (
          <EmptyState
            title={t.home.emptyTitle}
            description={t.home.emptyBody}
            action={
              <Button asChild variant="secondary" size="md">
                <a href={feed}>
                  <NotificationIcon size={16} />
                  {t.home.emptyAction}
                </a>
              </Button>
            }
          />
        )}
      </Section>
      {tags.length > 0 && (
        <Section title={t.home.topics} divider>
          <ul className="bl-tags" aria-label={t.home.topics}>
            {tags.map(({ tag, count }) => (
              <li key={tag}>
                <ChipLink asChild>
                  <Link href={localizedPath(locale, `/tags/${tag}`)}>
                    {tagLabel(locale, tag)} · {postCount(locale, count)}
                  </Link>
                </ChipLink>
              </li>
            ))}
          </ul>
        </Section>
      )}
      <Section title={t.home.elsewhereTitle} lead={t.home.elsewhereLead} divider>
        <CardGrid min={260}>
          <LinkCard href={KRIZAKA_URL} title={t.home.company} description={t.home.companyBody} cta={t.home.open} titleAs="h3" />
          <LinkCard href={UI_URL} title={t.home.ui} description={t.home.uiBody} cta={t.home.open} titleAs="h3" />
          <LinkCard href={JAVA_URL} title={t.home.java} description={t.home.javaBody} cta={t.home.open} titleAs="h3" />
        </CardGrid>
      </Section>
    </>
  );
}

import Link from "next/link";
import { PageHero } from "@krizaka/ui/page-hero";
import { Section } from "@krizaka/ui/page";
import { chapterNumber, chaptersOf } from "@/lib/chapters";
import { getDictionary, localizedPath, type Locale } from "@/lib/i18n";
import { SaveSeries, SavedList } from "../SaveOffline";

/* /offline/ (EN) and /fr/offline/ (FR), krizaka-blog#211: what this device holds for reading with no connection, and the way to save the
   rest. It is also the page the service worker answers with for a page that is not saved, so it is precached and says so
   (`notSaved`) in words that hold online too. Never indexed, never in the sitemap. */
export function OfflinePage({ locale }: Readonly<{ locale: Locale }>) {
  const t = getDictionary(locale);
  const o = t.offline;
  const chapters = chaptersOf(locale).map((c) => ({
    url: localizedPath(locale, `/story/${c.slug}`),
    number: chapterNumber(c.chapter),
    title: c.title,
  }));
  return (
    <>
      <PageHero eyebrow={o.eyebrow} title={o.title} lead={o.lead} backdrop="plain" linkAs={Link} />
      <Section reveal={false} spacing="sm">
        <p className="bl-offline-lost">{o.notSaved}</p>
        <SaveSeries urls={chapters.map((c) => c.url)} />
        <SavedList chapters={chapters} />
        <p className="bl-offline-hint">{o.installHint}</p>
        <p>
          <Link href={localizedPath(locale, "/")}>{o.toStory}</Link>
        </p>
      </Section>
    </>
  );
}

import { ChangelogBody } from "@/app/components/ChangelogBody";
import { CHANGELOG_REPO, loadReleases } from "@/lib/changelog";
import { getDictionary, type Locale, localizedPath } from "@/lib/i18n";
import { buildVersion, uiVersion } from "@/lib/platform";
import { changelogHref } from "@/lib/site";

/** `/changelog/` and `/fr/changelog/` (changelog template): the weeks of merged work on the blog, read from GitHub at build. The root layout supplies <main>. */
export async function ChangelogView({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  return (
    <ChangelogBody
      c={t.changelog}
      releases={await loadReleases()}
      version={buildVersion()}
      ui={uiVersion()}
      back={{ href: localizedPath(locale, "/"), label: t.site.name }}
      feedHref={`${changelogHref(locale)}feed.xml`}
      pullsUrl={`https://github.com/${CHANGELOG_REPO}/pulls?q=is%3Apr+is%3Amerged`}
    />
  );
}

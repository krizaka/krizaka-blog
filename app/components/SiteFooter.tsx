import { getDictionary, type Locale } from "@/lib/i18n";
import { GITHUB_ORG_URL, JAVA_URL, KRIZAKA_URL, REPOSITORY_URL, UI_URL } from "@/lib/site";

/* The footer: whose publication this is, where the code is, the feeds. */
export default function SiteFooter({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).footer;
  const feeds = locale === "en" ? "" : "/fr";
  return (
    <footer className="kz-footer">
      <div>
        <p><a href={KRIZAKA_URL}>{t.project}</a> · {t.license}</p>
        <p>{t.location}</p>
      </div>
      <nav aria-label={t.aria}>
        <a href={KRIZAKA_URL}>{t.krizaka}</a>
        <a href={UI_URL}>{t.ui}</a>
        <a href={JAVA_URL}>{t.java}</a>
        <a href={REPOSITORY_URL}>{t.source}</a>
        <a href={GITHUB_ORG_URL}>GitHub</a>
        <a href={`${feeds}/feed.xml`}>{t.rss}</a>
        <a href={`${feeds}/atom.xml`}>{t.atom}</a>
      </nav>
    </footer>
  );
}

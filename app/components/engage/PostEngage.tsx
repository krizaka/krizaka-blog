import { getDictionary, type Locale } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";
import { ShareBar } from "./ShareBar";

/* The end of a post: share it. (Comments join here once Krizaka accounts are live — ADR in krizaka/.github.) */
export function PostEngage({ slug, title, locale }: { slug: string; title: string; locale: Locale }) {
  const t = getDictionary(locale);
  const url = `${SITE_URL}${locale === "en" ? "" : "/fr"}/basics/${slug}/`;
  return (
    <section className="bl-engage" aria-labelledby="bl-engage-title">
      <h2 id="bl-engage-title" className="bl-engage-title">{t.engage.title}</h2>
      <ShareBar url={url} title={title} />
    </section>
  );
}

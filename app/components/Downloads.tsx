import { Button } from "@krizaka/ui/button";
import { downloadsOf } from "@/lib/downloads";
import { getDictionary, type Locale } from "@/lib/i18n";

/* « Download EPUB / PDF » (krizaka-blog#211): the two files of a chapter, or of the whole story. Plain links to the hashed files on the
   CDN, so they work with no script; a book that has no file shows nothing. */
export function Downloads({
  locale,
  bookKey,
  series = false,
}: Readonly<{ locale: Locale; bookKey: string; series?: boolean }>) {
  const t = getDictionary(locale).downloads;
  const files = downloadsOf(locale, bookKey);
  if (files.length === 0) return null;
  const label = { epub: series ? t.epubSeries : t.epub, pdf: series ? t.pdfSeries : t.pdf };
  return (
    <div className="bl-downloads" role="group" aria-label={t.regionLabel}>
      {files.map((f) => (
        <Button key={f.format} asChild variant={series ? "secondary" : "ghost"} size="md">
          <a
            href={f.url}
            download
            hrefLang={locale}
            type={f.format === "epub" ? "application/epub+zip" : "application/pdf"}
          >
            {label[f.format]}
          </a>
        </Button>
      ))}
    </div>
  );
}

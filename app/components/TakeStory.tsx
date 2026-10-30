import { Button } from "@krizaka/ui/button";
import { DownloadIcon } from "@krizaka/icons";
import { downloadsOf, SERIES_KEY, type Download } from "@/lib/downloads";
import { chaptersOf } from "@/lib/chapters";
import { coverOf, hasMedia } from "@/lib/media";
import { format, getDictionary, localizedPath, type Locale } from "@/lib/i18n";
import { chapterPath } from "@/lib/seo";
import { CoverImage } from "./pages/CoverImage";
import { SaveSeries } from "./SaveOffline";

/* « Take the story with you » / « Emportez l'histoire » (krizaka-blog#225): the EPUB and the PDF of the whole story as one card in the
   Cahier's look — the series cover, the title, « N chapters · FR/EN », EPUB primary (phones, e-readers), PDF secondary (print, computer),
   « Save for offline » quiet. `compact` is the card at the end of a chapter: that chapter's two files, then the whole story's.
   Every link is the hashed file of lib/downloads.json (a book with no file shows nothing); every button is the @krizaka/ui Button. */
const MIME = { epub: "application/epub+zip", pdf: "application/pdf" } as const;

/** « 170 KB » / « 2,1 Mo »: the size, in the unit and the digits of the language (Intl, so no word is typed here). */
export function sizeOf(bytes: number, locale: Locale): string {
  const mb = bytes >= 1024 * 1024;
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: mb ? "megabyte" : "kilobyte",
    maximumFractionDigits: mb ? 1 : 0,
    unitDisplay: "short",
  }).format(mb ? bytes / (1024 * 1024) : Math.max(1, Math.round(bytes / 1024)));
}

function FileButton({
  file,
  locale,
  label,
  primary = false,
  size = "md",
}: Readonly<{ file: Download; locale: Locale; label: string; primary?: boolean; size?: "sm" | "md" }>) {
  return (
    <Button asChild variant={primary ? "primary" : "secondary"} shape={primary ? "cut" : undefined} size={size}>
      <a href={file.url} download hrefLang={locale} type={MIME[file.format]}>
        <DownloadIcon size={16} aria-hidden="true" />
        {label} <span className="bl-take-size">{sizeOf(file.bytes, locale)}</span>
      </a>
    </Button>
  );
}

export function TakeStory({
  locale,
  bookKey = SERIES_KEY,
  compact = false,
}: Readonly<{ locale: Locale; bookKey?: string; compact?: boolean }>) {
  const d = getDictionary(locale).downloads;
  const story = downloadsOf(locale, SERIES_KEY);
  const own = bookKey === SERIES_KEY ? [] : downloadsOf(locale, bookKey);
  if (story.length === 0 && own.length === 0) return null;
  const chapters = chaptersOf(locale);
  const fileOf = (files: Download[], f: "epub" | "pdf") => files.find((x) => x.format === f);
  const coverId = chapters[0]?.cover;
  const cover = coverId && hasMedia(coverId) ? coverOf(coverId) : undefined;
  const label = (f: "epub" | "pdf") => (f === "epub" ? d.epubShort : d.pdfShort);

  if (compact) {
    return (
      <aside className="bl-take bl-take-compact" aria-labelledby={`bl-take-${bookKey}`}>
        <h2 id={`bl-take-${bookKey}`} className="bl-take-title">
          {d.takeTitle}
        </h2>
        {own.length > 0 && (
          <div className="bl-take-row">
            <span className="bl-take-for">{d.takeChapter}</span>
            {own.map((f) => (
              <FileButton key={f.format} file={f} locale={locale} label={label(f.format)} size="sm" />
            ))}
          </div>
        )}
        {story.length > 0 && (
          <div className="bl-take-row">
            <span className="bl-take-for">{d.takeStory}</span>
            {story.map((f) => (
              <FileButton key={f.format} file={f} locale={locale} label={label(f.format)} size="sm" />
            ))}
          </div>
        )}
      </aside>
    );
  }

  const epub = fileOf(story, "epub");
  const pdf = fileOf(story, "pdf");
  return (
    <aside className="bl-take" aria-labelledby="bl-take-story">
      {cover && (
        <CoverImage
          className="bl-take-cover"
          cover={cover}
          sizes="(min-width: 40rem) 160px, 96px"
          alt=""
          aria-hidden="true"
        />
      )}
      <div className="bl-take-body">
        <h2 id="bl-take-story" className="bl-take-title">
          {d.takeTitle}
        </h2>
        <p className="bl-take-meta">{format(d.takeMeta, { n: String(chapters.length) })}</p>
        <div className="bl-take-actions">
          {epub && (
            <div className="bl-take-action">
              <FileButton file={epub} locale={locale} label={label("epub")} primary />
              <span className="bl-take-hint">{d.epubHint}</span>
            </div>
          )}
          {pdf && (
            <div className="bl-take-action">
              <FileButton file={pdf} locale={locale} label={label("pdf")} />
              <span className="bl-take-hint">{d.pdfHint}</span>
            </div>
          )}
        </div>
        <div className="bl-take-quiet">
          <SaveSeries quiet urls={chapters.map((c) => localizedPath(locale, chapterPath(c.slug)))} />
        </div>
      </div>
    </aside>
  );
}

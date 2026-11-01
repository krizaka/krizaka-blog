import { Button } from "@krizaka/ui/button";
import { DownloadIcon } from "@krizaka/icons";
import { downloadsOf, SERIES_KEY, type Download } from "@/lib/downloads";
import { chaptersOf } from "@/lib/chapters";
import { format, getDictionary, localizedPath, type Locale } from "@/lib/i18n";
import { chapterPath } from "@/lib/seo";
import { OfflineHelp, SaveChapter, SaveSeries } from "./SaveOffline";

/* « Take the story with you » / « Emportez l'histoire » (krizaka-blog#225, redesigned in krizaka-blog#228): the EPUB and the PDF of the
   whole story as a bookplate of the Cahier — no box, no picture: a strip between two hairlines under the byline, the title in the
   mono of the § numbers, « N chapters · FR/EN » as meta, EPUB and PDF as small ghost @krizaka/ui Buttons with their
   size in mono, « Save for offline » as a quiet link. `compact` is the chapter's ONE end block (krizaka-internal#2002): per scope (this chapter, the whole story) the « Read offline »
   button and the EPUB · PDF links with mono sizes, and the « ? » helper.
   Every link is the hashed file of lib/downloads.json (a book with no file shows nothing). */
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
  hint,
}: Readonly<{ file: Download; locale: Locale; label: string; hint: string }>) {
  return (
    <Button asChild variant="ghost" size="sm" className="bl-take-file">
      <a href={file.url} download hrefLang={locale} type={MIME[file.format]} title={hint}>
        <DownloadIcon size={14} aria-hidden="true" />
        {label} <span className="bl-take-size">{sizeOf(file.bytes, locale)}</span>
      </a>
    </Button>
  );
}

/** One typographic link of the chapter's last line: « EPUB 170 KB ». */
function FileLink({ file, locale, label }: Readonly<{ file: Download; locale: Locale; label: string }>) {
  return (
    <a className="bl-take-link" href={file.url} download hrefLang={locale} type={MIME[file.format]}>
      {label} <span className="bl-take-size">{sizeOf(file.bytes, locale)}</span>
    </a>
  );
}

const ORDER = ["epub", "pdf"] as const;
const inOrder = (files: Download[]) =>
  ORDER.map((f) => files.find((x) => x.format === f)).filter((x): x is Download => Boolean(x));

export function TakeStory({
  locale,
  bookKey = SERIES_KEY,
  compact = false,
}: Readonly<{ locale: Locale; bookKey?: string; compact?: boolean }>) {
  const d = getDictionary(locale).downloads;
  const story = inOrder(downloadsOf(locale, SERIES_KEY));
  const own = bookKey === SERIES_KEY ? [] : inOrder(downloadsOf(locale, bookKey));
  if (story.length === 0 && own.length === 0) return null;
  const chapters = chaptersOf(locale);
  const label = (f: "epub" | "pdf") => (f === "epub" ? d.epubShort : d.pdfShort);
  const hint = (f: "epub" | "pdf") => (f === "epub" ? d.epubHint : d.pdfHint);

  if (compact) {
    const storyUrls = chapters.map((c) => localizedPath(locale, chapterPath(c.slug)));
    const group = (name: string, meta: string | undefined, files: Download[], save: React.ReactNode) => (
      <div className="bl-take-scope">
        <span className="bl-take-group">
          <span className="bl-take-for">
            <b>{name}</b>
            {meta && <span className="bl-take-count"> · {meta}</span>}
          </span>
          <span className="bl-take-links">
            {files.map((f, i) => (
              <span key={f.format}>
                {i > 0 && (
                  <span className="bl-take-dot" aria-hidden="true">
                    {" "}
                    ·{" "}
                  </span>
                )}
                <FileLink file={f} locale={locale} label={label(f.format)} />
              </span>
            ))}
          </span>
        </span>
        {save}
      </div>
    );
    return (
      <aside className="bl-take-line" aria-labelledby={`bl-take-${bookKey}`}>
        <div className="bl-take-head">
          <h2 id={`bl-take-${bookKey}`} className="bl-take-label">
            {d.takeTitle}
          </h2>
          <OfflineHelp />
        </div>
        <div className="bl-take-scopes">
          {group(d.takeChapter, undefined, own, <SaveChapter url={localizedPath(locale, chapterPath(bookKey))} />)}
          {group(
            d.takeStory,
            format(d.takeChapters, { n: String(chapters.length) }),
            story,
            <SaveSeries urls={storyUrls} />,
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside className="bl-take" aria-labelledby="bl-take-story">
      <h2 id="bl-take-story" className="bl-take-label">
        {d.takeTitle}
      </h2>
      <p className="bl-take-meta">{format(d.takeMeta, { n: String(chapters.length) })}</p>
      <div className="bl-take-files">
        {story.map((f) => (
          <FileButton key={f.format} file={f} locale={locale} label={label(f.format)} hint={hint(f.format)} />
        ))}
      </div>
      <SaveSeries urls={chapters.map((c) => localizedPath(locale, chapterPath(c.slug)))} />
    </aside>
  );
}

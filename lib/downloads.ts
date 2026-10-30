/* The downloads of the story (krizaka-blog#211): the EPUB and the PDF of every chapter and of the whole series, per language. They are
   made after the build by scripts/gen-downloads.mjs and live on Bunny as hashed files; lib/downloads.json (committed) records their
   hashes and sizes, and this module turns a book into its links. A book with no entry has no link: nothing dead is ever shown. */
import { FORMATS, SERIES, downloadUrl, type DownloadFormat } from "./downloads-core.mjs";
import manifest from "./downloads.json";
import type { Locale } from "./i18n";

export type Download = { format: DownloadFormat; url: string; bytes: number };
type Entry = { files?: Partial<Record<DownloadFormat, { hash: string; bytes: number }>> };
const books = manifest.books as Record<string, Entry>;

/** The files of a book — a chapter's slug, or `SERIES_KEY` for the whole story — in the formats made, EPUB first. */
export function downloadsOf(locale: Locale, key: string): Download[] {
  const files = books[`${locale}/${key}`]?.files ?? {};
  return FORMATS.flatMap((format) => {
    const f = files[format];
    return f ? [{ format, url: downloadUrl(key, locale, format, f.hash), bytes: f.bytes }] : [];
  });
}

export const SERIES_KEY: string = SERIES;
export const MIME: Record<DownloadFormat, string> = { epub: "application/epub+zip", pdf: "application/pdf" };

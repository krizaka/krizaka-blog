/* Saved posts ("read later"), kept in the reader's browser: no account, nothing sent anywhere. A post is saved by its
   slug (both languages of a post share it), with the time it was saved. Once a reader signs in to a Krizaka account the
   list is merged with the account's (mergeSaved) and kept in sync; until then it lives only in this browser.
   Pure functions over a Storage-like object, so the tests run them on a fake. */

export const SAVED_KEY = "kz-blog-saved";
/** The event a page fires on itself when the list changes (the `storage` event only reaches the *other* tabs). */
export const SAVED_EVENT = "kz-blog-saved-change";
/** A bound on the list, so a broken loop can never fill the browser's storage. */
export const SAVED_MAX = 500;

export type SavedEntry = { slug: string; at: string };
export type StorageLike = Pick<Storage, "getItem" | "setItem">;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Reads a stored value; anything malformed (hand-edited, older shape, another site's key) reads as an empty list. */
export function parseSaved(raw: string | null | undefined): SavedEntry[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const seen = new Set<string>();
  const out: SavedEntry[] = [];
  for (const e of data) {
    if (!e || typeof e !== "object") continue;
    const { slug, at } = e as Record<string, unknown>;
    if (typeof slug !== "string" || !SLUG.test(slug) || seen.has(slug)) continue;
    if (typeof at !== "string" || Number.isNaN(Date.parse(at))) continue;
    seen.add(slug);
    out.push({ slug, at });
  }
  return out.slice(0, SAVED_MAX);
}

/** The saved posts, most recently saved first. A browser that refuses storage (private mode) reads as empty. */
export function readSaved(storage: StorageLike | null | undefined): SavedEntry[] {
  try {
    return sortSaved(parseSaved(storage?.getItem(SAVED_KEY)));
  } catch {
    return [];
  }
}

export function isSaved(entries: readonly SavedEntry[], slug: string): boolean {
  return entries.some((e) => e.slug === slug);
}

function sortSaved(entries: SavedEntry[]): SavedEntry[] {
  return [...entries].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

function write(storage: StorageLike, entries: SavedEntry[]): boolean {
  try {
    storage.setItem(SAVED_KEY, JSON.stringify(sortSaved(entries).slice(0, SAVED_MAX)));
    return true;
  } catch {
    return false;
  }
}

/** Saves a post, or un-saves it when it is saved. Returns whether it is saved afterwards (unchanged if storage refuses). */
export function toggleSaved(storage: StorageLike, slug: string, now: Date = new Date()): boolean {
  if (!SLUG.test(slug)) return false;
  const entries = readSaved(storage);
  const was = isSaved(entries, slug);
  const next = was ? entries.filter((e) => e.slug !== slug) : [{ slug, at: now.toISOString() }, ...entries];
  return write(storage, next) ? !was : was;
}

export function removeSaved(storage: StorageLike, slug: string): void {
  write(storage, readSaved(storage).filter((e) => e.slug !== slug));
}

/** The union of two lists (this browser's and the account's): one entry per post, the earliest save time kept. */
export function mergeSaved(a: readonly SavedEntry[], b: readonly SavedEntry[]): SavedEntry[] {
  const bySlug = new Map<string, SavedEntry>();
  for (const e of [...parseSaved(JSON.stringify(a)), ...parseSaved(JSON.stringify(b))]) {
    const had = bySlug.get(e.slug);
    if (!had || Date.parse(e.at) < Date.parse(had.at)) bySlug.set(e.slug, e);
  }
  return sortSaved([...bySlug.values()]).slice(0, SAVED_MAX);
}

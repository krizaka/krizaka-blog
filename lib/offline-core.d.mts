export type OfflineEntry = { slug: string; title: string; url: string; assets: string[] };
export type OfflineManifest = { build: string; chapters: Record<"en" | "fr", OfflineEntry[]> };
type Fetch = (input: string, init?: RequestInit) => Promise<Response>;
export const SAVED_PREFIX: string;
export const MANIFEST_URL: string;
export const CDN_ORIGIN: string;
export const QUOTA_USED_MAX: number;
export const REGISTER_SCRIPT: string;
export function savedCacheName(build: string): string;
export function isNeverCached(pathname: string): boolean;
export function offlineUrl(pathname: string): string;
export function hasRoom(estimate?: { usage?: number; quota?: number }): boolean;
export function isQuotaError(e: unknown): boolean;
export function readManifest(fetchFn: Fetch): Promise<OfflineManifest>;
export function allEntries(manifest: OfflineManifest): OfflineEntry[];
export function saveEntries(
  cacheStorage: CacheStorage,
  build: string,
  entries: OfflineEntry[],
  fetchFn: Fetch,
  onProgress?: (done: number, total: number) => void,
): Promise<void>;
export function listSaved(cacheStorage: CacheStorage, manifest: OfflineManifest): Promise<string[]>;
export function removeSaved(cacheStorage: CacheStorage, urls: string[]): Promise<void>;
export function migrate(cacheStorage: CacheStorage, fetchFn: Fetch): Promise<number>;

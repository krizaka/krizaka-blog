"use client";

/* What this device has saved for offline reading (krizaka-blog#211), as a store React reads with useSyncExternalStore: no effect, no
   fetch in a component. The Cache API is the source of truth (the caches `kz-saved-*`, lib/offline-core.mjs); the first subscriber
   loads the list, a save or a removal updates it. Browser state, not server data: the page itself stays static. */
import {
  allEntries,
  hasRoom,
  isQuotaError,
  listSaved,
  readManifest,
  removeSaved,
  saveEntries,
  type OfflineManifest,
} from "./offline-core.mjs";

export type OfflineError = "quota" | "failed";
export type OfflineState = {
  /** `unsupported` where there is no service worker or Cache API. */
  status: "loading" | "idle" | "saving" | "unsupported";
  saved: readonly string[];
  error?: OfflineError;
  progress?: { done: number; total: number };
};

const SERVER: OfflineState = { status: "loading", saved: [] };
let state: OfflineState = SERVER;
let started = false;
const listeners = new Set<() => void>();

const set = (next: Partial<OfflineState>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};

const supported = () => typeof caches !== "undefined" && "serviceWorker" in navigator;
const getJson = (url: string, init?: RequestInit) => fetch(url, init);

async function refresh(manifest?: OfflineManifest) {
  try {
    const m = manifest ?? (await readManifest(getJson));
    set({ saved: await listSaved(caches, m), status: state.status === "saving" ? "saving" : "idle" });
  } catch {
    // offline with no manifest in reach: the list stays as it was
    set({ status: state.status === "saving" ? "saving" : "idle" });
  }
}

export const offlineStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    if (!started) {
      started = true;
      if (supported()) void refresh();
      else set({ status: "unsupported" });
    }
    return () => void listeners.delete(listener);
  },
  getSnapshot: () => state,
  getServerSnapshot: () => SERVER,

  /** Saves the chapters at `urls` (their pages and what they draw). */
  async save(urls: readonly string[]) {
    if (state.status === "saving" || !supported()) return;
    set({ status: "saving", error: undefined, progress: { done: 0, total: urls.length } });
    try {
      const manifest = await readManifest(getJson);
      const entries = allEntries(manifest).filter((e) => urls.includes(e.url));
      if (!hasRoom(await navigator.storage?.estimate?.()))
        throw Object.assign(new Error("quota"), { name: "QuotaExceededError" });
      await navigator.storage?.persist?.();
      await saveEntries(caches, manifest.build, entries, getJson, (done, total) => set({ progress: { done, total } }));
      set({ status: "idle", progress: undefined });
      await refresh(manifest);
    } catch (e) {
      set({ status: "idle", progress: undefined, error: isQuotaError(e) ? "quota" : "failed" });
      await refresh();
    }
  },

  async remove(urls: readonly string[]) {
    if (!supported()) return;
    await removeSaved(caches, [...urls]);
    await refresh();
  },
};

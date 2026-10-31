"use client";

/* Which basics this reader has opened, on this device only (krizaka-blog, krizaka-internal#1869): a tiny store React reads with
   useSyncExternalStore, backed by localStorage. Nothing is sent anywhere; without storage (private mode) nothing is marked. */
const KEY = "kz-basics-read";
const NONE: readonly string[] = [];
let cache: readonly string[] | undefined;
const listeners = new Set<() => void>();

function load(): readonly string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : NONE;
  } catch {
    return NONE;
  }
}

export const readStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot(): readonly string[] {
    return (cache ??= load());
  },
  getServerSnapshot(): readonly string[] {
    return NONE;
  },
  mark(slug: string) {
    const now = readStore.getSnapshot();
    if (now.includes(slug)) return;
    cache = [...now, slug];
    try {
      localStorage.setItem(KEY, JSON.stringify(cache));
    } catch {
      // storage refused: the mark lives until the page closes
    }
    listeners.forEach((l) => l());
  },
};

"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { SAVED_EVENT, SAVED_KEY, parseSaved, removeSaved, toggleSaved, type SavedEntry } from "@/lib/saved";

/* The saved posts of this browser, as a React value that follows every change: this tab (SAVED_EVENT) and the others
   (the `storage` event). Rendered empty on the server and at hydration, then the stored list. */

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === SAVED_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(SAVED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(SAVED_EVENT, onChange);
  };
}

function snapshot(): string {
  try {
    return storage()?.getItem(SAVED_KEY) ?? "";
  } catch {
    return "";
  }
}

export function useSaved(): { saved: SavedEntry[]; toggle: (slug: string) => boolean; remove: (slug: string) => void } {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "");
  const saved = useMemo(() => parseSaved(raw).sort((a, b) => Date.parse(b.at) - Date.parse(a.at)), [raw]);
  const toggle = useCallback((slug: string) => {
    const s = storage();
    const now = s ? toggleSaved(s, slug) : false;
    window.dispatchEvent(new Event(SAVED_EVENT));
    return now;
  }, []);
  const remove = useCallback((slug: string) => {
    const s = storage();
    if (s) removeSaved(s, slug);
    window.dispatchEvent(new Event(SAVED_EVENT));
  }, []);
  return { saved, toggle, remove };
}

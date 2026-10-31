"use client";

import { useEffect, useSyncExternalStore } from "react";
import { readStore } from "@/lib/read-store";

/* The reader's place on the basics' path, on this device only. `StepState` says, for one step, « Start here » (nothing read yet),
   « Next » (the first unread one after a read, or the second one of a fresh path) or « Read »; `MarkRead` records that a basic was opened. */
export function StepState({
  slug,
  slugs,
  labels,
}: {
  slug: string;
  slugs: string[];
  labels: { startHere: string; next: string; read: string };
}) {
  const read = useSyncExternalStore(readStore.subscribe, readStore.getSnapshot, readStore.getServerSnapshot);
  const unread = slugs.filter((s) => !read.includes(s));
  const none = read.length === 0 || !slugs.some((s) => read.includes(s));
  const at = unread.indexOf(slug);
  let label = "";
  let kind = "";
  if (at < 0) [label, kind] = [labels.read, "read"];
  else if (at === 0) [label, kind] = none ? [labels.startHere, "start"] : [labels.next, "next"];
  else if (at === 1 && none) [label, kind] = [labels.next, "next"];
  return label ? (
    <span className="bl-path-state" data-state={kind}>
      {label}
    </span>
  ) : null;
}

export function MarkRead({ slug }: { slug: string }) {
  useEffect(() => readStore.mark(slug), [slug]);
  return null;
}

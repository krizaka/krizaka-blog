"use client";

import { BookmarkIcon } from "@krizaka/icons";
import { Button } from "@krizaka/ui/button";
import { useI18n } from "../I18nProvider";
import { useSaved } from "./useSaved";

/* Save for later: a toggle (aria-pressed), the list kept in this browser (lib/saved.ts). */
export function SaveButton({ slug, size = "sm" }: { slug: string; size?: "sm" | "md" }) {
  const { t } = useI18n();
  const { saved, toggle } = useSaved();
  const on = saved.some((e) => e.slug === slug);
  return (
    <Button type="button" variant={on ? "primary" : "secondary"} size={size} aria-pressed={on} onClick={() => toggle(slug)} title={on ? t.engage.unsaveHint : t.engage.saveHint}>
      <BookmarkIcon size={15} />
      {on ? t.engage.saved : t.engage.save}
    </Button>
  );
}

"use client";

import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon } from "@krizaka/icons";
import { Button } from "@krizaka/ui/button";
import { useI18n } from "../I18nProvider";

/* A read-only address with a « Copy » button (the feed's). The address is in the page's HTML (selectable without script); the
   button is the only thing that needs JavaScript. */
export function CopyField({ id, label, value }: { id: string; label: string; value: string }) {
  const { t } = useI18n();
  const f = t.feedPage;
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(timer);
  }, [copied]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      window.prompt(f.copyFallback, value);
    }
  };
  return (
    <div className="bl-copy">
      <label htmlFor={id} className="bl-copy-label">
        {label}
      </label>
      <div className="bl-copy-row">
        <input id={id} className="bl-copy-input" type="text" readOnly value={value} onFocus={(e) => e.currentTarget.select()} />
        <Button type="button" variant="secondary" size="md" onClick={copy}>
          {copied ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
          {copied ? f.copied : f.copy}
        </Button>
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? f.copied : ""}
      </span>
    </div>
  );
}

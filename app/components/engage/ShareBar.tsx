"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { CheckIcon, CopyIcon, Share90Icon } from "@krizaka/icons";
import { Button } from "@krizaka/ui/button";
import { shareLinks } from "@/lib/share";
import { useI18n } from "../I18nProvider";

/* Share a post: the system's share sheet where the browser has one (phones), copy the link, then plain links to each
   network's share page (lib/share.ts) — no script of theirs, no tracking. */
export function ShareBar({ url, title }: { url: string; title: string }) {
  const { t } = useI18n();
  const e = t.engage;
  // The browser's share sheet is read as an external value: false on the server and for the first paint, no effect.
  const native = useSyncExternalStore(
    () => () => {},
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    () => false,
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(id);
  }, [copied]);

  const share = async () => {
    try {
      await navigator.share({ title, url });
    } catch {
      /* dismissed by the reader: nothing to do */
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt(e.copyFallback, url);
    }
  };

  return (
    <div className="bl-share" role="group" aria-label={e.shareAria}>
      {native && (
        <Button type="button" variant="secondary" size="sm" onClick={share}>
          <Share90Icon size={15} />
          {e.shareNative}
        </Button>
      )}
      <Button type="button" variant="secondary" size="sm" onClick={copy}>
        {copied ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
        {copied ? e.copied : e.copy}
      </Button>
      {shareLinks(url, title).map(({ target, href }) => (
        <Button key={target} asChild variant="ghost" size="sm">
          <a
            href={href}
            target={target === "email" ? undefined : "_blank"}
            rel="noopener noreferrer"
            aria-label={`${e.targets[target]} — ${e.opensNew}`}
          >
            {e.targets[target]}
          </a>
        </Button>
      ))}
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? e.copied : ""}
      </span>
    </div>
  );
}

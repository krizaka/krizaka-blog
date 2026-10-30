"use client";

/* The CAPTCHA of the newsletter form (Cloudflare Turnstile, managed mode, widget `krizaka-forms`), the same widget as
   krizaka.com's contact form (krizaka-com app/components/CaptchaWidget.tsx). Renders nothing when no site key is configured
   (local dev, tests). The token goes up through `onToken` (null when it expires); the server verifies it
   (lib/captcha.ts). The widget's theme follows the site's: `html.light` or dark.
   **Nothing loads with the page**: Cloudflare's script (and the challenge frame it opens, ~150 KB and a dozen requests) is
   fetched only when the form scrolls into view or takes focus (`whenWanted`), never at the first request. */

import { useEffect, useRef } from "react";
import { whenWanted } from "@/lib/when-wanted";

export const CAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_ABUSE_CAPTCHA_SITE_KEY ?? "";

interface Turnstile {
  render(el: HTMLElement, options: Record<string, unknown>): string;
  remove(id: string): void;
}
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loading: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error("captcha script"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

const currentTheme = () => (document.documentElement.classList.contains("light") ? "light" : "dark");

export default function CaptchaWidget({
  onToken,
  label,
  language,
}: {
  onToken: (token: string | null) => void;
  label: string;
  language: string;
}) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!CAPTCHA_SITE_KEY || !host.current) return;
    const el = host.current;
    let id: string | null = null;
    let cancelled = false;
    const mount = () => {
      if (cancelled || !window.turnstile) return;
      if (id) window.turnstile.remove(id);
      id = window.turnstile.render(el, {
        sitekey: CAPTCHA_SITE_KEY,
        // Invisible unless Cloudflare needs the visitor to act (then the box appears in place).
        appearance: "interaction-only",
        theme: currentTheme(),
        language,
        callback: (token: string) => onToken(token),
        "expired-callback": () => onToken(null),
        "error-callback": () => onToken(null),
      });
    };
    let watcher: MutationObserver | null = null;
    const start = () => {
      loadScript().then(
        () => {
          mount();
          // The theme toggle flips `html.light`: draw the widget again in the other theme.
          if (cancelled) return;
          watcher = new MutationObserver(() => {
            onToken(null);
            mount();
          });
          watcher.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        },
        () => onToken(null),
      );
    };
    const stopWaiting = whenWanted(el.closest("form") ?? el, start);
    return () => {
      cancelled = true;
      stopWaiting();
      watcher?.disconnect();
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, [language, onToken]);

  if (!CAPTCHA_SITE_KEY) return null;
  return <div ref={host} className="bl-nl-captcha" role="group" aria-label={label} />;
}

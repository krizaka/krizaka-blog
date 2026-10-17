"use client";

/* The newsletter form, compact: one short line, one row (e-mail + « M'abonner »), one small muted line (who sends, how to
   stop, what we keep, already subscribed?). The language is the page's. → POST /api/newsletter/subscribe
   (functions/packages/newsletter): the server checks the CAPTCHA (invisible unless Cloudflare needs an action) and e-mails a
   confirmation link; nothing is stored until it is opened (double opt-in). The consent is explicit through the button's
   words and the notice line (CASL); the full privacy note is one link away (Loi 25). */

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { Input } from "@krizaka/ui/field";
import { Button } from "@krizaka/ui/button";
import { Alert } from "@krizaka/ui/alert";
import { format } from "@krizaka/i18n";
import { localizedPath } from "@/lib/i18n";
import { useI18n } from "../I18nProvider";
import CaptchaWidget, { CAPTCHA_SITE_KEY } from "./CaptchaWidget";
import "./newsletter.css";

type Status = "idle" | "sending" | "sent" | "error";
export const EMAIL = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/;
export const SUBSCRIBE_URL = "/api/newsletter/subscribe";

export function SubscribeForm({ id = "nl" }: { id?: string }) {
  const { t, locale } = useI18n();
  const n = t.newsletter;
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const sentRef = useRef<HTMLParagraphElement>(null);
  const onToken = useCallback((token: string | null) => setCaptcha(token), []);
  const invalid = touched && !EMAIL.test(email.trim());

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTouched(true);
    if (!EMAIL.test(email.trim())) return;
    if (CAPTCHA_SITE_KEY && !captcha) {
      setStatus("error");
      setError(n.errors.captcha);
      return;
    }
    const website = (new FormData(e.currentTarget).get("website") as string) ?? "";
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch(SUBSCRIBE_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), locale, captchaToken: captcha, website }) });
      if (res.ok) {
        setStatus("sent");
        requestAnimationFrame(() => sentRef.current?.focus());
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus("error");
      setCaptcha(null);
      setCaptchaKey((k) => k + 1);
      setError(body.error === "invalid" ? n.errors.email : body.error === "captcha" ? n.errors.captcha : body.error === "unavailable" ? n.errors.unavailable : n.errors.other);
    } catch {
      setStatus("error");
      setError(n.errors.other);
    }
  }

  if (status === "sent") {
    return (
      <div className="bl-nl">
        <p ref={sentRef} tabIndex={-1} className="bl-nl-done" role="status">
          <strong>{n.sentTitle}.</strong> {format(n.sentBody, { email: email.trim() })}
        </p>
      </div>
    );
  }

  return (
    <form className="bl-nl" onSubmit={onSubmit} noValidate aria-labelledby={`${id}-lead`}>
      <p id={`${id}-lead`} className="bl-nl-lead">
        {n.compactLead}
      </p>
      <div className="bl-nl-row">
        <label htmlFor={`${id}-email`} className="bl-nl-sr">
          {n.emailLabel}
        </label>
        <Input
          id={`${id}-email`}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder={n.emailPlaceholder}
          required
          value={email}
          invalid={invalid}
          aria-describedby={invalid ? `${id}-error` : `${id}-notice`}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched(true)}
          className="bl-nl-input"
        />
        <Button type="submit" variant="primary" shape="cut" size="md" loading={status === "sending"}>
          {status === "sending" ? n.sending : n.submitCompact}
        </Button>
      </div>
      {invalid && (
        <p id={`${id}-error`} className="bl-nl-error" role="alert">
          {n.errors.email}
        </p>
      )}
      {/* A field people never see: robots fill it. */}
      <div className="bl-nl-hp" aria-hidden="true">
        <label>
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <CaptchaWidget key={captchaKey} onToken={onToken} label={n.captcha} language={locale} />
      {status === "error" && error && <Alert tone="danger">{error}</Alert>}
      <p id={`${id}-notice`} className="bl-nl-notice">
        {n.compactConsent} <Link href={localizedPath(locale, "/newsletter")}>{n.privacyShort}</Link>
        <span aria-hidden="true"> · </span>
        <Link href={localizedPath(locale, "/newsletter/unsubscribe")}>{n.alreadySubscribed}</Link>
      </p>
    </form>
  );
}

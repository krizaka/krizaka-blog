"use client";

/* The newsletter form: e-mail + language → POST /api/newsletter/subscribe (functions/packages/newsletter). The server
   checks the CAPTCHA and e-mails a confirmation link; nothing is stored until it is opened (double opt-in). The consent
   sentence says who sends, what, and how to stop (CASL); the privacy note is one link away (Loi 25). */

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { Field, Input, Select } from "@krizaka/ui/field";
import { Button } from "@krizaka/ui/button";
import { Alert } from "@krizaka/ui/alert";
import { format } from "@krizaka/i18n";
import { localizedPath } from "@/lib/i18n";
import { useI18n } from "../I18nProvider";
import CaptchaWidget, { CAPTCHA_SITE_KEY } from "./CaptchaWidget";
import "./newsletter.css";

type Status = "idle" | "sending" | "sent" | "error";
const EMAIL = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/;
export const SUBSCRIBE_URL = "/api/newsletter/subscribe";

export function SubscribeForm({ title, lead, headingLevel = 2, showPrivacyLink = true }: { title?: string; lead?: string; headingLevel?: 2 | 3; showPrivacyLink?: boolean }) {
  const { t, locale } = useI18n();
  const n = t.newsletter;
  const [email, setEmail] = useState("");
  const [language, setLanguage] = useState<string>(locale);
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const sentRef = useRef<HTMLDivElement>(null);
  const onToken = useCallback((token: string | null) => setCaptcha(token), []);
  const id = `nl-${headingLevel}`;
  const Heading = headingLevel === 2 ? "h2" : "h3";
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
      const res = await fetch(SUBSCRIBE_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), locale: language, captchaToken: captcha, website }) });
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

  return (
    <div className="bl-nl" aria-labelledby={title ? `${id}-title` : undefined} role={title ? "region" : undefined}>
      {title && (
        <Heading id={`${id}-title`} className="bl-nl-title">
          {title}
        </Heading>
      )}
      {lead && <p className="bl-nl-lead">{lead}</p>}
      {status === "sent" ? (
        <div ref={sentRef} tabIndex={-1} className="bl-nl-done">
          <Alert tone="success" title={n.sentTitle}>
            {format(n.sentBody, { email: email.trim() })}
          </Alert>
          <Button variant="ghost" size="sm" onClick={() => { setStatus("idle"); setEmail(""); setTouched(false); setCaptcha(null); setCaptchaKey((k) => k + 1); }}>
            {n.again}
          </Button>
        </div>
      ) : (
        <form className="bl-nl-form" onSubmit={onSubmit} noValidate>
          <div className="bl-nl-row">
            <Field.Root className="bl-nl-email">
              <Field.Label htmlFor={`${id}-email`}>{n.email}</Field.Label>
              <Input
                id={`${id}-email`}
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                invalid={invalid}
                aria-describedby={invalid ? `${id}-email-error` : `${id}-email-hint`}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched(true)}
              />
              {invalid ? <Field.Error id={`${id}-email-error`}>{n.errors.email}</Field.Error> : <Field.Hint id={`${id}-email-hint`}>{n.emailHint}</Field.Hint>}
            </Field.Root>
            <Field.Root className="bl-nl-lang">
              <Field.Label htmlFor={`${id}-lang`}>{n.language}</Field.Label>
              <Select id={`${id}-lang`} name="locale" value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="fr">{n.languages.fr}</option>
                <option value="en">{n.languages.en}</option>
              </Select>
            </Field.Root>
          </div>
          {/* A field people never see: robots fill it. */}
          <div className="bl-nl-hp" aria-hidden="true">
            <label>
              Website
              <input name="website" type="text" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <CaptchaWidget key={captchaKey} onToken={onToken} label={n.captcha} language={locale} />
          <p className="bl-nl-consent">
            {n.consent}
            {showPrivacyLink && (
              <>
                {" "}
                <Link href={localizedPath(locale, "/newsletter")}>{n.privacyLink}</Link>
              </>
            )}
          </p>
          {status === "error" && error && <Alert tone="danger">{error}</Alert>}
          <div className="bl-nl-actions">
            <Button type="submit" variant="primary" shape="cut" loading={status === "sending"}>
              {status === "sending" ? n.sending : n.submit}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

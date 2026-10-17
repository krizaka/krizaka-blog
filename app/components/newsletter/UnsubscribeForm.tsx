"use client";

/* « Déjà abonné ? Se désabonner » — e-mail + the same invisible CAPTCHA → POST /api/newsletter/unsubscribe-request. The
   answer shown is always the same neutral sentence, whether or not the address is on the list. */

import { useCallback, useState } from "react";
import { Input } from "@krizaka/ui/field";
import { Button } from "@krizaka/ui/button";
import { Alert } from "@krizaka/ui/alert";
import { useI18n } from "../I18nProvider";
import CaptchaWidget, { CAPTCHA_SITE_KEY } from "./CaptchaWidget";
import { EMAIL } from "./SubscribeForm";
import "./newsletter.css";

export const UNSUBSCRIBE_REQUEST_URL = "/api/newsletter/unsubscribe-request";

export function UnsubscribeForm() {
  const { t, locale } = useI18n();
  const n = t.newsletter;
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);
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
      const res = await fetch(UNSUBSCRIBE_REQUEST_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), locale, captchaToken: captcha, website }) });
      if (res.ok) {
        setStatus("sent");
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus("error");
      setCaptcha(null);
      setCaptchaKey((k) => k + 1);
      setError(body.error === "invalid" ? n.errors.email : body.error === "captcha" ? n.errors.captcha : body.error === "rate_limited" ? n.rateLimited : n.errors.other);
    } catch {
      setStatus("error");
      setError(n.errors.other);
    }
  }

  if (status === "sent") return <Alert tone="success">{n.unsubscribeSent}</Alert>;

  return (
    <form className="bl-nl" onSubmit={onSubmit} noValidate>
      <div className="bl-nl-row">
        <label htmlFor="nl-unsub-email" className="bl-nl-sr">
          {n.emailLabel}
        </label>
        <Input id="nl-unsub-email" name="email" type="email" autoComplete="email" inputMode="email" placeholder={n.emailPlaceholder} required value={email} invalid={invalid} aria-describedby={invalid ? "nl-unsub-error" : undefined} onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouched(true)} className="bl-nl-input" />
        <Button type="submit" variant="secondary" shape="cut" size="md" loading={status === "sending"}>
          {status === "sending" ? n.sending : n.unsubscribeSubmit}
        </Button>
      </div>
      {invalid && (
        <p id="nl-unsub-error" className="bl-nl-error" role="alert">
          {n.errors.email}
        </p>
      )}
      <div className="bl-nl-hp" aria-hidden="true">
        <label>
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <CaptchaWidget key={captchaKey} onToken={onToken} label={n.captcha} language={locale} />
      {status === "error" && error && <Alert tone="danger">{error}</Alert>}
    </form>
  );
}

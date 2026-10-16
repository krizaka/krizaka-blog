"use client";
import { useState } from "react";
import { format, getDictionary, type Locale } from "@/lib/i18n";

/* « When does a rented GPU beat the hosted price? » — one slider. The cost of a rented clip is hourly price ÷ (clips per
   busy hour × how busy the machine is). The inputs are the post's own figures (passed as props); nothing is measured here. */
export function Utilization({ hourly, seconds, hosted, locale }: { hourly: number; seconds: number; hosted: number; locale: Locale }) {
  const t = getDictionary(locale).calc;
  const [busy, setBusy] = useState(50);
  const perHour = 3600 / seconds;
  const rented = hourly / (perHour * (busy / 100));
  const breakEven = Math.ceil((hourly / (perHour * hosted)) * 100);
  const usd = (n: number) => new Intl.NumberFormat(locale === "en" ? "en-CA" : "fr-CA", { style: "currency", currency: "USD" }).format(n);
  return (
    <aside className="bl-calc" aria-labelledby="bl-calc-title">
      <p id="bl-calc-title" className="bl-calc-title">{t.title}</p>
      <label>
        {t.busy}: <b>{busy}%</b>
        <input type="range" min={5} max={100} step={5} value={busy} onChange={(e) => setBusy(Number(e.target.value))} />
      </label>
      <dl>
        <div><dt>{t.perClip}</dt><dd>{usd(rented)}</dd></div>
        <div><dt>{t.hosted}</dt><dd>{usd(hosted)}</dd></div>
      </dl>
      <p role="status" className="bl-calc-verdict">{rented < hosted ? t.verdictCheaper : t.verdictDearer} {format(t.breakEven, { percent: String(breakEven) })}</p>
      <p className="bl-calc-note">{format(t.assumption, { hourly: usd(hourly), seconds: String(seconds) })}</p>
    </aside>
  );
}

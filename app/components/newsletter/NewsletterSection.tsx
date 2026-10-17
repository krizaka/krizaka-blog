import { getDictionary, type Locale } from "@/lib/i18n";
import { SubscribeForm } from "./SubscribeForm";
import "./newsletter.css";

/* The form where people read: on the home under the latest posts, and at the end of every post — a footnote, not a
   section (a hairline, one line, one row, one small notice). One mount line each. */
export function NewsletterSection({ locale, where }: { locale: Locale; where: "home" | "post" }) {
  const n = getDictionary(locale).newsletter;
  return (
    <aside id="subscribe" className="bl-nl-foot" aria-label={n.formTitle}>
      <SubscribeForm id={`nl-${where}`} />
    </aside>
  );
}

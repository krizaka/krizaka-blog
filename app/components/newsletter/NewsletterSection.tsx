import { Section } from "@krizaka/ui/page";
import { getDictionary, type Locale } from "@/lib/i18n";
import { SubscribeForm } from "./SubscribeForm";
import "./newsletter.css";

/* The form where people read: on the home under the latest posts, and at the end of every post. One mount line each. */
export function NewsletterSection({ locale, where }: { locale: Locale; where: "home" | "post" }) {
  const n = getDictionary(locale).newsletter;
  return (
    <Section divider aria-label={n.formTitle} className="bl-nl-section">
      <div className="bl-nl-card">
        <SubscribeForm title={where === "home" ? n.homeTitle : n.endOfPostTitle} lead={where === "home" ? n.homeLead : n.endOfPostLead} />
      </div>
    </Section>
  );
}

import Link from "next/link";
import { PageHero } from "@krizaka/ui/page-hero";
import { Section } from "@krizaka/ui/page";
import { Button } from "@krizaka/ui/button";
import { getDictionary, localizedPath, type Locale } from "@/lib/i18n";
import { jsonLd } from "@/lib/json-ld";
import { absoluteUrl } from "@/lib/seo";
import { KRIZAKA_URL, ORGANIZATION_ID } from "@/lib/site";
import { SubscribeForm } from "./SubscribeForm";
import "./newsletter.css";

/* /newsletter/: the form and what is kept, and why (Loi 25). The three landing pages of the e-mail links: confirmed,
   expired (the form again), unsubscribed. */
/** A page of the newsletter for search engines: a WebPage of the blog, published by the Organization. */
export function newsletterJsonLd(locale: Locale, path: string, name: string, description: string) {
  const t = getDictionary(locale);
  const organization = { "@type": "Organization", "@id": ORGANIZATION_ID, name: "Krizaka", url: KRIZAKA_URL };
  return { "@context": "https://schema.org", "@type": "WebPage", name, description, url: absoluteUrl(locale, path), inLanguage: locale, isPartOf: { "@type": "Blog", name: t.site.name, url: absoluteUrl(locale, "/"), publisher: organization }, publisher: organization };
}

export function NewsletterPage({ locale }: { locale: Locale }) {
  const n = getDictionary(locale).newsletter;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(newsletterJsonLd(locale, "/newsletter", n.title, n.lead)) }} />
      <PageHero eyebrow={n.eyebrow} title={n.title} lead={n.lead} backdrop="plain" linkAs={Link} />
      <Section reveal={false}>
        <div className="bl-nl-card">
          <SubscribeForm title={n.formTitle} showPrivacyLink={false} />
        </div>
      </Section>
      <Section id="privacy" title={n.privacyTitle} divider reveal={false}>
        <ul className="bl-nl-privacy">
          {n.privacy.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Section>
    </>
  );
}

export type NewsletterStatus = "confirmed" | "expired" | "unsubscribed";

export function NewsletterStatusPage({ locale, status }: { locale: Locale; status: NewsletterStatus }) {
  const n = getDictionary(locale).newsletter;
  const title = { confirmed: n.confirmedTitle, expired: n.expiredTitle, unsubscribed: n.unsubscribedTitle }[status];
  const lead = { confirmed: n.confirmedLead, expired: n.expiredLead, unsubscribed: n.unsubscribedLead }[status];
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(newsletterJsonLd(locale, `/newsletter/${status}`, title, lead)) }} />
      <PageHero eyebrow={n.eyebrow} title={title} lead={lead} backdrop="plain" linkAs={Link}>
        <Button asChild variant={status === "confirmed" ? "primary" : "secondary"} shape="cut">
          <Link href={localizedPath(locale, "/")}>{n.backToBlog}</Link>
        </Button>
      </PageHero>
      {status !== "confirmed" && (
        <Section reveal={false}>
          <div className="bl-nl-card">
            <SubscribeForm title={status === "expired" ? n.formTitle : n.resubscribe} />
          </div>
        </Section>
      )}
    </>
  );
}

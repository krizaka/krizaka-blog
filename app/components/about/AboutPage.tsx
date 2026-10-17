import Link from "next/link";
import { PageHero } from "@krizaka/ui/page-hero";
import { Section } from "@krizaka/ui/page";
import { KrizakaLogo } from "@krizaka/ui";
import { getDictionary, type Locale } from "@/lib/i18n";
import { jsonLd } from "@/lib/json-ld";
import { absoluteUrl } from "@/lib/seo";
import { KRIZAKA_URL, ORGANIZATION_ID } from "@/lib/site";
import "./about.css";

/** The About page for search engines: a ProfilePage whose person founded the Organization (the family's root node). */
export function aboutJsonLd(locale: Locale) {
  const t = getDictionary(locale);
  const organization = { "@type": "Organization", "@id": ORGANIZATION_ID, name: "Krizaka", url: KRIZAKA_URL };
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: t.about.title,
    description: t.about.lead,
    url: absoluteUrl(locale, "/about"),
    inLanguage: locale,
    isPartOf: { "@type": "Blog", name: t.site.name, url: absoluteUrl(locale, "/"), publisher: organization },
    mainEntity: { "@type": "Person", name: "Oussama Abid", homeLocation: { "@type": "Place", name: "Montréal" }, worksFor: organization },
    publisher: organization,
  };
}

/* /about/: who writes the blog, as a short story (Montréal since 2018). Every fact is in
   content/authors/oussama.json with its source; no photo until he gives one for this — the slot shows the Krizaka mark. */
export function AboutPage({ locale }: { locale: Locale }) {
  const a = getDictionary(locale).about;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(aboutJsonLd(locale)) }} />
      <PageHero eyebrow={a.eyebrow} title={a.title} lead={a.lead} backdrop="plain" linkAs={Link}>
        <ul className="bl-about-places" aria-label={a.placesLabel}>
          {a.places.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </PageHero>
      <Section reveal={false}>
        <div className="bl-about">
          <figure className="bl-about-slot" aria-label={a.slot}>
            <KrizakaLogo size={64} animated={false} />
          </figure>
          <div className="bl-about-text">
            {a.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}

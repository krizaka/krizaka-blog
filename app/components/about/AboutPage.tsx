import Link from "next/link";
import { PageHero } from "@krizaka/ui/page-hero";
import { Section } from "@krizaka/ui/page";
import { Card } from "@krizaka/ui/card";
import { Badge } from "@krizaka/ui/badge";
import { Separator } from "@krizaka/ui/separator";
import { Button } from "@krizaka/ui/button";
import { WuSamaMark } from "./WuSamaMark";
import { GitHubMark } from "../GitHubMark";
import { GitHubBanner } from "./GitHubBanner";
import { AUTHOR_GITHUB } from "@/lib/author-links";
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
    mainEntity: {
      "@type": "Person",
      name: "Oussama Abid",
      homeLocation: { "@type": "Place", name: "Montréal" },
      sameAs: [AUTHOR_GITHUB.url],
      worksFor: organization,
    },
    publisher: organization,
  };
}

/* The 2011 lab, named at Oussama's request (content/authors/oussama.json, "lab"). */
const LIG_URL = "https://www.liglab.fr/";

/* /about/: who writes the blog. The author is shown by the Wu-sama mark. The home carries only his byline (krizaka-blog#123); the
   note on his first brush with AI, at the LIG in 2011, is told here, after his path. */
export function AboutPage({ locale }: { locale: Locale }) {
  const a = getDictionary(locale).about;
  const bio = a.body.slice(0, -1);
  const mission = a.body[a.body.length - 1];
  const [beforeLab, afterLab] = a.labNote.split("{lab}");

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
        <GitHubBanner label={a.githubLabel} alt={a.bannerAlt} />
        <Card.Root tone="elevated" radius="xl" className="bl-about-card">
          <Card.Body padding="lg" className="bl-about-card-body">
            <div className="bl-about">
              <aside className="bl-about-sidebar">
                <figure className="bl-about-slot" aria-label={a.slot}>
                  <WuSamaMark size={104} />
                </figure>
                <div className="bl-about-profile">
                  <h2 className="bl-about-name">Oussama Abid</h2>
                  <div className="bl-about-badges">
                    <Badge tone="accent" size="sm">
                      {a.role}
                    </Badge>
                    <Badge tone="neutral" size="sm">
                      {a.places[0]}
                    </Badge>
                  </div>
                  <Button asChild variant="secondary" size="sm" className="bl-about-github">
                    <a href={AUTHOR_GITHUB.url} rel="noopener me" target="_blank" aria-label={a.githubLabel}>
                      <GitHubMark size={15} />
                      {a.github}
                    </a>
                  </Button>
                </div>
              </aside>
              <div className="bl-about-content">
                <div className="bl-about-text">
                  {bio.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                  <p>
                    {beforeLab}
                    <a href={LIG_URL} rel="noopener">
                      {a.lab}
                    </a>
                    {afterLab}
                  </p>
                </div>
                <Separator className="bl-about-separator" />
                <div className="bl-about-mission">
                  <p className="bl-about-mission-text">{mission}</p>
                </div>
              </div>
            </div>
          </Card.Body>
        </Card.Root>
      </Section>
    </>
  );
}

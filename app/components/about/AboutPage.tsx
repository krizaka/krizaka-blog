import { Section } from "@krizaka/ui/page";
import { Button } from "@krizaka/ui/button";
import { WuSamaMark } from "./WuSamaMark";
import { TypedLine } from "./TypedLine";
import { Signature } from "../pages/Signature";
import { GitHubMark } from "../GitHubMark";
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

/* /about/: who writes the blog. The page is one notebook sheet, the banner of his GitHub profile rebuilt as real text (founder
   2026-11-01): the squared paper, the red margin and its notes, the Wu-sama mark, the name, his first sentence set large,
   then the rest of his path, the 2011 lab note and his GitHub. No card, no image: every word is a message (FR/EN) and the
   sheet reflows from 360 px up. The mark is decorative: the name beside it says who he is. */
export function AboutPage({ locale }: { locale: Locale }) {
  const a = getDictionary(locale).about;
  const [opening, ...rest] = a.body;
  const path = rest.slice(0, -1);
  const mission = rest[rest.length - 1];
  const [beforeLab, afterLab] = a.labNote.split("{lab}");
  const [notePage] = a.notes;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(aboutJsonLd(locale)) }} />
      <Section reveal={false} spacing="sm" className="bl-about-top">
        <article className="bl-sheet" aria-labelledby="bl-sheet-name">
          <header className="bl-sheet-row bl-sheet-head">
            <span className="bl-sheet-note" aria-hidden="true">
              {notePage}
            </span>
            <div className="bl-sheet-ident">
              <WuSamaMark size={112} emblem className="bl-sheet-mark" />
              <div className="bl-sheet-names">
                <p className="bl-sheet-kicker">{a.kicker}</p>
                <h1 id="bl-sheet-name" className="bl-sheet-name">
                  {a.name}
                </h1>
                <TypedLine className="bl-sheet-line" text={a.line} />
              </div>
            </div>
          </header>
          <p className="bl-sheet-caption">{a.caption}</p>
        </article>
      </Section>
      <Section reveal={false} spacing="sm">
        <div className="bl-about-body">
          <div className="bl-sheet-text">
            <p className="bl-sheet-opening">{opening}</p>
            {path.map((p) => (
              <p key={p}>{p}</p>
            ))}
            <p>
              {beforeLab}
              <a href={LIG_URL} rel="noopener">
                {a.lab}
              </a>
              {afterLab}
            </p>
            <p className="bl-sheet-mission">{mission}</p>
            <div className="bl-sheet-actions">
              <Button asChild variant="secondary" size="md">
                <a href={AUTHOR_GITHUB.url} rel="noopener me" target="_blank" aria-label={a.githubLabel}>
                  <GitHubMark size={16} />
                  {a.github}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </Section>
      <Section reveal={false} spacing="sm">
        <Signature locale={locale} />
      </Section>
    </>
  );
}

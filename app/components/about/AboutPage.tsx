import Link from "next/link";
import { PageHero } from "@krizaka/ui/page-hero";
import { Section } from "@krizaka/ui/page";
import { KrizakaLogo } from "@krizaka/ui";
import { getDictionary, type Locale } from "@/lib/i18n";
import "./about.css";

/* /about/: who writes the blog, as a short story (Oujda → Grenoble → Montréal). Every fact is in
   content/authors/oussama.json with its source; no photo until he gives one for this — the slot shows the Krizaka mark. */
export function AboutPage({ locale }: { locale: Locale }) {
  const a = getDictionary(locale).about;
  return (
    <>
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

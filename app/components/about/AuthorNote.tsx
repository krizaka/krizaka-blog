import Link from "next/link";
import { Section } from "@krizaka/ui/page";
import { WuSamaMark } from "./WuSamaMark";
import { getDictionary, localizedPath, type Locale } from "@/lib/i18n";
import "./about.css";

/* The 2011 lab, named at Oussama's request (content/authors/oussama.json, "lab"). */
const LIG_URL = "https://www.liglab.fr/";

/* The home's "who writes": three sentences and the way to the full story (/about/). One mount line in HomePage. */
export function AuthorNote({ locale }: { locale: Locale }) {
  const a = getDictionary(locale).about;
  const [before, after] = a.homeBody.split("{lab}");
  return (
    <Section id="who-writes" title={a.homeTitle} divider>
      <div className="bl-author">
        <span className="bl-author-mark" aria-hidden="true">
          <WuSamaMark size={32} />
        </span>
        <div className="bl-author-body">
          <p className="bl-author-text">
            {before}
            <a href={LIG_URL} rel="noopener" className="bl-author-link no-underline hover:no-underline">
              {a.homeLab}
            </a>
            {after}
          </p>
          <Link href={localizedPath(locale, "/about")} className="bl-author-more no-underline hover:no-underline">
            <span>{a.homeLink}</span>
            <span aria-hidden="true" className="bl-author-arrow">→</span>
          </Link>
        </div>
      </div>
    </Section>
  );
}

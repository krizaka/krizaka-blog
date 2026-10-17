import Link from "next/link";
import { Section } from "@krizaka/ui/page";
import { KrizakaLogo } from "@krizaka/ui";
import { getDictionary, localizedPath, type Locale } from "@/lib/i18n";
import "./about.css";

/* The home's "who writes": three sentences and the way to the full story (/about/). One mount line in HomePage. */
export function AuthorNote({ locale }: { locale: Locale }) {
  const a = getDictionary(locale).about;
  return (
    <Section id="who-writes" title={a.homeTitle} divider>
      <div className="bl-author">
        <span className="bl-author-mark" aria-hidden="true">
          <KrizakaLogo size={30} animated={false} />
        </span>
        <div>
          <p>{a.homeBody}</p>
          <Link href={localizedPath(locale, "/about")}>{a.homeLink}</Link>
        </div>
      </div>
    </Section>
  );
}

import Link from "next/link";
import { PageHero } from "@krizaka/ui/page-hero";
import { Section } from "@krizaka/ui/page";
import { getDictionary, localizedPath, type Locale } from "@/lib/i18n";
import { postsOf } from "@/lib/posts";
import { absoluteUrl, postPath } from "@/lib/seo";
import { jsonLd } from "@/lib/json-ld";
import { newsletterJsonLd } from "../newsletter/NewsletterPages";
import { SubscribeForm } from "../newsletter/SubscribeForm";
import { PostList } from "../pages/PostList";
import { RssMark } from "../RssMark";
import { CopyField } from "./CopyField";
import "../newsletter/newsletter.css";
import "./feed.css";

/* /feed/ (template: how-it-works): the human page about the feeds, replacing the XSLT page of /feed.xml (Chrome is removing XSLT).
   The e-mail form comes first — the way most people want to follow — then RSS: what it is, the address to copy, the Atom file, and the
   latest posts. /feed.xml itself stays pure RSS, for readers. */
export default function FeedPage({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const f = t.feedPage;
  const posts = postsOf(locale).slice(0, 5);
  const feedUrl = absoluteUrl(locale, "/feed.xml").replace(/\/$/, "");
  const atomUrl = absoluteUrl(locale, "/atom.xml").replace(/\/$/, "");
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(newsletterJsonLd(locale, "/feed", f.title, f.lead)) }} />
      <PageHero eyebrow={f.eyebrow} title={f.title} lead={f.lead} backdrop="plain" linkAs={Link} />
      <Section id="subscribe" title={f.emailTitle} lead={f.emailLead} reveal={false}>
        <div className="bl-nl-card">
          <SubscribeForm id="nl-feed" />
        </div>
      </Section>
      <Section title={f.rssTitle} lead={f.rssWhat} divider reveal={false}>
        <CopyField id="feed-address" label={f.addressLabel} value={feedUrl} />
        <p className="bl-feed-links">
          <a href={atomUrl}>
            <RssMark size={14} />
            {f.atom}
          </a>
          <a href="https://aboutfeeds.com/" target="_blank" rel="noopener noreferrer">
            {f.reader}
          </a>
        </p>
      </Section>
      {posts.length > 0 && (
        <Section title={f.latest} divider reveal={false}>
          <PostList posts={posts} locale={locale} reveal={false} />
          <p className="bl-feed-links">
            <Link href={localizedPath(locale, "/")}>{t.post.back}</Link>
          </p>
        </Section>
      )}
    </>
  );
}

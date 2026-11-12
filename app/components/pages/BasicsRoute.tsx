import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RetiredPost, { retiredMetadata } from "./RetiredPost";
import PostPage from "./PostPage";
import type { Locale } from "@/lib/i18n";
import { postOf, postsOf, translationOf } from "@/lib/posts";
import { basicsStubSlugs, basicsStubTarget, pageKey, retiredTarget } from "@/lib/retired";
import { postMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

/* « Les bases »: the shelf's live posts at /basics/<slug>/ (EN) and /fr/basics/<slug>/ (FR), and a stub at the address of a withdrawn
   one (lib/redirects.json, `page:/basics/<slug>/`). `output: export` needs one param: a placeholder renders the 404.
   One definition for both languages: each route file only binds its locale. */
export function basicsRoute(locale: Locale) {
  const retiredKey = (slug: string) => pageKey(`/basics/${slug}/`);
  return {
    generateStaticParams: () => {
      const live = postsOf(locale).map((p) => p.slug);
      const params = [...live, ...basicsStubSlugs(locale, new Set(live))].map((slug) => ({ slug }));
      return params.length ? params : [{ slug: "_" }];
    },
    generateMetadata: async ({ params }: Props): Promise<Metadata> => {
      const slug = (await params).slug;
      const post = postOf(locale, slug);
      const retired = basicsStubTarget(locale, slug);
      if (!post) return retired ? retiredMetadata(locale, retired) : {};
      return postMetadata(post, translationOf(post) ? ["en", "fr"] : [locale]);
    },
    Page: async ({ params }: Props) => {
      const slug = (await params).slug;
      const post = postOf(locale, slug);
      if (!post && basicsStubTarget(locale, slug))
        return <RetiredPost locale={locale} slug={retiredTarget(locale, retiredKey(slug)) ? retiredKey(slug) : slug} />;
      if (!post) notFound();
      return <PostPage post={post} />;
    },
  };
}

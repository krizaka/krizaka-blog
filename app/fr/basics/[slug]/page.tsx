import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PostPage from "@/app/components/pages/PostPage";
import RetiredPost, { retiredMetadata } from "@/app/components/pages/RetiredPost";
import { pageKey, retiredPagesUnder, retiredTarget } from "@/lib/retired";
import { postOf, postsOf, translationOf } from "@/lib/posts";
import { postMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;

/* « Les bases »: the shelf's live posts at /basics/<slug>/, and a stub at the address of a withdrawn one (lib/redirects.json,
   `page:/basics/<slug>/`). `output: export` needs one param: a placeholder renders the 404. */
const retiredKey = (slug: string) => pageKey(`/basics/${slug}/`);
export const generateStaticParams = () => {
  const params = [
    ...postsOf("fr").map((p) => ({ slug: p.slug })),
    ...retiredPagesUnder("/basics/").map((slug) => ({ slug })),
  ];
  return params.length ? params : [{ slug: "_" }];
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).slug;
  const post = postOf("fr", slug);
  const retired = retiredTarget("fr", retiredKey(slug));
  if (!post) return retired ? retiredMetadata("fr", retired) : {};
  return postMetadata(post, translationOf(post) ? ["en", "fr"] : ["fr"]);
}

export default async function Page({ params }: Props) {
  const slug = (await params).slug;
  const post = postOf("fr", slug);
  if (!post && retiredTarget("fr", retiredKey(slug))) return <RetiredPost locale="fr" slug={retiredKey(slug)} />;
  if (!post) notFound();
  return <PostPage post={post} />;
}

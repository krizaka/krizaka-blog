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
    ...postsOf("en").map((p) => ({ slug: p.slug })),
    ...retiredPagesUnder("/basics/").map((slug) => ({ slug })),
  ];
  return params.length ? params : [{ slug: "_" }];
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).slug;
  const post = postOf("en", slug);
  const retired = retiredTarget("en", retiredKey(slug));
  if (!post) return retired ? retiredMetadata("en", retired) : {};
  return postMetadata(post, translationOf(post) ? ["en", "fr"] : ["en"]);
}

export default async function Page({ params }: Props) {
  const slug = (await params).slug;
  const post = postOf("en", slug);
  if (!post && retiredTarget("en", retiredKey(slug))) return <RetiredPost locale="en" slug={retiredKey(slug)} />;
  if (!post) notFound();
  return <PostPage post={post} />;
}

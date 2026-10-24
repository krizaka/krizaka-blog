import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PostPage from "@/app/components/pages/PostPage";
import RetiredPost, { retiredMetadata } from "@/app/components/pages/RetiredPost";
import { postOf, postsOf, translationOf } from "@/lib/posts";
import { postMetadata } from "@/lib/seo";
import { retiredSlugs, retiredTarget } from "@/lib/retired";

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;

/* Live posts, then the stubs of the retired ones (lib/retired.ts). `output: export` needs one param: with nothing, a placeholder that renders the 404. */
export const generateStaticParams = () => {
  const params = [...postsOf("en").map((p) => ({ slug: p.slug })), ...retiredSlugs().map((slug) => ({ slug }))];
  return params.length ? params : [{ slug: "_" }];
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).slug;
  const post = postOf("en", slug);
  if (!post) {
    const target = retiredTarget("en", slug);
    return target ? retiredMetadata("en", target) : {};
  }
  return postMetadata(post, translationOf(post) ? ["en", "fr"] : ["en"]);
}

export default async function Page({ params }: Props) {
  const slug = (await params).slug;
  const post = postOf("en", slug);
  if (!post) {
    if (!retiredTarget("en", slug)) notFound();
    return <RetiredPost locale="en" slug={slug} />;
  }
  return <PostPage post={post} />;
}

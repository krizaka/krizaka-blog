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
  const params = [...postsOf("fr").map((p) => ({ slug: p.slug })), ...retiredSlugs().map((slug) => ({ slug }))];
  return params.length ? params : [{ slug: "_" }];
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).slug;
  const post = postOf("fr", slug);
  if (!post) {
    const target = retiredTarget("fr", slug);
    return target ? retiredMetadata("fr", target) : {};
  }
  return postMetadata(post, translationOf(post) ? ["en", "fr"] : ["fr"]);
}

export default async function Page({ params }: Props) {
  const slug = (await params).slug;
  const post = postOf("fr", slug);
  if (!post) {
    if (!retiredTarget("fr", slug)) notFound();
    return <RetiredPost locale="fr" slug={slug} />;
  }
  return <PostPage post={post} />;
}

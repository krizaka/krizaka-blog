import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PostPage from "@/app/components/pages/PostPage";
import { postOf, postsOf, translationOf } from "@/lib/posts";
import { postMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;

/* « Les bases »: the shelf's live posts at /basics/<slug>/ (`output: export` needs one param: a placeholder renders the 404). */
export const generateStaticParams = () => {
  const params = postsOf("en").map((p) => ({ slug: p.slug }));
  return params.length ? params : [{ slug: "_" }];
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).slug;
  const post = postOf("en", slug);
  if (!post) return {};
  return postMetadata(post, translationOf(post) ? ["en", "fr"] : ["en"]);
}

export default async function Page({ params }: Props) {
  const slug = (await params).slug;
  const post = postOf("en", slug);
  if (!post) notFound();
  return <PostPage post={post} />;
}

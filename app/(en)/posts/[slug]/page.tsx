import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PostPage from "@/app/components/pages/PostPage";
import { postOf, postsOf, translationOf } from "@/lib/posts";
import { ogUrl, pageMetadata, postPath } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;

/* `output: export` needs one param: with no post yet, a placeholder that renders the 404. */
export const generateStaticParams = () => (postsOf("en").length ? postsOf("en").map((p) => ({ slug: p.slug })) : [{ slug: "_" }]);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = postOf("en", (await params).slug);
  if (!post) return {};
  return pageMetadata({ locale: "en", path: postPath(post.slug), title: post.title, description: post.description, type: "article", published: post.date, image: post.image ?? ogUrl("en", post.slug), alternates: translationOf(post) ? ["en", "fr"] : ["en"] });
}

export default async function Page({ params }: Props) {
  const post = postOf("en", (await params).slug);
  if (!post) notFound();
  return <PostPage post={post} />;
}

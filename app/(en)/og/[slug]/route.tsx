import { ogImage } from "@/lib/og";
import { postOf, postsOf } from "@/lib/posts";

export const dynamic = "force-static";
export const dynamicParams = false;
export const generateStaticParams = () =>
  postsOf("en").length ? postsOf("en").map((p) => ({ slug: p.slug + ".png" })) : [{ slug: "_.png" }];

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const post = postOf("en", (await params).slug.replace(/\.png$/, ""));
  return ogImage("en", post?.title, post ? post.tags : [], post?.cover);
}

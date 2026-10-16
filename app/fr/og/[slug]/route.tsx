import { ogImage } from "@/lib/og";
import { postOf, postsOf } from "@/lib/posts";

export const dynamic = "force-static";
export const dynamicParams = false;
export const generateStaticParams = () => (postsOf("fr").length ? postsOf("fr").map((p) => ({ slug: p.slug + ".png" })) : [{ slug: "_.png" }]);

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const post = postOf("fr", (await params).slug.replace(/\.png$/, ""));
  return ogImage("fr", post?.title, post ? post.tags : []);
}

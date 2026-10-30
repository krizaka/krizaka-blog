import { ogImage } from "@/lib/og";
import { chapterOf, chaptersOf } from "@/lib/chapters";

export const dynamic = "force-static";
export const dynamicParams = false;
export const generateStaticParams = () =>
  chaptersOf("en").length ? chaptersOf("en").map((c) => ({ slug: c.slug + ".png" })) : [{ slug: "_.png" }];

/* A chapter's card: its title and its cover, as a post's. */
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const chapter = chapterOf("en", (await params).slug.replace(/\.png$/, ""));
  return ogImage("en", chapter?.title, chapter ? chapter.tags : [], chapter?.cover);
}

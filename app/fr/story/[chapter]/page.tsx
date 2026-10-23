import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ChapterPage from "@/app/components/pages/ChapterPage";
import { chapterOf, chaptersOf, chapterTranslationOf } from "@/lib/chapters";
import { chapterOgUrl, chapterPath, postMetadata } from "@/lib/seo";

type Props = { params: Promise<{ chapter: string }> };
export const dynamicParams = false;

/* `output: export` needs one param: with no chapter yet, a placeholder that renders the 404. */
export const generateStaticParams = () => (chaptersOf("fr").length ? chaptersOf("fr").map((c) => ({ chapter: c.slug })) : [{ chapter: "_" }]);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const chapter = chapterOf("fr", (await params).chapter);
  if (!chapter) return {};
  return postMetadata(chapter, chapterTranslationOf(chapter) ? ["en", "fr"] : ["fr"], chapterPath(chapter.slug), chapterOgUrl("fr", chapter.slug));
}

export default async function Page({ params }: Props) {
  const chapter = chapterOf("fr", (await params).chapter);
  if (!chapter) notFound();
  return <ChapterPage chapter={chapter} />;
}

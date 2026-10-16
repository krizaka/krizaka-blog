import type { Metadata } from "next";
import { TagPage } from "@/app/components/pages/TagsPage";
import { tagLabel } from "@/app/components/pages/tag-label";
import { format, getDictionary } from "@/lib/i18n";
import { tagsOf } from "@/lib/posts";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ tag: string }> };
export const dynamicParams = false;

export const generateStaticParams = () => (tagsOf("fr").length ? tagsOf("fr").map(({ tag }) => ({ tag })) : [{ tag: "_" }]);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;
  const t = getDictionary("fr");
  return pageMetadata({ locale: "fr", path: "/tags/" + tag, title: format(t.tags.oneTitle, { tag: tagLabel("fr", tag) }), description: t.tags.oneLead });
}

export default async function Page({ params }: Props) {
  return <TagPage locale="fr" tag={(await params).tag} />;
}

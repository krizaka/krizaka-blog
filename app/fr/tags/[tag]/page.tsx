import type { Metadata } from "next";
import { TagPage } from "@/app/components/pages/TagsPage";
import { tagSeo } from "@/app/components/pages/tag-label";
import { tagsOf } from "@/lib/posts";
import { LOCALES } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ tag: string }> };
export const dynamicParams = false;

export const generateStaticParams = () => (tagsOf("fr").length ? tagsOf("fr").map(({ tag }) => ({ tag })) : [{ tag: "_" }]);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;
  const seo = tagSeo("fr", tag);
  return pageMetadata({ locale: "fr", path: "/tags/" + tag, title: seo.title, absoluteTitle: seo.absolute, description: seo.description, alternates: LOCALES.filter((l) => tagsOf(l).some((x) => x.tag === tag)) });
}

export default async function Page({ params }: Props) {
  return <TagPage locale="fr" tag={(await params).tag} />;
}

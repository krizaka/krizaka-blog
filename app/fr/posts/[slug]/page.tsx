import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RetiredPost, { retiredMetadata } from "@/app/components/pages/RetiredPost";
import { retiredSlugs, retiredTarget } from "@/lib/retired";

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;

/* Only the stubs of the retired posts (lib/retired.ts): a removed post's address goes to its chapter, a shelf post's to /basics/.
   The live posts are at /basics/<slug>/. `output: export` needs one param: with nothing, a placeholder that renders the 404. */
export const generateStaticParams = () => {
  const params = retiredSlugs().map((slug) => ({ slug }));
  return params.length ? params : [{ slug: "_" }];
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).slug;
  const target = retiredTarget("fr", slug);
  return target ? retiredMetadata("fr", target) : {};
}

export default async function Page({ params }: Props) {
  const slug = (await params).slug;
  if (!retiredTarget("fr", slug)) notFound();
  return <RetiredPost locale="fr" slug={slug} />;
}

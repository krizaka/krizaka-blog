import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RetiredPost, { retiredMetadata } from "@/app/components/pages/RetiredPost";
import { pageKey, retiredPagesUnder, retiredTarget } from "@/lib/retired";

type Props = { params: Promise<{ tag: string }> };
export const dynamicParams = false;

/* The topic pages are removed (krizaka-blog#123): each address is a stub to the chapter that absorbed it, a shelf post, or the story. */
export const generateStaticParams = () => retiredPagesUnder("/tags/").map((tag) => ({ tag }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const target = retiredTarget("en", pageKey(`/tags/${(await params).tag}/`));
  return target ? retiredMetadata("en", target) : {};
}

export default async function Page({ params }: Props) {
  const key = pageKey(`/tags/${(await params).tag}/`);
  if (!retiredTarget("en", key)) notFound();
  return <RetiredPost locale="en" slug={key} />;
}

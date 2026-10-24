import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RetiredPost, { retiredMetadata } from "@/app/components/pages/RetiredPost";
import { retiredSeriesIds, retiredTarget } from "@/lib/retired";

type Props = { params: Promise<{ series: string }> };
export const dynamicParams = false;

/* A series is retired: its address is a stub to the story (the home) or to « Les bases » (lib/redirects.json, `series:<id>`). */
export const generateStaticParams = () => {
  const params = retiredSeriesIds().map((series) => ({ series }));
  return params.length ? params : [{ series: "_" }];
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { series } = await params;
  const target = retiredTarget("en", `series:${series}`);
  return target ? retiredMetadata("en", target) : {};
}

export default async function Page({ params }: Props) {
  const { series } = await params;
  if (!retiredTarget("en", `series:${series}`)) notFound();
  return <RetiredPost locale="en" slug={`series:${series}`} />;
}

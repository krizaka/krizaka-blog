import type { Metadata } from "next";
import { SeriesPage, seriesLead, seriesName } from "@/app/components/pages/SeriesPage";
import { seriesOf } from "@/lib/posts";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ series: string }> };
export const dynamicParams = false;

export const generateStaticParams = () => (seriesOf("en").length ? seriesOf("en").map(({ series }) => ({ series })) : [{ series: "_" }]);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { series } = await params;
  return pageMetadata({ locale: "en", path: "/series/" + series, title: seriesName("en", series), description: seriesLead("en", series) });
}

export default async function Page({ params }: Props) {
  return <SeriesPage locale="en" series={(await params).series} />;
}

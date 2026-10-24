import type { Metadata } from "next";
import RetiredPost, { retiredMetadata } from "@/app/components/pages/RetiredPost";
import { pageKey, retiredTarget } from "@/lib/retired";

/* A removed page (krizaka-blog#123: the blog is one page, the story): a stub to where it went (lib/redirects.json). */
const key = pageKey("/series/");
export const metadata: Metadata = retiredMetadata("fr", retiredTarget("fr", key)!);

export default function Page() {
  return <RetiredPost locale="fr" slug={key} />;
}

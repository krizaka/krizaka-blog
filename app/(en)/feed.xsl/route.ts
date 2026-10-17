import { getDictionary } from "@/lib/i18n";
import { feedXsl } from "@/lib/feed-xsl";

export const dynamic = "force-static";
/* One stylesheet for both feeds (it picks the words by the channel's language). */
export const GET = () =>
  new Response(feedXsl(getDictionary("en").feedPage, getDictionary("fr").feedPage), { headers: { "Content-Type": "text/xsl; charset=utf-8" } });

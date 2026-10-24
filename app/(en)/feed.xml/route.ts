import { rss, feedEntriesOf } from "@/lib/feeds";

export const dynamic = "force-static";
export const GET = () => new Response(rss("en", feedEntriesOf("en")), { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });

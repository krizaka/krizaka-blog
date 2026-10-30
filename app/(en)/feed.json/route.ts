import { feedEntriesOf, jsonFeed } from "@/lib/feeds";

export const dynamic = "force-static";
export const GET = () =>
  new Response(jsonFeed("en", feedEntriesOf("en")), {
    headers: { "Content-Type": "application/feed+json; charset=utf-8" },
  });

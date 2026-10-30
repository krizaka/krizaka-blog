import { feedEntriesOf, jsonFeed } from "@/lib/feeds";

export const dynamic = "force-static";
export const GET = () =>
  new Response(jsonFeed("fr", feedEntriesOf("fr")), {
    headers: { "Content-Type": "application/feed+json; charset=utf-8" },
  });

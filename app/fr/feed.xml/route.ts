import { rss } from "@/lib/feeds";
import { postsOf } from "@/lib/posts";

export const dynamic = "force-static";
export const GET = () => new Response(rss("fr", postsOf("fr")), { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });

import { atom } from "@/lib/feeds";
import { postsOf } from "@/lib/posts";

export const dynamic = "force-static";
export const GET = () => new Response(atom("en", postsOf("en")), { headers: { "Content-Type": "application/atom+xml; charset=utf-8" } });

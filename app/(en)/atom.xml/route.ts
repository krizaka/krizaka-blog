import { atom, feedEntriesOf } from "@/lib/feeds";

export const dynamic = "force-static";
export const GET = () => new Response(atom("en", feedEntriesOf("en")), { headers: { "Content-Type": "application/atom+xml; charset=utf-8" } });

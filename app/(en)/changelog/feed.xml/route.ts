import { changelogFeed } from "@/lib/changelog-feed";

export const dynamic = "force-static";
export const GET = () => changelogFeed("en");

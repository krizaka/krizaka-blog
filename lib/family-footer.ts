/* The footer's « Open source » column, read from the family of @krizaka/org (`org.members`, krizaka-internal#4120): never a
   name or an address typed here. Same reading as krizaka.com's `lib/family-footer.ts` (a small local reader until the kit
   offers it, krizaka-internal#3781): a member is linked only where something answers — its site when the data says it is
   live (`urls.siteLive`), else its public repository, else nothing. Krizaka Rust leads, the family's order follows. */
import { org } from "@krizaka/org";

type Member = (typeof org.members)[number];
type Group = "open-source" | "github";

const FIRST: Record<Group, readonly string[]> = { "open-source": ["rust"], github: [] };

/** Where a member's link goes: its site only if it answers, else its public repository, else nowhere. */
export function linkOf(member: Pick<Member, "urls">): string | null {
  const { site, siteLive, repo } = member.urls;
  return siteLive && site ? site : repo;
}

export function membersOf(group: Group, members: readonly Member[] = org.members): Member[] {
  const lead = FIRST[group];
  const rank = (m: Member) => {
    const i = lead.indexOf(m.id);
    return i === -1 ? lead.length : i;
  };
  return members
    .filter((m) => m.group === group && m.visibility === "public")
    .toSorted((a, b) => rank(a) - rank(b) || a.order - b.order);
}

export function footerLinks(group: Group, members: readonly Member[] = org.members) {
  return membersOf(group, members).flatMap((m) => {
    const href = linkOf(m);
    return href ? [{ label: m.name, href, external: true as const }] : [];
  });
}

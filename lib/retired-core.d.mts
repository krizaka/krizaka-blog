type RedirectMap = Record<string, Record<string, string>>;
export function stubHref(map: RedirectMap, locale: string, slug: string): string | undefined;
export function stubSlugs(map: RedirectMap, locale: string, live: Set<string>): string[];

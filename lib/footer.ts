/* The footer as an admin would configure it, the same as krizaka.com's (founder, 2026-11-05: the blog still drew the old
   one). The exact shape the apps store in their settings (`FooterSettings` of @krizaka/ui/site-footer), valid by the same
   rules (`footerSettingsProblems`). Words are message keys (`footer.*`) or proper nouns; the products' names and addresses
   are @krizaka/org's (commercial names, www domains), never a code name. Three columns as on www — Products, Open source,
   Krizaka — then the blog's own, then one legal line that names the company once. Links to www.krizaka.com are absolute
   and take the reader's language (`localized`); the blog's own links are unprefixed paths, prefixed by the renderer. */
import type { FooterSettings } from "@krizaka/ui/site-footer";
import { brandOf, displayName } from "@krizaka/org";

import { localizedPath, type Locale } from "./locale.ts";
import { COMPANY, GITHUB_ORG_URL, JAVA_URL, KRIZAKA_URL, LAB_URL, OPEN_SOURCE_URL, TS_URL, UI_URL } from "./site.ts";

const PRODUCT_IDS = ["orazaka", "yomizaka", "akinaza"] as const;
const www = (path: string) => `${KRIZAKA_URL}${path}`;

export const footerSettings = {
  labelKey: "footer.aria",
  columns: [
    {
      id: "products",
      titleKey: "footer.products",
      // Every product is in development: said once, on the heading, as on krizaka.com.
      status: "development",
      links: PRODUCT_IDS.map((id) => ({
        label: displayName(id),
        href: brandOf(id).domains.site.replace(/\/$/, ""),
        external: true,
      })),
    },
    {
      id: "open-source",
      titleKey: "footer.openSourceColumn",
      links: [
        { labelKey: "footer.allOpenSource", href: OPEN_SOURCE_URL, external: true },
        { label: "Krizaka UI", href: UI_URL, external: true },
        { label: "Krizaka Lab", href: LAB_URL, external: true },
        { label: "Krizaka Java", href: JAVA_URL, external: true },
        { label: "Krizaka TypeScript", href: TS_URL, external: true },
        { label: "GitHub", href: GITHUB_ORG_URL, external: true },
      ],
    },
    {
      id: "company",
      titleKey: "footer.companyColumn",
      links: [
        { labelKey: "footer.services", href: www("/services"), external: true },
        { labelKey: "footer.companyStory", href: www("/story"), external: true },
        { labelKey: "footer.changelog", href: www("/changelog"), external: true },
        { labelKey: "footer.contact", href: www("/contact"), external: true },
      ],
    },
    {
      id: "blog",
      titleKey: "footer.blogColumn",
      links: [
        { labelKey: "footer.readStory", href: "/" },
        { labelKey: "footer.basics", href: "/basics" },
        { labelKey: "footer.newsletter", href: "/newsletter" },
        { labelKey: "footer.rss", href: "/feed.xml" },
        { labelKey: "footer.atom", href: "/atom.xml" },
        { labelKey: "footer.about", href: "/about" },
      ],
    },
  ],
  legal: {
    legalName: COMPANY.legalName,
    neq: COMPANY.neq,
    city: COMPANY.city,
    showVersion: false,
    links: [
      { labelKey: "footer.privacy", href: www("/privacy"), external: true },
      { labelKey: "footer.terms", href: www("/terms"), external: true },
    ],
  },
  social: [],
} satisfies FooterSettings;

/** A message key (`footer.about`) read in a dictionary; a missing key fails loudly (the build), never prints a key. */
export function messageAt(dictionary: unknown, key: string): string {
  const value = key
    .split(".")
    .reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], dictionary);
  if (typeof value !== "string") throw new Error(`footer: no message at ${key}`);
  return value;
}

/** The address in the reader's language: www.krizaka.com's pages take `/<locale>`, other sites are unchanged, the blog's
    own paths take its prefix (`/fr/about/`; a feed file keeps no trailing slash). */
export function localized(href: string, locale: Locale): string {
  if (href.startsWith(`${KRIZAKA_URL}/`)) return `${KRIZAKA_URL}/${locale}${href.slice(KRIZAKA_URL.length)}`;
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return href;
  if (/\.[a-z]+$/.test(href)) return `${locale === "en" ? "" : "/fr"}${href}`;
  return localizedPath(locale, href);
}

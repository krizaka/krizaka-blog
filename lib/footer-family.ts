import type { SiteId } from "@krizaka/ui/sites";

/* The products the footer lists, the same focus as krizaka.com (its lib/focus.ts: Orazaka, Akinaza, Yomizaka). The other
   products stay in the family registry (@krizaka/ui/sites) and are not listed here. @krizaka/ui has no flag for this
   focus, so the blog passes it as the footer's `products`; tests/footer-family.test.mjs checks each id against the package. */
export const FOOTER_PRODUCT_IDS: readonly SiteId[] = ["orazaka", "akinaza", "yomizaka"];

"use client";

import { resolveFooterSettings, SiteFooter as FamilyFooter } from "@krizaka/ui/site-footer";
import { familyLabels } from "@krizaka/ui/sites";
import { useI18n } from "./I18nProvider";
import { footerSettings, localized, messageAt } from "@/lib/footer";

/* The footer is @krizaka/ui's SiteFooter drawn from `config`, the same as krizaka.com's (founder, 2026-11-05):
   lib/footer.ts holds it in the exact settings shape the apps store, this component only resolves its words and the
   reader's language. Products · Open source · Krizaka, the blog's own column, then one legal line that names the company
   once. Rendered once, by the root layout, outside <main>: the page's single contentinfo. */
export default function SiteFooter() {
  const { locale, t } = useI18n();
  const settings = {
    ...footerSettings,
    columns: footerSettings.columns.map((c) => ({
      ...c,
      links: c.links.map((l) => ({ ...l, href: localized(l.href, locale) })),
    })),
    legal: {
      ...footerSettings.legal,
      links: footerSettings.legal.links.map((l) => ({ ...l, href: localized(l.href, locale) })),
    },
  };
  const config = resolveFooterSettings(settings, (key) => messageAt({ footer: t.footer }, key));
  return <FamilyFooter current="krizaka" variant="site" labels={familyLabels[locale]} config={config} />;
}

"use client";

/* The bar, built on @krizaka/ui's NavBar: the blog is one page (krizaka-blog#123), so the bar is the mark, the language and the
   theme — nothing else. No sections, no topics, no search, no second bar: the mark is the way home (the story), the footer
   carries the rest (the chapters, À propos, the feeds, the family). The language is the family's switch (`NavBar.Language`).
   Rendered once, by SiteRoot, on every page; the same on a phone (there is nothing to fold into a menu). */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoonIcon, SunIcon } from "@krizaka/icons";
import { KrizakaLogo } from "@krizaka/ui";
import { Button } from "@krizaka/ui/button";
import { NavBar } from "@krizaka/ui/nav-bar";
import { languageNames } from "@krizaka/ui/language-switch";
import { LOCALES, languageSwitchPath, localizedPath, splitLocale } from "@/lib/locale";
import { useI18n } from "./I18nProvider";
import { useSiteTheme } from "./SiteTheme";

/** @param translated the slugs of the posts that exist in both languages, so the switch keeps the reader on the same post. */
export default function TopBar({ translated }: { translated: readonly string[] }) {
  const { locale, t } = useI18n();
  const b = t.bar;
  const { theme, toggleTheme } = useSiteTheme();
  const { path } = splitLocale(usePathname() ?? "/");
  const home = localizedPath(locale, "/");
  const page = path === "/" ? "/" : path.replace(/\/$/, "");
  /* Each language lands on the same page in it (a post on its translation), else on that language's home. */
  const languages = LOCALES.map((code) => ({ code, name: languageNames[code] ?? code, href: code === locale ? localizedPath(code, page) : languageSwitchPath(code, page, translated) }));

  return (
    <div className="kz-site-bar-wrap pointer-events-none fixed inset-x-0 top-3 z-50">
      <NavBar.Root label={b.aria} className="kz-site-bar pointer-events-auto">
        <NavBar.Brand asChild>
          <Link href={home}>
            <KrizakaLogo size={26} />
            {t.site.name}
          </Link>
        </NavBar.Brand>

        <NavBar.Actions className="gap-1.5">
          <NavBar.Language label={b.language} current={locale} languages={languages} linkAs={Link} />
          <Button type="button" variant="ghost" size="icon" shape="pill" onClick={toggleTheme} aria-label={theme === "dark" ? b.toLight : b.toDark} className="h-9 w-9">
            {theme === "dark" ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          </Button>
        </NavBar.Actions>
      </NavBar.Root>
    </div>
  );
}

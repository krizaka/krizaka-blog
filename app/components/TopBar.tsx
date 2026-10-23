"use client";

/* The bar, built on @krizaka/ui's NavBar, in the three zones of every Krizaka site. Left: the Krizaka mark and the blog's name.
   Centre: this site's sections, from lib/bar.ts (« L'histoire »). Right: search (⌘K) · the saved bookmark (only when the reader has
   saved something) · GitHub · theme · language · the way back to krizaka.com. Rendered once, by SiteRoot, on every page. */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookmarkIcon, GlobeIcon, MoonIcon, SearchIcon, SunIcon } from "@krizaka/icons";
import { KrizakaLogo } from "@krizaka/ui";
import { Button } from "@krizaka/ui/button";
import { NavBar } from "@krizaka/ui/nav-bar";
import { SearchField } from "@krizaka/ui/search-field";
import { barCentre } from "@/lib/bar";
import { languageSwitchPath, localizedPath, splitLocale } from "@/lib/locale";
import { GITHUB_ORG_URL, KRIZAKA_URL, REPOSITORY_URL } from "@/lib/site";
import { useSaved } from "./engage/useSaved";
import { GitHubMark } from "./GitHubMark";
import { useI18n } from "./I18nProvider";
import { useSiteTheme } from "./SiteTheme";

/** @param translated the slugs of the posts that exist in both languages, so the switch keeps the reader on the same post. */
export default function TopBar({ translated }: { translated: readonly string[] }) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const b = t.bar;
  const { theme, toggleTheme } = useSiteTheme();
  const { saved } = useSaved();
  const { path } = splitLocale(usePathname() ?? "/");
  const other = locale === "en" ? "fr" : "en";
  const home = localizedPath(locale, "/");
  const search = localizedPath(locale, "/search");
  const savedHref = localizedPath(locale, "/saved");
  const feed = localizedPath(locale, "/feed");
  const centre = barCentre(locale, path);
  /* The language switch lands on the same page in the other language (a post on its translation), else on that language's home. */
  const switchTo = languageSwitchPath(other, path === "/" ? "/" : path.replace(/\/$/, ""), translated);

  return (
    <div className="kz-site-bar-wrap pointer-events-none fixed inset-x-0 top-3 z-50">
      <NavBar.Root label={b.aria} className="kz-site-bar pointer-events-auto">
        <NavBar.Brand asChild>
          <Link href={home}>
            <KrizakaLogo size={26} />
            {t.site.name}
          </Link>
        </NavBar.Brand>

        <NavBar.Items>
          {centre.map((item) => (
            <NavBar.Link key={item.key} asChild active={item.active}>
              <Link href={item.href}>{b.story}</Link>
            </NavBar.Link>
          ))}
        </NavBar.Items>

        <NavBar.Actions className="gap-1.5">
          <div className="hidden md:flex items-center">
            <SearchField
              size="sm"
              label={b.searchAria}
              placeholder={b.search}
              shortcut="k"
              onSubmit={(q) => {
                const query = q.trim();
                router.push(query ? `${search}?q=${encodeURIComponent(query)}` : search);
              }}
              className="w-36 lg:w-48"
            />
          </div>
          <Button asChild variant="ghost" size="icon" shape="pill" className="h-9 w-9 md:hidden">
            <Link href={search} aria-label={b.searchAria}>
              <SearchIcon size={15} />
            </Link>
          </Button>
          {saved.length > 0 && (
            <Button asChild variant="ghost" size="icon" shape="pill" className="h-9 w-9">
              <Link href={savedHref} aria-label={b.saved}>
                <BookmarkIcon size={15} />
              </Link>
            </Button>
          )}
          <Button asChild variant="ghost" size="icon" shape="pill" className="hidden h-9 w-9 lg:inline-flex">
            <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer" aria-label={b.githubAria}>
              <GitHubMark size={15} />
            </a>
          </Button>
          <Button type="button" variant="ghost" size="icon" shape="pill" onClick={toggleTheme} aria-label={theme === "dark" ? b.toLight : b.toDark} className="hidden h-9 w-9 md:inline-flex">
            {theme === "dark" ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          </Button>
          <Button asChild variant="outline" size="sm" className="hidden h-7 w-9 px-0 font-mono text-[11px] font-semibold md:inline-flex">
            <Link href={switchTo} hrefLang={other} lang={other} aria-label={b.switchLanguage}>
              {b.languageShort}
            </Link>
          </Button>
          <Button asChild variant="primary" size="sm" className="hidden md:inline-flex">
            <a href={KRIZAKA_URL}>{b.company}</a>
          </Button>

          <NavBar.Mobile openLabel={b.menu} closeLabel={b.menu} className="max-h-[calc(100dvh-6rem)] gap-1 overflow-y-auto overscroll-contain p-3">
            {centre.map((item) => (
              <MobileLink key={item.key} href={item.href}>{b.story}</MobileLink>
            ))}
            <MobileLink href={search}>{b.search}</MobileLink>
            {saved.length > 0 && <MobileLink href={savedHref}>{b.saved}</MobileLink>}
            <MobileLink href={feed}>{b.rssAria}</MobileLink>
            <MobileLink href={KRIZAKA_URL} external>{b.company}</MobileLink>
            <MobileLink href={GITHUB_ORG_URL} external>{b.github}</MobileLink>
            <div className="mt-2 flex gap-2 border-t border-border-subtle pt-3">
              <Button type="button" variant="secondary" size="md" onClick={toggleTheme} className="min-h-11 flex-1">
                {theme === "dark" ? <SunIcon size={16} /> : <MoonIcon size={16} />}
                {theme === "dark" ? b.toLight : b.toDark}
              </Button>
              <Button asChild variant="secondary" size="md" className="min-h-11">
                <Link href={switchTo} hrefLang={other} lang={other}>
                  <GlobeIcon size={16} />
                  {b.switchLanguage}
                </Link>
              </Button>
            </div>
          </NavBar.Mobile>
        </NavBar.Actions>
      </NavBar.Root>
    </div>
  );
}

function MobileLink({ href, external, children }: { href: string; external?: boolean; children: string }) {
  const cls = "flex min-h-11 items-center rounded-xl px-3 font-display text-[15px] font-semibold text-fg no-underline hover:bg-surface-2";
  return external ? <a href={href} className={cls}>{children}</a> : <Link href={href} className={cls}>{children}</Link>;
}

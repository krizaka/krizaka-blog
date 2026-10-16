# Krizaka Blog — governance (agent-neutral)

> Contract for **`krizaka/krizaka-blog`**, the code of **blog.krizaka.com**: the company's public voice, a static site of
> MDX posts. The company site and its contract are in `krizaka-com/AGENTS.md`; the Krizaka UI blocks in krizaka-ui.

## 1. What this repo is

- A **Next.js static export** (`output: "export"`, `out/`), English at the root, French under `/fr/`. No server, no
  database, no function except the editor's sign-in (`functions/`). Hosting: DigitalOcean App Platform static site
  (free tier, `.do/app.yaml`), DNS Porkbun. **Monthly cost: $0** — add no paid resource without Oussama's written decision.
- Pages are the `@krizaka/ui` page blocks (`Page`, `PageHero`, `Section`, `CardGrid`, `LinkCard`…), tokens through
  `@krizaka/tailwind`, faces `@krizaka/fonts` (`next/font/local`), motion `MotionObserver`. **Dark and light are both
  first-class**; check every view in both. No hard-coded colours (`var(--kz-*)`), no page-local button class.
- The bar is the family's (`@krizaka/ui/nav-bar`): left the mark, centre this site's sections, right the tools and the way
  back to krizaka.com. The family switcher arrives with `NavBar.Family`.

## 2. Content

- A post is `content/posts/<slug>.<en|fr>.mdx`: front matter `title`, `description` (≤ 220), `date` (YYYY-MM-DD),
  `tags` (lower-case ids; their names are `tags.names.*` in the messages), `author` (`authors.*`), `draft`, optional
  `image`. A post may exist in one language only; in both, they share the slug and name each other (hreflang).
- **`draft: true` is not published**: the build leaves it out (`APP_SHOW_DRAFTS=1` previews it). Publishing = `draft: false`.
- **Prove, don't invent.** A figure comes from a run, a measurement or a line of code that the post can point to; what is
  not measured is said. Sober, factual, no superlatives. Yororis' lexicon applies if it is ever named.
- **Images are never committed** (any image/video file under `content/` or `public/` fails `npm run lint`). They live on
  Bunny `krizaka-assets` under `blog/<post>/…` (`node scripts/cdn-assets.mjs upload <file> --to blog/<post>` in krizaka-com)
  and a post names them by their CDN URL.
- Every user-facing string of the site is in `messages/{en,fr}.json` (`krizaka-i18n check`). No `locale === "fr" ?`.

## 3. Writing & users

- Editors work at **`/admin/`** (Decap CMS, MIT, pinned with an integrity hash): sign-in with GitHub, role = permission on
  this repository, a draft is a branch and a pull request (editorial workflow), publishing merges it after CI. The
  sign-in is the small function in `functions/` (`AUTH_GITHUB_CLIENT_ID` / `AUTH_GITHUB_CLIENT_SECRET`, DO secrets, from a
  GitHub OAuth App whose callback is `https://blog.krizaka.com/api/oauth/callback`). No password database exists.

## 4. Indexing

- **noindex until the first post is published**: `APP_INDEXING_ENABLED` (build-time, `.do/app.yaml`) is `false` → every
  page `noindex`, robots `Disallow: /`. Setting it to `"true"` opens the site (the family's AI-crawler list, sitemap with
  hreflang and `lastmod`, `llms.txt`, JSON-LD leading to the Krizaka Organization). A static host cannot send
  `X-Robots-Tag`; the closed state relies on robots.txt and the meta tag. `scripts/check-seo-family.mjs` is the family's
  file, copied unchanged — CI runs it on the open build.

## 5. Definition of done

`npm run lint`, `npm test` and `npm run build` green; the change reads correctly in dark and light and at phone width;
a feature or a fix ships with its test (`tests/*.test.mjs`); CI green before merge, squash only.

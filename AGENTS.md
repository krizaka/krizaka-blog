# Krizaka Blog — governance (agent-neutral)

> Contract for **`krizaka/krizaka-blog`**, the code of **blog.krizaka.com**: the company's public voice, a static site of
> MDX posts. The company site and its contract are in `krizaka-com/AGENTS.md`; the Krizaka UI blocks in krizaka-ui.

## 1. What this repo is

- A **Next.js static export** (`output: "export"`, `out/`), English at the root, French under `/fr/`. No server, no
  database; the only functions are the editor's sign-in and the newsletter (`functions/`). Hosting: DigitalOcean App Platform static site
  (free tier, `.do/app.yaml`), DNS Porkbun. **Monthly cost: $0** — add no paid resource without Oussama's written decision.
- **The spec file is the live spec**: `.do/app.yaml` is applied with `krizaka-deploy deploy --apply` and checked read-only with `krizaka-deploy drift --config <config>` (krizaka/.github; context `default`) — it must report no difference. Public values (the captcha site key) are committed; secret keys never are. The renamed posts keep real 308s as ingress rules (max 10 per app, `krizaka-deploy routes`).
- Pages are the `@krizaka/ui` page blocks (`Page`, `PageHero`, `Section`, `CardGrid`, `LinkCard`…), tokens through
  `@krizaka/tailwind`, faces `@krizaka/fonts` (`next/font/local`), motion `MotionObserver`. **Dark and light are both
  first-class**; check every view in both. No hard-coded colours (`var(--kz-*)`), no page-local button class.
- **The blog is one page: the story** (krizaka-blog#123, the CTO's UX decision). The home (EN `/`, FR `/fr/`) is the title and
  one sentence in Oussama's voice (these are his notes from building Krizaka), his byline, **Featured** (one card: the latest
  chapter), then **every chapter in reading order, 1 → N** (number, title, what I faced → what we built, the period; the latest
  marked « New » — a timeline, never a feed; `lib/home.ts`), then « The basics » as quiet links, the newsletter line, the footer.
  Each chapter keeps its page (`/story/<slug>/`), each basic its `/basics/<slug>/`; À propos and `/newsletter/` stay.
- **Removed pages answer a permanent move**: `/story/`, `/series/` (and each series), `/tags/` (and each topic), `/search/`,
  `/saved/`, `/feed/`, `/posts/` are keys of `lib/redirects.json` (`page:<path>`, `series:<id>`), built as stubs (0-second refresh +
  canonical + noindex + a visible link — the 308 a static host can give) to the story, or to the chapter or shelf post that absorbed
  them. Never link to one (`npm run lint` and `scripts/check-meta.mjs` refuse it); never bring one back as a page.
- The bar is the family's (`@krizaka/ui/nav-bar`): the mark (the way home), the language (`NavBar.Language`) and the theme —
  nothing else (no sections, no tag menu, no search, no second bar). The footer carries the chapters, « The basics », the feeds
  (files), À propos and the family's columns (Krizaka, Krizaka UI, Krizaka Java…).

## 2. Content

- A post is `content/posts/<slug>.<en|fr>.mdx`: front matter `title`, `description` (≤ 220), `date` (YYYY-MM-DD),
  `tags` (lower-case ids; their names are `tags.names.*` in the messages), `author` (`authors.*`), `draft`, optional
  `cover` (a media id, below), `featured` (kept in the front matter; the home's Featured is the latest chapter), `series` (an id of `series.names.*`: `building-orazaka`,
  `measured`) with its `part` (a post's place; unique per series and language), optional `image`. A post may exist in one language only; in both, they share the slug and name each other (hreflang).
- **Search**: optional `seoTitle` (≤ 60 characters, the whole title tag) and `seoDescription` (≤ 155) when the title or the
  lead is too long for a search result; the h1 and the lead stay the post's own words. A topic is a word on a card
  (`tags.names.<tag>`), not a page. `scripts/check-meta.mjs out` (CI) refuses a built page over those limits, without
  exactly one h1, with an image without `alt`, or showing NaN/undefined. No promotional block or call to action inside a
  post: a product is named plainly, once, with one link — the posts teach, they do not sell.
- **MDX props are strings** (`<Utilization hourly="3.99" />`): next-mdx-remote drops JavaScript expressions (`={…}`), and
  `npm run lint` refuses them. Code fences become `CodeBlock` (copy); `<Numbers><Num value label hint/></Numbers>` sets the
  key figures of a passage apart (only figures the text already gives; a whole number climbs with `NumberTicker`).
  The page components of `@krizaka/ui` are mapped in `app/components/pages/mdx.tsx`: `<Steps><Step title>…</Step></Steps>`
  (Stepper), `<Compare label topic before after><Case topic before after [beforeDetail afterDetail]/></Compare>`
  (ComparisonTable, « before / after ») and `<CodeTabs><Tab label>` + a fenced block `</Tab></CodeTabs>` (Tabs over CodeBlocks); they
  arrive with the motion system (`data-reveal`, still under reduced motion).
- **Confidentiality** (`confidentialityProblems` in `scripts/content-rules.mjs`, run by `npm run lint` and `npm test`): no
  post carries a 10-digit registration-like number, a company e-mail address, a folder name of the private workspace, a path
  of the founder's machine, a private file name or a key-looking value. A post about how the company is run declares
  `sensitive: true` and the rules add: no amount of money, no key or variable name, no supplier name, no ledger, fiscal or
  bank word. Patterns are described, internals never.
- **A published post has a `publishedAt`** (quoted date, time and offset, e.g. `"2026-10-16T21:44:17-04:00"`, on its `date`):
  posts of one day keep their order. **A published post has a `cover` and its `coverAlt`**, shown **once**: the post's hero and its
  cards — never again in the body (lint refuses its id or URL there); a picture in the text is another, relevant one. A cover is made, not found: an Orazaka Studio run (provenance in `lib/media.json`), never a stock photo.
- **`draft: true` is not published**: the build leaves it out (`APP_SHOW_DRAFTS=1` previews it). Publishing = `draft: false`.
- **Prove, don't invent.** A figure comes from a run, a measurement or a line of code that the post can point to; what is
  not measured is said. Sober, factual, no superlatives.
- **Images are never committed** (any image/video file under `content/` or `public/` fails `npm run lint`). They live on
  Bunny `krizaka-assets` under `site/blog/<post>/…` (`node scripts/cdn-assets.mjs upload <file> --to blog/<post>` in krizaka-com, which writes `site/blog/<post>/<name>.<hash>.<ext>`)
  and a post names them by their CDN URL.
- **Two CDN prefixes.** Older media sit under `site/blog/<post>/`; new uploads of krizaka-com's `cdn-assets.mjs` land under `sites/blog/posts/<post>/` (layout v2, ADR-014). The rules accept both (`onBlogCdn`).
- **The media library** is `lib/media.json`: every image and clip a post shows, by id, with the CDN URLs (`site/blog/…`),
  the sizes, a blur placeholder and the **provenance** of the result (model, prompt, seed, machine, time, cost, Orazaka run
  id). A post uses `<Figure id alt caption?/>` (responsive `srcset`, blur-up, size reserved, lazy), `<Clip id alt
  caption?/>` (a light native player: muted loop while on screen, poster first, controls, never autostarts under
  `prefers-reduced-motion`) and `<Row>`; both show « How this was made » from the entry. Entries are produced, not typed:
  the Orazaka results come from `orazaka-web-client` (`gallery.ts`, `gallery-clips.ts`, `model-compare.ts`) and `orazaka`
  `docs/measurements/runs.json`; a result made outside an Orazaka run says so in `made.note`. `npm run lint` fails on an
  unknown id, an image without size or blur, a URL off the blog's CDN prefix, or a cover/clip mix-up. Never hot-link an
  original: files are sized webp (480/960/full) and mp4/webm with a poster.
- **Covers ship in renditions.** Bunny's Optimizer is not enabled (no width parameter), so every cover is made once at 480, 768, 1200 and
  1600 px where its source is that wide, and at its own width, in AVIF and WebP: `node scripts/gen-renditions.mjs <dir>` writes the files and
  records their CDN URLs in `lib/media.json` (`renditions: { avif, webp }`), then they are uploaded with krizaka-com's `cdn-assets.mjs upload`.
  `npm run lint` fails on a cover without them. The page emits a `<picture>` (AVIF source, WebP `<img>`, `srcset` + `sizes`); the page's LCP
  cover is `fetchpriority="high"` and preloaded, every other cover waits until it is near the window (`CoverImage`, `LazyImg`;
  `scripts/check-meta.mjs` checks the built post pages).
- **A model is named with its link.** The first mention of a known model in a post (Wan 2.2 A14B, FLUX.2 [klein], SD 3.5,
  Qwen, DeepSeek, Llama, Mistral, GLM, Kimi, ACE-Step, MMAudio, SeedVR2, Real-ESRGAN, LTX…) is `<Model id="…">its name</Model>`,
  which links its official Hugging Face page (or its own site when it is not there). The map is `lib/models.ts` (id, name,
  URL checked 200, name patterns; a family entry links the organisation and is covered by a link to one of its models);
  `npm run lint` refuses an unlinked first mention, an unknown id or a `<Model>` around another model's name.
  `node scripts/link-models.mjs --write` wraps the first mentions. A new model is added to the map with a checked URL.
- **Pictures, not schemas.** A picture of `lib/media.json` either has its provenance (`made`) or is a diagram drawn from code
  (`style: "diagram"`); a diagram stays inside its post; a cover is an evocative still or a short clip. A clip cover shows its
  poster first and plays its muted loop only on hover (or, on a touch screen, while well in view after the page loaded), never
  under reduced motion or Save-Data (`CardLoop`).
- **The story's chapters** (`content/chapters/`, `lib/chapters.ts`) are the blog's content: the home lists them from their front
  matter (`chapter`, `period`, `versus`), nothing typed; a new chapter appears by itself, Featured and marked « New ». Built from
  `@krizaka/ui` blocks only (`PageHero`, `Section`, `Card`, `LinkCard`, `Badge`); a missing block is an issue in krizaka-ui.
  Tested in `tests/home.test.mjs` and on the built page by `scripts/check-meta.mjs` (`homeProblems`).
- **Questions sections answer search engines too**: a post's h2 « Questions fréquentes » / « Frequently asked questions »
  (or « FAQ ») turns its h3s and their text into FAQPage JSON-LD (`faqOf` in `lib/reading.ts`).
- Every user-facing string of the site is in `messages/{en,fr}.json` (`krizaka-i18n check`). No `locale === "fr" ?`.

## 3. Writing & users

- Editors work at **`/admin/`** (Decap CMS, MIT, pinned with an integrity hash): sign-in with GitHub, role = permission on
  this repository, a draft is a branch and a pull request (editorial workflow), publishing merges it after CI. The
  sign-in is the small function in `functions/` (`AUTH_GITHUB_CLIENT_ID` / `AUTH_GITHUB_CLIENT_SECRET`, DO secrets, from a
  GitHub OAuth App whose callback is `https://blog.krizaka.com/api/oauth/callback`). No password database exists.

## 3.1 Newsletter

- A subscribe form (`app/components/newsletter/`: e-mail + language, Turnstile, honeypot) on the home (its one newsletter line),
  at the end of every post and on `/newsletter/` (with what is kept and why — Loi 25). It posts to `/api/newsletter/subscribe`.
- **The CAPTCHA never loads with the page**: Cloudflare's script (and its challenge frame) is fetched when the form is on screen or takes focus (`lib/when-wanted.ts`).
- **Double opt-in, nothing stored before the click**: the function e-mails a signed link (HMAC, `MAIL_TOKEN_SECRET`, 48 h);
  `/api/newsletter/confirm` adds the address to `newsletter_subscribers` (database `krizaka_newsletter` on the cluster
  `krizaka-dev-pg`, its own role, `db/newsletter.sql`, set up by `scripts/newsletter-db.mjs`; this app is a trusted source)
  with the language and the date and source of the consent (CASL's proof). `/api/newsletter/unsubscribe` (link in every
  e-mail + RFC 8058 one-click header) deletes the row. Every e-mail says who sends it, the postal address
  (`MAIL_SENDER_ADDRESS`), why it is received, and links the privacy note. No tracking (`o:tracking=no`, no pixel).
  Mailgun only sends (the account's key is a sending key; it cannot hold lists). ADR-001 (accounts) links an account to
  this subscription; it does not keep a second list.
- **Leaving** is the one-click link of every e-mail (`u` token, never expires) and the RFC 8058 header — nothing else (no
  lookup form: Oussama, 2026-10-17). It lands on `/newsletter/unsubscribed/` (« Me réabonner », a plain link, works without
  JavaScript); a bad link lands on `/newsletter/link-invalid/`.
- The form is compact (one line, one row: e-mail + « M'abonner », one muted notice line); the language is the page's; the
  CAPTCHA is invisible unless Cloudflare needs an action (`appearance: interaction-only`).
- **Downloads** (krizaka-blog#211): each chapter and the whole story have an EPUB 3 and a tagged PDF, in each language, made by
  `scripts/gen-downloads.mjs` from the pages the build exported (so from the same MDX): **pandoc** (maintained since 2006, run as a
  separate program, pinned in `ci-after-build.sh`) writes the EPUB — table of contents, one file per chapter, `dc:language`, cover,
  alt text, accessibility metadata — and **Chromium** (Playwright's) the PDF — structure tree, `/Lang`, title, outline. Diagrams and
  clips stand for their label in the text; the links back to the chapters are absolute. The build checks that every chapter is in each
  file. The files are hashed objects on Bunny (`sites/blog/posts/downloads/`, uploaded with krizaka-com's `cdn-assets.mjs upload --to
  blog/downloads`, manifest committed there); `lib/downloads.json` records each book's source hash, file hashes and sizes, and the lint
  fails when a chapter changed and its files were not made again (`node scripts/gen-downloads.mjs`, upload, `… record`). The links are on
  each chapter, on the home, and in the feeds (RSS enclosure, Atom `rel="enclosure"`, JSON Feed `attachments`).
- **RSS and Atom stay as files, not pages** (krizaka-blog#123): `/feed.xml` and `/atom.xml` are pure XML for readers (no XSLT:
  Chrome is removing it), and every « RSS » link names the file; the old `/feed/` page is a stub to the story.
- **New post e-mail**: designed with `@krizaka/email` (`newPost`: the Krizaka mark, the cover, the title, the excerpt, one
  button, the signature, the footer with the one-click unsubscribe and the postal address; tables and inline styles, dark
  mode, a plain-text part; the reader's language). `scripts/newsletter-email.mjs` renders it once per language in the
  workflow (the cover is the post's e-mail-sized WebP of `lib/media.json`); the function only fills the placeholders of
  the reader's own values (their signed unsubscribe link) and the sender's postal address (`fillRendered`). Without a
  rendered e-mail it sends the plain one. **Test**: `MAIL_SEND_TOKEN=… node scripts/newsletter-send.mjs --slug <slug>
  --test-to <address> [--locale fr|en]` (also on a draft) sends ONE e-mail, « [Test] » in the subject, to that address only:
  the list is not read and the post is not claimed. Screenshots of the rendered HTML go to Bunny (`pr-assets`), never the repo.
  `.github/workflows/newsletter.yml` runs `scripts/newsletter-send.mjs` after a push to main that
  publishes a post (draft → published, or new and published): it waits for the page to be live, then calls
  `/api/newsletter/send` (bearer `MAIL_SEND_TOKEN`, the repository's only secret for this), which claims the post in
  `newsletter_posts` (primary key: never sent twice) and e-mails each confirmed subscriber in their language.
  Manual: Actions → Newsletter → Run workflow (slug).

## 3.2 Reading offline (krizaka-blog#211)

- The blog is an installable PWA: `app/manifest.ts` and a service worker, `out/sw.js`, bundled at build by esbuild from `scripts/sw-src.js`
  with the precache injected by **Workbox** (`workbox-build`, MIT; chosen over a hand-written worker for its precache revisions and routing).
  `scripts/offline.mjs` (called by `postbuild.mjs`) writes `out/offline-manifest.json`: every published chapter, its page and the files it
  draws, read from the exported HTML; the build id is the hash of the chapters.
- The worker caches nothing by itself. « Save for offline » (a chapter) and « Save the whole series » (`app/components/SaveOffline.tsx`,
  state in `lib/offline-store.ts`, logic shared with the worker in `lib/offline-core.mjs`) write the chapter into `kz-saved-<build>`; a new
  build re-saves what the reader had saved and drops the old cache; saving stops at 80 % of the quota. The newsletter and the admin are
  never saved nor answered from a cache (`isNeverCached`). `/offline/` lists what is saved; it is `noindex`, out of the sitemap.
- Guards: `tests/offline.test.mjs`, `scripts/check-offline.mjs` (every chapter in the manifest, every file on disk, the worker's precache)
  and `scripts/check-offline-reading.mjs` (Playwright: save, go offline, read), both in `scripts/ci-after-build.sh`.

## 4. Indexing

- **noindex until the first post is published**: `APP_INDEXING_ENABLED` (build-time, `.do/app.yaml`) is `false` → every
  page `noindex`, robots `Disallow: /`. Setting it to `"true"` opens the site (the family's AI-crawler list, sitemap with
  hreflang and `lastmod`, `llms.txt`, JSON-LD leading to the Krizaka Organization). A static host cannot send
  `X-Robots-Tag`; the closed state relies on robots.txt and the meta tag. `scripts/check-seo-family.mjs` is the family's
  file, copied unchanged — CI runs it on the open build.

## 5. Definition of done

`npm run lint`, `npm test` and `npm run build` green; the change reads correctly in dark and light and at phone width;
a feature or a fix ships with its test (`tests/*.test.mjs`); CI green before merge, squash only.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Before you open or update a pull request (coding agents)

These are the defects code review found most often on 2026-10-23. Check them yourself before you open or update a pull request:
1. **Checks:** run the repository's full check (lint, typecheck, tests, build) and fix it. Never push a red check.
2. **Concurrency:** any « count then insert » or « check then write » runs in one transaction with a lock, and has a concurrency test.
3. **One gate:** a rule (limit, permission, validation) is enforced in the service, so no route can skip it. Test every route.
4. **Errors:** a cleanup (ROLLBACK, DROP, close) never masks the original error. Rethrow it, or throw an `AggregateError` with the original first.
5. **Validation:** validate the original input, never a truncated or pre-trimmed copy. Server and client reject the same inputs.
6. **Accessibility:**
   - every control has a unique label, and FR/EN pairs say their language;
   - focus rings are never clipped by `overflow`;
   - text never overflows its box at 360 px.
7. **Naming:** environment variables follow `<CONTEXT>_<THING>` (`APP_`, `DATABASE_`, `AUTH_`, `MEDIA_`, `MAIL_`, `PAYMENTS_`, `AI_`…) and are declared once.
8. **Words:** every user-facing string is in the FR and EN messages, and no colour is hard-coded.
9. **Review threads:** answer every one. Fix it test-first, or reply with the reason, then resolve it.

**Repository layout:** the root follows [krizaka/.github `docs/standards/repo-layout.md`](https://github.com/krizaka/.github/blob/main/docs/standards/repo-layout.md); the CI guard `check-repo-layout` fails on a stray root file, and a justified extra is declared in `.repo-layout.json` with its why.

## 9. Anti-slop (ADR-015)

What a model tends to write and the code does not need. Each line points at the rule that refuses it
([ADR-015](https://github.com/krizaka/.github/blob/main/docs/adr/ADR-015-ai-code-audit-measured-and-enforced.md), [docs/standards/guards.md](https://github.com/krizaka/.github/blob/main/docs/standards/guards.md)).

1. **No defensive null on `@NullMarked` code.** No `Objects.requireNonNull` or `if (x == null)` on a value the type already
   guarantees. Enforced by NullAway at compile time; a new package is `@NullMarked` (ArchUnit).
2. **A closed set is a type.** An enum, a sealed interface or an `as const` object, never a string compared by hand;
   strategies are a `Map<Kind, Strategy>` built once at startup. Enforced by PMD / ArchUnit (Java) and `no-enum-string-compare` (ast-grep).
3. **HTTP in Java is a DTO record, `@Valid` and `ProblemDetail`.** No `Map.of("error", …)`, no entity in a response, one
   `@RestControllerAdvice` per service. Enforced by ArchUnit.
4. **No `*Utils`, `*Helper` or `*Manager`.** Name the thing by what it does (§4). Enforced by ArchUnit (ADR-015 §5).
5. **`?.` and `??` in TypeScript**, not a chain of `&&` or a ternary on null. The target rules are `@typescript-eslint/prefer-optional-chain` and `prefer-nullish-coalescing`; they are not in `@krizaka/config` yet.
6. **The build is the judge.** Compile, lint and test before every push; `krizaka-edit-check` runs on each edit (below) and
   NullAway and ArchUnit run at pre-push and in CI. A rule is never silenced to get green.

**The edit hook.** Every repository adds this to `.claude/settings.json`. After each `Edit` or `Write`, the one file is
checked in under 10 s: ESLint with the repository's config for TypeScript, PMD with the Krizaka rules for Java (never Maven).
A finding comes back to the agent (exit 2); a timeout is silent.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [{ "type": "command", "command": "npx --yes -p @krizaka/config krizaka-edit-check", "timeout": 10 }]
      }
    ]
  }
}
```

In a TypeScript repository that already depends on `@krizaka/config`, use `npx --no-install krizaka-edit-check` (no download).

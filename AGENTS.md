# Krizaka Blog — governance (agent-neutral)

> Contract for **`krizaka/krizaka-blog`**, the code of **blog.krizaka.com**: the company's public voice, a static site of
> MDX posts. The company site and its contract are in `krizaka-com/AGENTS.md`; the Krizaka UI blocks in krizaka-ui.

## 1. What this repo is

- A **Next.js static export** (`output: "export"`, `out/`), English at the root, French under `/fr/`. No server, no
  database; the only functions are the editor's sign-in and the newsletter (`functions/`). Hosting: DigitalOcean App Platform static site
  (free tier, `.do/app.yaml`), DNS Porkbun. **Monthly cost: $0** — add no paid resource without Oussama's written decision.
- Pages are the `@krizaka/ui` page blocks (`Page`, `PageHero`, `Section`, `CardGrid`, `LinkCard`…), tokens through
  `@krizaka/tailwind`, faces `@krizaka/fonts` (`next/font/local`), motion `MotionObserver`. **Dark and light are both
  first-class**; check every view in both. No hard-coded colours (`var(--kz-*)`), no page-local button class.
- The bar is the family's (`@krizaka/ui/nav-bar`): left the mark, centre this site's sections, right the tools and the way
  back to krizaka.com. The family switcher arrives with `NavBar.Family`.

## 2. Content

- A post is `content/posts/<slug>.<en|fr>.mdx`: front matter `title`, `description` (≤ 220), `date` (YYYY-MM-DD),
  `tags` (lower-case ids; their names are `tags.names.*` in the messages), `author` (`authors.*`), `draft`, optional
  `cover` (a media id, below), `featured` (the home's first card), `series` (an id of `series.names.*`: `building-orazaka`,
  `measured`) with its `part` (a post's place; unique per series and language), optional `image`. A post may exist in one language only; in both, they share the slug and name each other (hreflang).
- **Search**: optional `seoTitle` (≤ 60 characters, the whole title tag) and `seoDescription` (≤ 155) when the title or the
  lead is too long for a search result; the h1 and the lead stay the post's own words. Every topic has `tags.seo.<tag>`
  (title, description) in both languages. `scripts/check-meta.mjs out` (CI) refuses a built page over those limits, without
  exactly one h1, with an image without `alt`, or showing NaN/undefined. No promotional block or call to action inside a
  post: a product is named plainly, once, with one link — the posts teach, they do not sell.
- **MDX props are strings** (`<Utilization hourly="3.99" />`): next-mdx-remote drops JavaScript expressions (`={…}`), and
  `npm run lint` refuses them. Code fences become `CodeBlock` (copy); `<Numbers><Num value label hint/></Numbers>` sets the
  key figures of a passage apart (only figures the text already gives).
- **A published post has a `publishedAt`** (quoted date, time and offset, e.g. `"2026-10-16T21:44:17-04:00"`, on its `date`):
  posts of one day keep their order. The home shows **three posts first**: pinned ones (`featured: true`) then the newest,
  the first as the large card. **A published post has a `cover`**, also shown in the body with its alt (phones read it
  there). A cover is made, not found: an Orazaka Studio run (provenance in `lib/media.json`), never a stock photo.
- **`draft: true` is not published**: the build leaves it out (`APP_SHOW_DRAFTS=1` previews it). Publishing = `draft: false`.
- **Prove, don't invent.** A figure comes from a run, a measurement or a line of code that the post can point to; what is
  not measured is said. Sober, factual, no superlatives. Yororis' lexicon applies if it is ever named.
- **Images are never committed** (any image/video file under `content/` or `public/` fails `npm run lint`). They live on
  Bunny `krizaka-assets` under `site/blog/<post>/…` (`node scripts/cdn-assets.mjs upload <file> --to blog/<post>` in krizaka-com, which writes `site/blog/<post>/<name>.<hash>.<ext>`)
  and a post names them by their CDN URL.
- **The media library** is `lib/media.json`: every image and clip a post shows, by id, with the CDN URLs (`site/blog/…`),
  the sizes, a blur placeholder and the **provenance** of the result (model, prompt, seed, machine, time, cost, Orazaka run
  id). A post uses `<Figure id alt caption?/>` (responsive `srcset`, blur-up, size reserved, lazy), `<Clip id alt
  caption?/>` (a light native player: muted loop while on screen, poster first, controls, never autostarts under
  `prefers-reduced-motion`) and `<Row>`; both show « How this was made » from the entry. Entries are produced, not typed:
  the Orazaka results come from `orazaka-web-client` (`gallery.ts`, `gallery-clips.ts`, `model-compare.ts`) and `orazaka`
  `docs/measurements/runs.json`; a result made outside an Orazaka run says so in `made.note`. `npm run lint` fails on an
  unknown id, an image without size or blur, a URL off the blog's CDN prefix, or a cover/clip mix-up. Never hot-link an
  original: files are sized webp (480/960/full) and mp4/webm with a poster.
- Every user-facing string of the site is in `messages/{en,fr}.json` (`krizaka-i18n check`). No `locale === "fr" ?`.

## 3. Writing & users

- Editors work at **`/admin/`** (Decap CMS, MIT, pinned with an integrity hash): sign-in with GitHub, role = permission on
  this repository, a draft is a branch and a pull request (editorial workflow), publishing merges it after CI. The
  sign-in is the small function in `functions/` (`AUTH_GITHUB_CLIENT_ID` / `AUTH_GITHUB_CLIENT_SECRET`, DO secrets, from a
  GitHub OAuth App whose callback is `https://blog.krizaka.com/api/oauth/callback`). No password database exists.

## 3.1 Newsletter

- A subscribe form (`app/components/newsletter/`: e-mail + language, Turnstile, honeypot) on the home, at the end of every
  post and on `/newsletter/` (with what is kept and why — Loi 25). It posts to `/api/newsletter/subscribe`.
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
- **New post e-mail**: `.github/workflows/newsletter.yml` runs `scripts/newsletter-send.mjs` after a push to main that
  publishes a post (draft → published, or new and published): it waits for the page to be live, then calls
  `/api/newsletter/send` (bearer `MAIL_SEND_TOKEN`, the repository's only secret for this), which claims the post in
  `newsletter_posts` (primary key: never sent twice) and e-mails each confirmed subscriber in their language.
  Manual: Actions → Newsletter → Run workflow (slug).

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

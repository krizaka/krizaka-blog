# Krizaka Blog

**blog.krizaka.com** — the company blog of [Krizaka](https://www.krizaka.com): notes on sovereign AI, measured costs and
real document runs. A static site (Next.js export) of MDX posts in English and French, built with the
[`@krizaka/ui`](https://ui.krizaka.com) page blocks. Posts and code are Apache-2.0.

```bash
npm ci
npm run dev                          # http://localhost:3000 — drafts: APP_SHOW_DRAFTS=1 npm run dev
npm run lint && npm test && npm run build
```

## Writing

- **In the editor**: `/admin/` (Decap CMS). Sign in with GitHub; your role is your permission on this repository. A draft is
  a pull request; publishing merges it.
- **In Git**: add `content/posts/<slug>.en.mdx` (and `<slug>.fr.mdx`) with the front matter described in
  [AGENTS.md](AGENTS.md#2-content). `draft: true` keeps it out of the site.
- **Images and clips** go to the media CDN (`site/blog/<post>/…`, with `cdn-assets` in krizaka-com), never into this repository; a post names them by id from `lib/media.json`, which also carries how each was made.

## What it ships

Home (featured post with its cover, latest, series), posts with reading time, related posts and series navigation, topics (tags), series, search (an index built at build, no request), RSS and Atom per language, a sitemap with
hreflang, an Open Graph image per post, `llms.txt`, JSON-LD. Noindex until the first post is published
(`APP_INDEXING_ENABLED`). Cost: $0/month (DigitalOcean static site; `.do/app.yaml`).

Rules for contributors and agents: [AGENTS.md](AGENTS.md).

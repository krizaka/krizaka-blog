# Krizaka Blog — agent contract

<!-- krizaka-agents-template v2: rendered from krizaka/.github docs/standards/agents-template.md (scripts/agents-md.mjs). The one AGENTS.md standard: six sections in this order, at most 150 lines, bullets and imperatives. The conformance check « agents-template » reads the headings, the length and CLAUDE.md. Detail goes to docs/ via References, not here. -->

## Project context

- `krizaka/krizaka-blog`: the code of blog.krizaka.com, the company's public voice. A Next.js static export (`output: "export"`, `out/`) of MDX posts and story chapters, English at the root, French under `/fr/`. No server, no database; the only functions are the editor's sign-in and the newsletter (`functions/`).
- Hosting: DigitalOcean App Platform static site (`.do/app.yaml`), DNS Porkbun. Monthly cost $0: add no paid resource without the founder's written decision.
- Registry entry: [repos.json](https://github.com/krizaka/.github/blob/main/repos.json).
- Read this file first, then the section of [docs/agents.md](docs/agents.md) for what you touch.
- `CLAUDE.md` is the one line `@AGENTS.md`: never a second copy of it.

## Essential commands

- `npm ci` · `npm run dev` · `npm run build` (static export to `out/`).
- `npm run lint`: tsc, server/client boundary, i18n, code names, content rules, parity, diagrams, downloads, proofs, prettier.
- `npm test` (`node --test tests/*.test.mjs`) · `npm run test:browser` · `npm run test:coverage`.
- `npm run format` (prettier) · `npm run functions:bundle` (regenerates the functions' generated files).
- `node scripts/check-meta.mjs out` checks the built pages (CI runs it with the rest of `scripts/ci-after-build.sh`).
- `krizaka-deploy drift --config <config>` must report no difference with `.do/app.yaml`.
- Run them on what you changed before every push; CI runs the rest.

## Architecture & conventions

- Follow the [krizaka-engineering skill](https://github.com/krizaka/krizaka-agents/blob/main/plugins/krizaka-engineering/skills/krizaka-engineering/SKILL.md); search its [packages reference](https://github.com/krizaka/krizaka-agents/blob/main/plugins/krizaka-engineering/skills/krizaka-engineering/references/packages.md) before writing anything generic.
- Take libraries first: a missing function goes into the `@krizaka/*` package first, never a local copy.
- Pages are `@krizaka/ui` blocks (`Page`, `PageHero`, `Section`, `CardGrid`, `LinkCard`…), tokens from `@krizaka/tailwind`, faces `@krizaka/fonts`. A missing block is an issue in krizaka-ui, not a local component. Dark and light are both first-class: check every view in both and at phone width.
- No hard-coded colour (`var(--kz-*)`), no page-local button class. Every user-facing string is in `messages/{en,fr}.json`; no `locale === "fr" ?`.
- The blog is one page, the story: the home lists chapters (`content/chapters/`, `lib/chapters.ts`, `lib/home.ts`) from their front matter, nothing typed. Chapters live at `/story/<slug>/`, basics at `/basics/<slug>/`.
- The nav bar is the family's (mark, language, theme) and the footer is data (`lib/footer.ts`); never type a column in the component.
- A post is `content/posts/<slug>.<en|fr>.mdx`; front matter and every content rule are in [docs/agents.md](docs/agents.md) §2 and enforced by `npm run lint`.
- Cross-links to the org go through `lib/links.ts` (`repo:…`, `site:…`), never a written address.
- Environment variables follow `<CONTEXT>_<THING>` and are declared once.

## Guard-rails & known pitfalls (read before coding)

- The checks are the judge ([ADR-015](https://github.com/krizaka/krizaka-internal/blob/main/docs/adr/.github/ADR-015-ai-code-audit-measured-and-enforced.md), [guards](https://github.com/krizaka/.github/blob/main/docs/standards/guards.md)): never `--no-verify`, never a new `eslint-disable`, never a raised ratchet (`sonar-ratchet.json`); a rule is never silenced to get green.
- This is not the Next.js you know: read the guide in `node_modules/next/dist/docs/` before writing code, and heed deprecation notices.
- MDX props are strings: `<Utilization hourly="3.99" />`, never `={…}` (next-mdx-remote drops it; lint refuses it).
- Never commit an image or a video (lint fails under `content/` and `public/`): they live on Bunny `krizaka-assets` (`site/blog/…` or `sites/blog/posts/…`) and a post names them by CDN URL or `lib/media.json` id.
- A published post needs `publishedAt`, `cover` and `coverAlt`; the cover is shown once (hero and cards), never in the body, and is a Sovkora Studio run, never a stock photo. Covers ship in renditions (`node scripts/gen-renditions.mjs`).
- A new chapter has its cover before the PR (the meta check renders drafts); a changed chapter remakes its books (`node scripts/gen-downloads.mjs`, upload, `… record`).
- Removed pages (`/story/`, `/series/`, `/tags/`, `/search/`, `/saved/`, `/feed/`, `/posts/`) are redirect stubs in `lib/redirects.json`: never link to one, never bring one back. Max 10 ingress rules in `.do/app.yaml`.
- Prove, don't invent: a figure comes from a run, a measurement or a line of code; what is not measured is said. No promotional block in a post; a product is named plainly once with one link.
- Confidentiality: no registration number, company e-mail, private folder name, founder-machine path or key-looking value in content (`scripts/content-rules.mjs`).
- Commercial names only (Verikora, Folioviv, Sovkora); published chapters keep the names of their day (see [docs/agents.md](docs/agents.md), « Commercial names »).
- Newsletter: double opt-in, nothing stored before the click, no tracking, CAPTCHA never loads with the page; the list is bounded (`MAX_SUBSCRIBERS`). Detail in [docs/agents.md](docs/agents.md) §3.1.
- Keep `APP_INDEXING_ENABLED` as set in `.do/app.yaml`; `scripts/check-seo-family.mjs` is the family's file, copied unchanged.
- Anti-slop (ADR-015): a closed set is a type, never a string compared by hand; use `?.` and `??`; no `*Utils`, `*Helper`, `*Manager`.
- Start a fix with a failing test; never commit a secret, a capture or a log; no production data in a session.
- Keep the edit hook in `.claude/settings.json`: `npx --no-install krizaka-edit-check` on `Edit|Write`.

## Expected validation workflow

- [ ] `npm run lint`, `npm test` and `npm run build` green; fix the cause of a red, never the guard.
- [ ] The change reads correctly in dark and light and at phone width.
- [ ] A feature or fix ships with its test (`tests/*.test.mjs`).
- [ ] A feature or fix PR names its journey (`Journey: <name>` or `Journey: n/a — <reason>`).
- [ ] The « before you push » checklist of the skill holds; README and docs still say what the code does.
- [ ] One issue, one small PR (`Closes #<n>`); CI green before merge, squash only.

## References

- [docs/agents.md](docs/agents.md): the full former contract (content, newsletter, downloads, offline, indexing, commercial names), read by section.
- [docs/image-series.md](docs/image-series.md): the chapter cover series; [docs/refonte.md](docs/refonte.md): the story redesign.
- [Org standards](https://github.com/krizaka/.github/tree/main/docs/standards) of krizaka/.github; the [engineering charter](https://github.com/krizaka/.github/blob/main/AGENTS.template.md).
- [krizaka-engineering skill](https://github.com/krizaka/krizaka-agents/blob/main/plugins/krizaka-engineering/skills/krizaka-engineering/SKILL.md).

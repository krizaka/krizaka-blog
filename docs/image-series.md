# The image series (krizaka-blog#193)

One picture per chapter, each continuing the previous one: the same valley at dusk grows as the story does, and the five Krizaka
birds arrive one by one (falcon, owl, duck, flamingo, pigeon). The anchor is the brand picture « Le monde de Krizaka »
(`brand-films/film/le-monde-de-krizaka-16x9.jpg` on Bunny): flat vector, indigo and violet night, orange sun, constellations.

- **Prompts and seeds**: `content/image-series/series.json` (style, continuity sentence, per chapter: seed, cast, beat). A test
  (`tests/image-series.test.mjs`) checks one chapter per story chapter, unique seeds, a cast that only grows and the guardrails.
- **Guardrails**: inspiration only. The founder's culture (Morocco and the Mediterranean, Grenoble and the Chartreuse, Montréal, clay
  tennis, basketball, 90s DJ crates) is atmosphere, as objects and places. No real person, no athlete, no trademarked character, logo
  or game or comic asset, no lyrics, no text in the pictures.
- **Made with Orazaka, locally**: the media worker's own engine (`orazaka-worker-media`, mflux, FLUX.2 [klein] 4B, Apache-2.0) on the
  Mac's Metal GPU, no paid API. `scripts/render-image-series.py` renders chapter N from the brand picture and chapter N-1 (edit
  with reference images). About 80 s a picture on an M1 Max.
- **Never committed**: the PNGs stay in a scratch folder. Renditions (`scripts/gen-renditions.mjs`) go to Bunny
  (`site/blog/series/…`, hashed) with krizaka-com's `cdn-assets.mjs`; the contact sheet goes through `pr-assets.mjs`.
- **Switching (done, 2026-10-29)**: the founder said go. `scripts/prepare-series-covers.mjs` makes the web files and the `lib/media.json` entries
  (`series-NN-<post>`, with their `made` provenance), `cdn-assets.mjs` sends them to `site/blog/series/`, `gen-renditions.mjs` adds the
  AVIF/WebP renditions, and each chapter's `cover` points to its picture (the Open Graph image reads the cover). The old covers stay on Bunny.
- **Review rule**: every picture is looked at in full size for a bird drawn twice, a person, a logo or text before it is used. Chapters 3, 15
  and 16 were re-rolled with other seeds for that reason (the seeds in `series.json` are the ones of the pictures in use).

## The look (krizaka-internal#2455)

The covers and the pictures drawn for a chapter are **hand-drawn ink and watercolor on paper**, in the Krizaka palette (indigo, teal, orange, cream), 16:9,
birds small and natural (no clothes, no big eyes, no cel shading, no uniform outlines): not a cartoon. Chapters 23 and 24 were first a flat vector
night scene, then a cartoon, and broke the series. They (the two covers and the chapter 23 pictures of the watcher, « le chouf », a kestrel
perched by the tracks, and of the repairer, « le pompier », a red duck with round glasses on the siding) are redrawn with **GPT Image 2.5 Sunburst
through Runway** (`gpt_image_2_5_sunburst`, text to image with four covers of the series as style references; medium quality costs 6 credits a take,
high up to 24): `content/image-series/runway.json` holds the prompts, references, takes and credits; `scripts/prepare-runway-images.mjs` makes the web
files and the `lib/media.json` entries. Several takes, the one that sits best next to chapters 21 and 22 is kept.

- **Guard**: `tests/image-series.test.mjs` refuses a generated still of a post that is not in that look unless it is listed with its reason in
  `content/image-series/flagged.json` (a demonstration, a pick for the founder to decide, a candidate to redraw).
- **See it**: `node scripts/media-contact-sheet.mjs` (into `<tmpdir>/media-contact-sheet/`) draws every cover and every inline picture side by side (`covers.png`, `inline.png`,
  `list.json`); a PR that touches a picture links them (captures through krizaka-com's `pr-assets.mjs`).

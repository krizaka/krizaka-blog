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
- **Switching**: the live covers do not change until the founder validates the contact sheet. Then `lib/media.json` entries
  (with `made` provenance) and the chapters' `cover` ids move in one PR, and the old images stay on Bunny.

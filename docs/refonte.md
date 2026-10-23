# Refonte — the blog tells Krizaka's story

> Phase 1 of krizaka/krizaka-blog#107: **the plan only**. Nothing in `content/`, `app/` or `.do/` changes until Claude (CTO)
> writes « validé » and Oussama confirms the chapter list. Phase 2 (the rewrite) follows this file.

Oussama (2026-10-23): « Refonte complète du blog : moins de choses, mais plus concrètes. On raconte l'histoire de Krizaka. »

## 0. Inventory (what exists today)

The blog has 30 posts, each in FR and EN, all published. They sit in four series, plus three posts outside any series. Together they make
about 51,000 words in French (`wc -w content/posts/*.fr.mdx`). At the site's 220 words a minute (`readingMinutes`,
`lib/posts.ts`), that is close to four hours of reading.

| Series | Posts (slug, FR words) |
|---|---|
| Construire Orazaka (9) | `why-krizaka-builds-sovereign-ai-in-montreal` 1,113 · `local-first-ai-platform-spring-ai-2-and-the-mac` 1,479 · `orazaka-from-one-mac-to-anywhere` 1,384 · `running-an-agent-on-the-users-machine` 2,316 · `orazaka-admin-console-who-can-open-it` 1,390 · `why-orazaka-has-a-mac-app` 1,434 · `one-interface-web-mac-android` 1,284 · `why-we-moved-our-15-november-date` 1,784 · `orazaka-engine-v2` 1,033 |
| Construire Krizaka (9) | `payments-and-high-risk-industries` 1,417 · `krizaka-ui-one-kit-three-platforms` 989 · `accounts-and-keys-of-a-one-person-company` 1,048 · `choosing-providers-when-every-app-has-its-own-trade` 1,906 · `automate-running-your-company-with-scripts` 1,719 (`sensitive: true`) · `getting-out-of-the-ai-look-in-ui-design` 2,144 · `krizaka-motion-our-animation-lab` 1,561 · `krizaka-books-on-akinaza-contracts-on-yomizaka` 1,092 · `coding-agents-one-night` 1,169 |
| Mesuré (4) | `what-image-and-video-generation-costs` 2,055 · `anatomy-of-an-ai-prompt` 1,730 · `real-cost-of-an-image-paying-for-intent` 2,235 · `how-we-generate-cinematic-videos-with-ai` 3,096 |
| Les bases (5) | `understanding-ai-before-you-start` 1,821 · `censored-and-uncensored-models` 1,459 · `from-vibe-coding-to-agentic-engineering` 1,261 · `ai-model-families-and-why-you-need-a-gpu` 2,946 · `is-that-ai-model-really-open-source` 1,959 |
| No series (3) | `plugging-a-product-into-an-ai-engine` 2,339 · `how-we-build-yomizaka` 1,875 · `yomizaka-where-we-are` 848 |

(The Construire Orazaka series has no part 3: its parts are 1, 2 and 4–10.)

What repeats, and what the plan fixes:

- **The same moment is told several times.** The Mac giving out on 12 October is in the Mac post, the agentic post and the
  basics. The GPU left on is in five posts: costs, accounts, agent, providers and 15 November. The idea that models are rows
  in a table (ADR-030) is in the Mac post, the portability post and the agentic post.
- **Recaps.** 20 of the 187 sections are recaps (« Ce que vous pouvez en retenir », « Ce que je retiens », « Où nous
  allons »…). They are the vaguest text on the blog. The chapters drop them and keep only the one concrete sentence a recap
  sometimes holds.
- **Superseded posts.** `from-vibe-coding-to-agentic-engineering` says the local agents are « en cours », while
  `running-an-agent-on-the-users-machine` says they shipped on 19 October. The admin console post says the console « is
  moving » into the app.
- **A contradiction must be settled before writing**, because the voice rule forbids choosing for Oussama. The posts give
  four versions of the GPU left on:
  - « environ deux heures … entre 7 et 8 $ » (`what-image-and-video-generation-costs`, `accounts-and-keys-…`);
  - « Le 16 octobre, un GPU est resté allumé cinq heures sans rien faire : environ vingt dollars » (`running-an-agent-…`);
  - a pod with 5 h billed, about 20 $ (`choosing-providers-…`);
  - « 25 clips … Cinq heures au total : 2,8 heures à calculer, 2,2 heures à attendre » (`why-we-moved-…`).

  Is this two incidents or one? Chapter 3 tells it once, with the figure Oussama confirms.

## 1. The chapters

There are eight chapters, in the order the story happened. Each chapter is one MDX file per language, with the same slug. It
is written by joining the sentences of the posts it absorbs, under the voice rule (§ 7).

- **Length** counts French words of body text. At 220 words a minute, 1,300–2,200 words reads in 6–10 minutes.
- **Section titles** reuse a heading of the source post wherever one fits. Their anchors are the ids `github-slugger`
  gives them (as `rehype-slug` writes them), and the redirect map (§ 3) uses them.
- **Post rules.** Every chapter keeps the post-level rules of `AGENTS.md`:
  - a `cover` and its `coverAlt`, an existing media entry that is never shown again in the body;
  - `<Model>` on the first mention of a model;
  - figures only from the posts;
  - MDX props as strings.

### Chapter 1 — `why-krizaka`

- **FR** « Pourquoi je construis Krizaka à Montréal » · **EN** "Why I am building Krizaka in Montréal"
- **Promise**: who writes, what « souverain » means here in one sentence, and what it costs to be able to prove it.
- **Absorbs**: `why-krizaka-builds-sovereign-ai-in-montreal` (the whole post, minus its recap).
- **Sections**:
  1. The opening, without a heading: the H100 in region CA-MTL-1, and the 48 GB GPU that was never in stock in Toronto.
  2. « D'abord, qui écrit ».
  3. « IA souveraine, en une phrase »: the notary, and the run that keeps its id, its version and its rules.
  4. « Pourquoi ici »: the Code civil, Loi 25, and FR and EN on the same day.
  5. « Ce que ça m'oblige à faire »: no source, no finding; a small infrastructure; open-source foundations; « en développement » said plainly.
  6. « Ce qui n'est pas réglé »: 3,99 $ US an hour, a rented machine is not an owned one, and the rules still awaiting a lawyer.

  The three questions of the old recap and the blog's rule (« Si une affirmation ne remonte pas à une mesure… ») close the chapter.
- **Media**: cover `clip-old-port`; `<Clip id="clip-montreal">`.
- **Length**: ≈ 1,050 words, 5–6 min. This is the opening, so it is the shortest chapter on purpose.

### Chapter 2 — `an-engine-on-a-laptop`

- **FR** « Un moteur d'IA sur un portable » · **EN** "An AI engine on a laptop"
- **Promise**: Orazaka began on one MacBook. What broke on 12 October, what Spring AI 2 changed, and how the engine learned to run somewhere else.
- **Absorbs**:
  - `local-first-ai-platform-spring-ai-2-and-the-mac`: all but its recap;
  - `orazaka-from-one-mac-to-anywhere`: steps 1–3 and « Ce qui garde le tout honnête » (step 4 and « Ce qui reste difficile » go to chapter 3);
  - `from-vibe-coding-to-agentic-engineering`: the two sentences of « Agnostique » on what it costs.
- **Sections**:
  1. « Le 12 octobre, le Mac a saturé »: a load of 100–260, `ENFILE`, the `.heavy.lock` folder, and the 11 Spring Boot services (an estimate, orazaka#132).
  2. « Les modèles deviennent des données »: the June migration (ADR-030), `ai_providers` and `orazaka_models`, the `DynamicModelRouter`, the phone book.
  3. « La ClassCastException qui a coupé le chat »: the code block and the silent routing to a hosted model (orazaka-ai-engine#13). Then, in two short paragraphs, the disk that forgets and the tunnel that drops.
  4. « Du monolithe aux services »: ArchUnit, ADR-032 and the strangler fig, about twenty repositories and their cost.
  5. « Des conteneurs et une ligne de commande »: the `npx orazaka install` block, Colima against Docker Desktop and OrbStack, and the pack outside the repository that failed four times (ADR-049).
  6. « Ce que le Mac fait bien, et où il abandonne »: FLUX.2 [klein] at 62 s median, the three images, Wan 2.2 5B asking for 26 GiB, 131 s hosted. This hands over to chapter 3.
- **Media**: cover `gallery-mini-picnic`; `orazaka-portability`; a `<Row>` of `gallery-mini-skating`, `gallery-mini-souk` and `gallery-mtl-ruelle`.
- **Length**: ≈ 2,000 words, 9 min.

### Chapter 3 — `what-a-gpu-costs`

- **FR** « Ce que coûtent une image et une vidéo : mes factures » · **EN** "What an image and a video cost: my bills"
- **Promise**: the bills of the first weeks, the GPU left on, the price of a result I actually keep, and why I moved the 15 November date.
- **Absorbs**:
  - `what-image-and-video-generation-costs`: all of it, with « Ce que je n'ai pas mesuré » reduced to one sentence;
  - `real-cost-of-an-image-paying-for-intent`: « Deux prix qu'on confond », « La boucle » and « Ce que je mesure ». « Qui paie la boucle ? » shrinks to its Orazaka sentence: the credit is reserved, and a failed run releases it;
  - `choosing-providers-when-every-app-has-its-own-trade`: the GPU choice, the table cut to GPU, media, e-mail and maps, « Du coût unitaire au prix », and the excerpt of the report;
  - `why-we-moved-our-15-november-date`: « Ce qui m'a fait changer d'avis », and « L'infrastructure : deux mots d'ordre » in two paragraphs, with every estimate still marked « estimation »;
  - `orazaka-from-one-mac-to-anywhere`: step 4 (ADR-077), and the cold starts and the warm GPU of « Ce qui reste difficile ».
- **Sections**:
  1. « Trois façons de faire cuire le même plat »: the Mac, a hosted API, a rented GPU. FLUX takes 62 s, with 6 failures in 18 from client timeouts; SD 3.5 takes 8 s for 0,08 $.
  2. « La vidéo, hébergée ou sur un GPU loué »: the five Wan 2.2 configurations, and ADR-077.
  3. « Ce que j'ai vraiment payé »: 17,36 $, 3,24 $ and 19,99 $, and the 11,51 $ lost. The GPU left on, told once (see § 0). The guard at 20 min or 6 h, and the `<Utilization>` slider.
  4. « Le prix d'un résultat qu'on garde »: X ÷ p, the loop, 4,80 $ and 72 min against 1,28 $ and 19 min.
  5. « Choisir ses fournisseurs, puis un prix »: RunPod measured on our own work, from the unit cost to a price, and the 17-day report with the GPU at ≈ 78 %.
  6. « Pourquoi j'ai déplacé le 15 novembre »: 25 clips, 2,8 h computing and 2,2 h waiting, 57 GB loaded in 129 s. Then the order: wait, load, batch, engine. And the milestone without a date.
- **Media**: cover `compare-montreal-winter-sd35`; a `<Row>` of `compare-moroccan-riad-flux`, `-sd35` and `-sd15`; `<Clip id="clip-tea-pour">`;
  `intent-loop`; `unit-cost-to-price`; `<Numbers>` of the four video prices; `<Utilization>`.
- **Length**: ≈ 2,200 words, 10 min.

### Chapter 4 — `from-a-clip-to-a-film`

- **FR** « D'un clip à un film : ce que nous avons raté d'abord » · **EN** "From a clip to a film: what we got wrong first"
- **Promise**: two films judged by eye, then measured. The defect was in the pipeline, not in the prompt. And what a finished minute costs.
- **Absorbs**:
  - `how-we-generate-cinematic-videos-with-ai`: the eight steps, in one paragraph each. A link to the licence post on the shelf replaces the licence table;
  - `real-cost-of-an-image-paying-for-intent`: « Plus on attrape l'erreur tard, plus elle coûte » and « Deux fois où je n'avais pas de boucle ».
- **Sections**:
  1. « Deux fois où je n'avais pas de boucle »: the first showcase batch (5 clips, 6 $, 1,5 h of GPU) and the bird keyframes that were rejected. Then the cost of an error by stage: 0,01 $ at the keyframe, 0,36 $ at the shot, 1,57 $ at the edit.
  2. « Ce que j'ai vu, et entendu »: « l'aube », 6,5 h of H200 for 34,42 $, and the verdict.
  3. « Le défaut n'était pas dans le prompt »: the treatment, the critique, the motivated action (59 % and 69 %), the voice chosen blind (Zonos; Qwen2-Audio picked « A » 36 times in 36), music at −14 LUFS, foley made from noise, the titles, and 4K with SeedVR2.
  4. « Les chiffres, avec leur contexte »: « le relais », 35,27 $ and 31,12 $ per finished minute, the guard at 20 min or 6 h, and the 200 GB disk.
  5. « Le film »: « La ligne à ne pas franchir » joins this section.
- **Update note** (Oussama, #103): « le relais » is the brand film, and « l'aube » and « la tournée » are withdrawn.
  - The chapter tells them as steps of the work, with a one-line « Mise à jour, octobre 2026 » in Oussama's words.
  - It does not embed the withdrawn `birds-film` clip.
- **Media**: cover `relay-medina-cover`; `bakeoff-before-after`; `birds-rejected-keyframes`; `<Clip id="nova-ardent-short">`;
  `aube-lineup`; a `<Row>` of `aube-owl` and `relay-medina-scene`; `relay-title`; `<Clip id="relay-film">`; `<Numbers>` of the three error costs.
- **Length**: ≈ 2,200 words, 10 min. The 3,096-word source is cut by a third.

### Chapter 5 — `one-interface-everywhere`

- **FR** « Une seule interface, du web au Mac » · **EN** "One interface, from the web to the Mac"
- **Promise**: one kit for three platforms, the day the screens looked « IA », the animation bug nobody saw, and why Orazaka has a Mac app.
- **Absorbs**:
  - `krizaka-ui-one-kit-three-platforms`;
  - `getting-out-of-the-ai-look-in-ui-design`, with the checklist and its console snippet cut;
  - `krizaka-motion-our-animation-lab`: the bug and its tests are kept whole, and the system is told in one paragraph;
  - `why-orazaka-has-a-mac-app`;
  - `one-interface-web-mac-android`.
- **Sections**:
  1. « Un kit, trois plateformes »: 156, 79 and 112 components, 22 gaps, the fix made once (krizaka-ui#295), and 48 versions in 10 days.
  2. « D'abord compter, ensuite juger »: « Ça m'a piqué, parce que c'était juste. », the audit, Cahier, Habitat and Affiche, the steel blue, and the calm hovers.
  3. « Le bug qui nous a appris à tester »: the motionless engine flow of 20 October, and the tests that only ran with reduced motion.
  4. « Pourquoi Orazaka a une app Mac »: v0.1, the scope check, and Tauri 2 rather than Swift (ADR-002).
  5. « La même interface, pas la même mise en page »: the shared layers, the radius tests that Cahier broke (#54), one Expo code base, and `label` against children.
- **Media**: cover `cahier-cover`; `kit-platforms`; `audit-before-www`; a `<Row>` of `dir-cahier`, `dir-habitat` and `dir-affiche`;
  `steel-before-after`; a `<Row>` of `calm-before-ui` and `calm-after-ui`; `<Clip id="motion-engine-clip">`.
- **Length**: ≈ 2,200 words, 10 min.

### Chapter 6 — `the-first-products`

- **FR** « Les premiers produits : Yomizaka et Akinaza » · **EN** "The first products: Yomizaka and Akinaza"
- **Promise**: what Yomizaka reads today and how a rule is written, a whole building in one upload, and our own invoice refused by our own tool.
- **Absorbs**:
  - `how-we-build-yomizaka`;
  - `yomizaka-where-we-are`;
  - `krizaka-books-on-akinaza-contracts-on-yomizaka`;
  - `plugging-a-product-into-an-ai-engine`: « Ce qui part, ce qui revient » and the failure that looked like an outage (ADR-053). The analyst's side and the industry table are cut.
- **Sections**:
  1. « Un talon de paie sur un téléphone »: the café, the three blocking findings, and the file examined for signals.
  2. « Comment on écrit une règle »: `QC-LEASE-004` and `TO_REVIEW_BY_LAWYER`.
  3. « Un produit ne parle jamais à un modèle »: the service key, the run id, about 4 s, and the refusal swallowed as an outage.
  4. « Tout un immeuble en un seul dépôt »: the CSV, nothing charged twice, `.docx`, and photo metadata.
  5. « Nos livres sur Akinaza, nos contrats sur Yomizaka »: 8 rules out of 8 and 4 out of 4, and the invoice from Akinaza that Yomizaka refused.
  6. « Où on en est »: the order of work, Android, the API keys, and the rules still awaiting a lawyer.
- **Updates** (#103): Yomizaka API v1 is merged, and the Akinaza storefronts are in the Cahier style.
  - Each one is written only with a link to its merged PR, checked at writing time.
  - Anything not merged stays out.
- **Media**: cover `yomizaka-cafe-table`; `yomizaka-home`, `yomizaka-lease-info` and `yomizaka-lease-run`; `connectors-flow`;
  `<Clip id="akinaza-books-en">` and `<Clip id="yomizaka-review-en">`.
- **Length**: ≈ 2,200 words, 10 min.

### Chapter 7 — `an-empty-result-is-not-a-success`

- **FR** « Un résultat vide n'est pas un succès » · **EN** "An empty result is not a success"
- **Promise**: what we will never give an agent, the one content rule nobody can change, and an engine that learned to say « juste » and not only « fini ».
- **Absorbs**:
  - `running-an-agent-on-the-users-machine`;
  - `censored-and-uncensored-models`: « Ce que fait Orazaka » and « Ce qu'on a vraiment testé ». Its four general sections become one paragraph, which keeps the Criminal Code reference;
  - `orazaka-admin-console-who-can-open-it`: the four rules, and the move into the app;
  - `orazaka-engine-v2`;
  - `why-we-moved-our-15-november-date`: « La ligne de commande » and « Là où nous nous sommes écartés »;
  - `from-vibe-coding-to-agentic-engineering`: « Les agents locaux : en cours », now superseded and replaced by what shipped.
- **Sections**:
  1. « Ce que nous avons refusé »: `orazaka agent listen`, which ran any shell command, closed on 17 October (orazaka-cli#54), and the three refusals.
  2. « Ce qui tourne sur le Mac aujourd'hui »: the fixed plan, one folder, and the run of 36 s with a 13-entry chain. Then the signed calls in the cloud, with the `text` block of replies.
  3. « La seule règle qu'on ne peut pas changer »: `minors_risk` answers 422, the three layers, and what was really tested.
  4. « La console d'administration »: the address list, the role checked on the server, the proxy, then the move into the app on 21 October.
  5. « Le contrat de sortie »: the empty ranking, the review checked against the code, `outputContract`, the exact cache, and resuming from a step.
  6. « Une session qui survit »: ADR-086 (accepted, not shipped), no graph library, and no model names before they run.
- **Updates** (#103):
  - The console now lives in `orazaka-web-client`. Verify it in krizaka/.github#209/#212/#213 before writing.
  - ADR-087 and ADR-088 appear only as « en cours », if at all.
- **Media**: cover `orazaka-v2-workbench`; `agent-where`; `<Clip id="agent-mac-clip">` and `<Clip id="agent-cloud-clip">`; `policy-flow`.
- **Length**: ≈ 2,200 words, 10 min.

### Chapter 8 — `building-with-agents`

- **FR** « Construire presque seul, avec des agents » · **EN** "Building almost alone, with agents"
- **Promise**: from vibe coding to written rules, the keys an agent must never see, the scripts that run the company, and thirty coding agents in one night.
- **Absorbs**:
  - `from-vibe-coding-to-agentic-engineering`: « Comment je suis sorti du vibe coding » and the five pieces of an agentic system;
  - `accounts-and-keys-of-a-one-person-company`;
  - `automate-running-your-company-with-scripts`;
  - `coding-agents-one-night`.
- **Sections**:
  1. « Comment je suis sorti du vibe coding »: the rules file, the lock, and « jamais de fusion avec un check en attente ».
  2. « Les erreurs qui m'ont appris »: the agent that printed a database address with its password, then the guard. Twelve services, and more than 80 secret values read one at a time.
  3. « Une tâche faite trois fois devient un script »: the five steps, the 27 commands, the inbox, and the GitHub board.
  4. « Une trentaine d'agents en une nuit »: the empty PRs, the CI that never ran, the Java that never compiled, and the prompt that invented a law.
  5. « Les règles qu'on a écrites »: the charter, and the build pack (`krizaka-ci.yml@v2`).
- **`sensitive: true`**: this chapter is about how the company is run, and it absorbs a sensitive post, so the strict rules apply:
  - no amount of money, no supplier name, no key or variable name, and no ledger, fiscal or bank word;
  - so the supplier names of « Douze services » become their roles, `MAIL_PROVIDER=mailgun` goes, and the GPU's dollars stay in chapter 3.
- **Media**: cover `agents-typewriters`; `agentic-loop`; `accounts-map` (its caption and alt text checked against the strict rules); and the `<Steps>` and `<Compare>` from the scripts post.
- **Length**: ≈ 2,100 words, 9–10 min.

**Total**: ≈ 15,000 words in eight chapters, plus ≈ 9,400 on the shelf. That is less than half of today's 51,000.

## 2. « Les bases » / "The basics" — the shelf outside the story

The shelf holds five standalone posts that teach, kept as they are or tightened. They leave the « basics » series, which is
retired, keep their slug and move to `/basics/<slug>/`.

| Slug | Kept | Tightening |
|---|---|---|
| `understanding-ai-before-you-start` | as is | links to old slugs → chapters |
| `ai-model-families-and-why-you-need-a-gpu` | as is | its prices stay dated (they already are); links → chapters |
| `anatomy-of-an-ai-prompt` | as is | the recap's last line points to chapter 3 instead of the costs post |
| `is-that-ai-model-really-open-source` | as is | also receives the licence table of the film post (§ 1, ch. 4) |
| `payments-and-high-risk-industries` | tightened | drop the « series opens here » lines; the Orochia and Kachizaka part stays as written (past fact, nothing new announced about paused products) |

**For Oussama to decide**: `censored-and-uncensored-models` could take the fifth slot instead of `payments-…`. In that
case, chapter 7 keeps only its Orazaka part and the full post stays on the shelf. The plan's default is `payments-…`,
because it teaches something no chapter covers.

## 3. URLs and the redirect map

### Where things live

- **Chapters**: `/story/<chapter>/` and `/fr/story/<chapter>/`. #106's `/story/` page is their table of contents.
- **The shelf**: `/basics/<slug>/` and `/fr/basics/<slug>/`.
- **Retired**: `/posts/…` and `/series/…` are retired entirely, and every address under them answers a 308.

### Why a function, not ingress rules

App Platform allows **at most 10 ingress rules** (`AGENTS.md`; on #106, `tests/redirects.test.mjs` checks the limit). The
site already uses 6 of them. Today's map needs **64 permanent post redirects**, plus the series pages:

- 27 retired slugs × 2 languages = 54 (25 posts, plus the 2 slugs that already redirect);
- 5 shelf posts × 2 = 10.

One rule per address cannot fit, and a static host has no redirect file. So the plan is:

- **A `legacy` package** in `functions/`, with one web action, `redirect`.
  - It reads the map from `lib/redirects.json`, the single source that the tests, the sitemap check and the function all use.
  - It answers `308` with `Location: <target>#<anchor>`. The anchor is percent-encoded, because the French ones carry accents.
  - An unknown slug gets the same `308` to `/story/`, never a 404.
- **The ingress has 6 rules**:
  - `/api` → oauth;
  - `/posts` and `/fr/posts` → the `legacy/redirect` action;
  - `/series` and `/fr/series` → the same action;
  - `/` → site.

  The four current redirect rules fold into the map and point straight at their final chapter, so there is no chain of redirects.
- **Cost**: the function is pay-per-use, like the sign-in and the newsletter, and it stays inside the free allowance. **0 $ more.**
- **To verify on a preview app before merging**:
  - that an ingress rule can send a path prefix to one function action (the rule's `rewrite`);
  - that the action receives the rest of the path.

  If App Platform cannot do it, the fallback is a static page per old address, with `<meta http-equiv="refresh">` and
  `rel="canonical"`. That page answers 200, not 308, so it needs an explicit yes from Claude and Oussama.

### The map

The anchors are the ids `rehype-slug` gives the chapter headings of § 1, computed with `github-slugger`. The test of § 6
checks that each one exists in the built chapter.

| Old slug (`/posts/…/` and `/fr/posts/…/`) | EN target | FR target |
|---|---|---|
| `why-krizaka-builds-sovereign-ai-in-montreal` | `/story/why-krizaka/` | `/fr/story/why-krizaka/` |
| `local-first-ai-platform-spring-ai-2-and-the-mac` | `/story/an-engine-on-a-laptop/` | `/fr/story/an-engine-on-a-laptop/` |
| `orazaka-from-one-mac-to-anywhere` | `/story/an-engine-on-a-laptop/#from-a-monolith-to-services` | `/fr/story/an-engine-on-a-laptop/#du-monolithe-aux-services` |
| `what-image-and-video-generation-costs` | `/story/what-a-gpu-costs/` | `/fr/story/what-a-gpu-costs/` |
| `measured-not-promised` (already a 308) | `/story/what-a-gpu-costs/` | `/fr/story/what-a-gpu-costs/` |
| `the-real-economics-of-sovereign-ai` (already a 308) | `/story/what-a-gpu-costs/` | `/fr/story/what-a-gpu-costs/` |
| `real-cost-of-an-image-paying-for-intent` | `/story/what-a-gpu-costs/#the-price-of-a-result-you-keep` | `/fr/story/what-a-gpu-costs/#le-prix-dun-résultat-quon-garde` |
| `choosing-providers-when-every-app-has-its-own-trade` | `/story/what-a-gpu-costs/#picking-providers-then-a-price` | `/fr/story/what-a-gpu-costs/#choisir-ses-fournisseurs-puis-un-prix` |
| `why-we-moved-our-15-november-date` | `/story/what-a-gpu-costs/#why-i-moved-15-november` | `/fr/story/what-a-gpu-costs/#pourquoi-jai-déplacé-le-15-novembre` |
| `how-we-generate-cinematic-videos-with-ai` | `/story/from-a-clip-to-a-film/#what-i-saw-and-heard` | `/fr/story/from-a-clip-to-a-film/#ce-que-jai-vu-et-entendu` |
| `krizaka-ui-one-kit-three-platforms` | `/story/one-interface-everywhere/` | `/fr/story/one-interface-everywhere/` |
| `getting-out-of-the-ai-look-in-ui-design` | `/story/one-interface-everywhere/#count-first-judge-later` | `/fr/story/one-interface-everywhere/#dabord-compter-ensuite-juger` |
| `krizaka-motion-our-animation-lab` | `/story/one-interface-everywhere/#the-bug-that-taught-us-to-test` | `/fr/story/one-interface-everywhere/#le-bug-qui-nous-a-appris-à-tester` |
| `why-orazaka-has-a-mac-app` | `/story/one-interface-everywhere/#why-orazaka-has-a-mac-app` | `/fr/story/one-interface-everywhere/#pourquoi-orazaka-a-une-app-mac` |
| `one-interface-web-mac-android` | `/story/one-interface-everywhere/#the-same-interface-not-the-same-layout` | `/fr/story/one-interface-everywhere/#la-même-interface-pas-la-même-mise-en-page` |
| `how-we-build-yomizaka` | `/story/the-first-products/` | `/fr/story/the-first-products/` |
| `plugging-a-product-into-an-ai-engine` | `/story/the-first-products/#a-product-never-talks-to-a-model` | `/fr/story/the-first-products/#un-produit-ne-parle-jamais-à-un-modèle` |
| `yomizaka-where-we-are` | `/story/the-first-products/#a-whole-building-in-one-upload` | `/fr/story/the-first-products/#tout-un-immeuble-en-un-seul-dépôt` |
| `krizaka-books-on-akinaza-contracts-on-yomizaka` | `/story/the-first-products/#our-books-on-akinaza-our-contracts-on-yomizaka` | `/fr/story/the-first-products/#nos-livres-sur-akinaza-nos-contrats-sur-yomizaka` |
| `running-an-agent-on-the-users-machine` | `/story/an-empty-result-is-not-a-success/` | `/fr/story/an-empty-result-is-not-a-success/` |
| `censored-and-uncensored-models` | `/story/an-empty-result-is-not-a-success/#the-one-rule-nobody-can-change` | `/fr/story/an-empty-result-is-not-a-success/#la-seule-règle-quon-ne-peut-pas-changer` |
| `orazaka-admin-console-who-can-open-it` | `/story/an-empty-result-is-not-a-success/#the-admin-console` | `/fr/story/an-empty-result-is-not-a-success/#la-console-dadministration` |
| `orazaka-engine-v2` | `/story/an-empty-result-is-not-a-success/#the-output-contract` | `/fr/story/an-empty-result-is-not-a-success/#le-contrat-de-sortie` |
| `from-vibe-coding-to-agentic-engineering` | `/story/building-with-agents/` | `/fr/story/building-with-agents/` |
| `accounts-and-keys-of-a-one-person-company` | `/story/building-with-agents/#the-mistakes-that-taught-me` | `/fr/story/building-with-agents/#les-erreurs-qui-mont-appris` |
| `automate-running-your-company-with-scripts` | `/story/building-with-agents/#a-task-done-three-times-becomes-a-script` | `/fr/story/building-with-agents/#une-tâche-faite-trois-fois-devient-un-script` |
| `coding-agents-one-night` | `/story/building-with-agents/#thirty-coding-agents-in-one-night` | `/fr/story/building-with-agents/#une-trentaine-dagents-en-une-nuit` |
| the five shelf slugs | `/basics/<slug>/` | `/fr/basics/<slug>/` |
| `/series/` and `/series/<id>/` | `/story/` (`/series/basics/` → `/basics/`) | the same under `/fr/` |

### Sitemap, feeds, OG, newsletter

- **Sitemap**: chapters and shelf posts only, with hreflang and `lastmod`. No retired URL appears, and a test checks it.
- **Feeds** (`/feed.xml` and `/atom.xml`, EN and FR): the 8 chapters and the 5 shelf posts, with their new URLs as ids. A
  feed reader will see them as new items once. That is the honest signal of a new blog.
- **OG images**: `/og/<slug>` exists for the new slugs. Old OG URLs are not redirected, because social sites cache their card.
- **Newsletter (for Oussama to decide)**: publishing 8 chapters in one push would e-mail every subscriber 8 times
  (`newsletter.yml`).
  - The plan claims all eight chapters in `newsletter_posts` before the merge, so nothing is sent automatically.
  - Oussama then sends one e-mail by hand for chapter 1 (Actions → Newsletter → Run workflow), or none.

## 4. The new home

The story comes first. #106's `/story/` page provides the data: `lib/story.ts` reads the front matter, and nothing is hand-typed. The home reuses it in this order:

1. **`PageHero`**: the blog's title and one line in Oussama's words, taken from chapter 1 (« Si une affirmation ne remonte pas
   à une mesure, à une exécution ou à une ligne de code, je ne l'écris pas. »).
2. **The chapters as the timeline**:
   - `Stepper` (`@krizaka/ui/stepper`) with eight steps. Each shows the chapter number, title and promise, and links to its chapter.
   - `SpecimenTag` (`@krizaka/ui/specimen-tag`) carries the period of each chapter, and `Landscape` (`@krizaka/ui/landscape`) heads the section.
   - The `Stepper` only renders content for the current step (#106), so the covers go in the next block, not in the steps.
3. **The latest chapter**: the large `PostCard`, with its AVIF/WebP cover (`fetchpriority="high"`, the page's LCP).
4. **The chapters' pictures**: a `PhotoGrid` (`@krizaka/ui/photo-grid`) of the eight covers, each linked. The covers move to
   `taped-photo` once it ships (krizaka/krizaka-ui#542; it is not in `@krizaka/ui` 3.43.0). Nothing is hand-made here.
5. **« Les bases »**: a `CardGrid` of five `LinkCard`s.
6. **The newsletter form**, as today.

Front matter and ordering:

- **`chapter: <1–8>`** orders the story and replaces `series` and `part`.
- **`period`** holds the dates of the posts the chapter absorbs (listed in § 1), and the timeline shows it.
- **`date` and `publishedAt`** are the real day of the refonte, never the dates of the old posts.
- **The home**: its « first three » rule becomes « the latest chapter first ». The diagram-cover rule still holds: no chapter cover is a diagram.

The bar's sections become Story (`/story/`), Basics (`/basics/`), Search, Feed and About. « Series » leaves.

## 5. Phase 2 — the order of work (after « validé » only)

1. Rebase on #106 once it is merged.
2. Write the 8 chapters, FR first and then EN, two chapters per PR so that each review stays readable. Each PR description
   lists, for every paragraph, the source post and the section it comes from.
3. In the same PR as the last chapter:
   - move the shelf posts and delete the absorbed posts;
   - add `lib/redirects.json`, the function and the ingress rules;
   - update the sitemap, the feeds, the home and the bar.
4. Media: no new image. Every cover and figure is an existing entry of `lib/media.json`, and entries no longer used stay in the library.
5. Captures of the home and of one chapter, in dark and light, on desktop and at phone width, go to Bunny `pr-assets`, never to the repository.

## 6. Phase 2 — tests (`tests/*.test.mjs`)

- **Redirects**:
  - every retired slug, in both languages, is in `lib/redirects.json`, and none of them exists in `content/`;
  - every target is a published chapter or shelf post of the same language;
  - every anchor is an id of that chapter's table of contents (`tocOf`, `lib/reading.ts`);
  - the function answers `308` with the percent-encoded `Location`, and sends an unknown slug to `/story/`.
- **Ingress**: at most 10 rules. `/posts`, `/fr/posts`, `/series` and `/fr/series` go to the function, and `/api` and `/` are unchanged.
- **Chapters**: every chapter exists in FR and EN, with the same slug, `chapter` and `period`. The chapter numbers run from 1 to 8 without a gap.
- **No dead internal link**: `scripts/check-links.mjs` runs on the built `out/`, and no post body links to `/posts/…` or `/series/…`.
- **Sitemap and feeds**: no retired URL, and every chapter and shelf post present.
- **Content**:
  - `npm run lint`: check-content, confidentiality (with chapter 8 `sensitive: true`), `<Model>` links and the media rules;
  - `npm test` and `npm run build`;
  - `scripts/check-meta.mjs out`: one h1, titles ≤ 60 characters, descriptions ≤ 155.

## 7. The voice rule, as applied here

- FR is written first, in Oussama's first person. EN is a natural translation, not a word-for-word one.
- No sentence is new, unless it only joins two kept sentences (« Le Mac, lui, ne disparaît pas. » is the kind of link that is
  allowed). Every figure, date and quote is copied from a post, and the PR description gives its source.
- What is cut first: the recaps, the « what you can take from it » lists, the « this series opens here » lines, and anything vague.
- No « plongeons », no « il est crucial », no « en conclusion », no lists of three. Few bullets, little bold.
- **Changed facts.** A fact that changed since a post was written appears only as a dated note, « Mise à jour, octobre 2026 : … ».
  The note is written only once the fact is checked in the merged PR or issue (§ 1, chapters 4, 6 and 7).
- **Paused products.** Orochia, Yasakia, Yororis and Kachizaka are named only where an old post already names them, and
  nothing new is announced about them.

## 8. Open questions

For Oussama:

1. The chapter list and its order (§ 1). Is eight right? Are chapters 1 and 8 at the right ends?
2. The GPU left on: one incident or two, and which figure (§ 0)?
3. The shelf's fifth slot: `payments-…` (the default) or `censored-…` (§ 2)?
4. The newsletter: one e-mail for chapter 1, or none (§ 3)?

For Claude:

5. The `/story/<chapter>/` and `/basics/<slug>/` paths, and the redirect function. The fallback is static pages that answer 200 (§ 3).
6. Should `chapter` and `period` be new front-matter fields, or be derived from somewhere else (§ 4)?

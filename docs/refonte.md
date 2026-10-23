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
is written by joining the sentences of the posts it absorbs, under the voice rule (§ 8).

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
  1. « Trois façons de faire cuire le même plat »: the Mac, a hosted API, a rented GPU. FLUX takes 62 s at the median with
     **6 successes in 18** (the post's table: « 6 sur 18 »), and the post's own account of the 12 others stays whole: nearly all
     of them the image client giving up after two minutes and reporting a 1×1 transparent image as a success, plus two finished
     images overwritten by retries of the same name — not all client timeouts, and still counted as failures; SD 3.5 takes
     8 s for 0,08 $.
  2. « La vidéo, hébergée ou sur un GPU loué »: the five Wan 2.2 configurations, and ADR-077.
  3. « Ce que j'ai vraiment payé »: 17,36 $, 3,24 $ and 19,99 $, and the 11,51 $ lost. The GPU left on, told once (see § 0). The guard at 20 min or 6 h, and the `<Utilization>` slider.
  4. « Le prix d'un résultat qu'on garde »: X ÷ p, the loop, and the post's worked example (4,80 $ and 72 min against
     1,28 $ and 19 min) **told as the hypothetical calculation it is**, with its stated assumptions: one acceptable start in
     four, a preview that predicts the final clip (« ce n'est pas toujours vrai »), and the judge's cost unmeasured. Measured
     are only the two unit prices it starts from (1,20 $ and 18 min a clip, ≈ 0,02 $ and 14 s a preview); the saving is never
     presented as a shipped result (§ 5.5).
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
  1. « Un kit, trois plateformes »: 156, 79 and 112 components, the tab bar's unwanted vertical scrollbar fixed once in the
     kit (krizaka-ui#295), the **22 native gaps that remain** (« 22 trous, c'est 22 endroits où une app mobile doit
     attendre »), and 48 versions in 10 days.
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

The anchors are the ids `rehype-slug` gives the chapter headings of § 1, computed with `github-slugger`. The test of § 7
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
- **Newsletter (for Oussama to decide)**: nothing is sent by itself, and nothing is pre-claimed.
  - `newsletter.yml` runs only on a push that touches `content/posts/**`, and `publishedBetween()`
    (`scripts/newsletter-send.mjs`) only reads `content/posts/<slug>.<locale>.mdx`: the chapters live in `content/chapters/`
    and never trigger it (`tests/chapters.test.mjs` asserts the workflow's paths). The cutover adds no published file under
    `content/posts/` (the shelf posts keep their files, the absorbed posts are deleted), so that push sends nothing either;
    a test of the cutover PR runs `publishedBetween()` over its own diff and expects an empty list (§ 7).
  - Pre-claiming would be wrong anyway: the send action answers `{already: true}` for a claimed slug without sending
    (`functions/packages/newsletter/send/index.js`), and a manual dispatch goes through the same action, so a claimed
    chapter 1 could never be announced. No slug is claimed before the merge.
  - **One e-mail for chapter 1**: a manual dispatch (Actions → Newsletter → Run workflow, slug `why-krizaka`) after the
    cutover, once the sender knows chapters (§ 6.3 and § 7: `--slug` resolves `content/chapters/<slug>` and builds
    `/story/<slug>/`); the action claims it then, and only then. **None**: no dispatch.

## 4. The new home

The story comes first, and the home is the character select screen of § 5. #106's `/story/` page provides the data:
`lib/story.ts` reads the front matter, and nothing is hand-typed. The home reuses it in this order (wireframe in § 5.3):

1. **`PageHero`**: the blog's title and one line in Oussama's words, taken from chapter 1 (« Si une affirmation ne remonte pas
   à une mesure, à une exécution ou à une ligne de code, je ne l'écris pas. »). Its one action is « Press start », a link to
   chapter 1.
2. **The chapters as the select screen**: `ChoiceGrid` (`@krizaka/ui/choice-grid`, `variant="arcade"`), eight tiles in
   reading order, each a link to its chapter (§ 5.2). The latest chapter's tile carries the « New » badge, wherever it sits.
   The page's LCP is **the first tile's cover** — the one on the first screen at every width, since on a phone the eighth
   tile is far below the fold — so it alone is the `CoverImage` with `fetchpriority="high"` and the preload (AVIF/WebP); the
   seven other covers, the « New » one included, wait until they are near the window (`LazyImg`). Badge and priority are
   independent of each other.
3. **The timeline**: `Stepper` (`@krizaka/ui/stepper`) stays on `/story/`, #106's page, which the home links under the grid
   (« Toute l'histoire, dans l'ordre »). `SpecimenTag` carries each chapter's period on its tile, and `Landscape` heads the
   grid's band.
4. **The latest chapter**: it is the select grid's « New » tile, so it is not repeated as a large `PostCard`.
5. **« Les bases »**: a `CardGrid` of five `LinkCard`s, in the calm (`default`) look. The arcade stays with the story.
6. **The newsletter form**, as today.

The covers are shown as `TapedPhoto` once it ships (krizaka/krizaka-ui#542; it is not in `@krizaka/ui` 3.43.0). Until then
they are the existing `<picture>` of `CoverImage`. Nothing is hand-made here.

Front matter and ordering:

- **`chapter: <1–8>`** orders the story and replaces `series` and `part`.
- **`period`** holds the dates of the posts the chapter absorbs (listed in § 1), and the timeline shows it.
- **`date` and `publishedAt`** are the real day of the refonte, never the dates of the old posts.
- **The home**: its « first three » rule becomes « the latest chapter first ». The diagram-cover rule still holds: no chapter cover is a diagram.

The bar's sections become Story (`/story/`), Basics (`/basics/`), Search, Feed and About. « Series » leaves.

## 5. The art direction: an arcade hall

Oussama (2026-10-23): « KOF, salle d'arcade, SNK vs Capcom ». The story is told like a night at a 90s arcade, in the
fighting-game « versus » era, on top of the Cahier identity (paper, ink, the birds). Four screens carry it:

| Screen | Where | What it shows |
|---|---|---|
| Character select | the home | the eight chapters as fighter cards, the chapter's bird as the fighter, its cover as the portrait, « Press start » |
| Versus | the head of each chapter | what I faced against what we built, then « Round 1, Round 2… » before each section |
| Stats | the end of each chapter's body | time spent, what broke, what shipped: plain figures copied from the chapter |
| Continue? | the close of each chapter | the next chapter, and a grade stamp for what was learned |

### 5.1 The pieces, and what is missing

Everything comes from `@krizaka/ui`. What exists in 3.43.0 (the version this repository has) is used as is. What is not
released yet is waited for, never hand-made here.

| Piece | Package | In 3.43.0? | Used for |
|---|---|---|---|
| `ChoiceGrid` `variant="arcade"` | `@krizaka/ui/choice-grid` | yes | the character select grid (tiles with `visual`, `eyebrow`, `badge`, `meta`, `href`, `brand`) |
| `StageBanner` `variant="arcade"` | `@krizaka/ui/stage-banner` | yes | « Round 1 » before each h2 (`size="sm"`), and the chapter number on the versus screen |
| `AchievementList` / `Achievement` `variant="arcade"` | `@krizaka/ui/achievement` | yes | « what shipped », with what it replaced struck through (`replaced`) |
| `<Numbers><Num>` (the blog's, over `NumberTicker`) | `app/components/pages/mdx.tsx` | yes | the stats screen's figures |
| `ContinuePrompt` `variant="arcade"` | `@krizaka/ui/continue-prompt` | yes | the « Continue? » screen |
| `Mascot` / `BirdPlate` | `@krizaka/ui/mascots`, `bird-plate` | yes | the chapter's bird |
| `Stepper`, `Landscape`, `SpecimenTag`, `PhotoGrid` | `@krizaka/ui/*` | yes | the timeline on `/story/`, the home band, the period tag |
| `VersusCard` | krizaka/krizaka-ui#548 | no | the versus screen |
| `SpeedLines` | krizaka/krizaka-ui#548 | no | behind the versus screen only |
| `GradeStamp` | krizaka/krizaka-ui#548 | no | the stamp on the continue screen |
| `Doodle` | krizaka/krizaka-ui#548 | no | one margin mark per chapter at most (an arrow to the versus, the bird's sketch) |
| `TapedPhoto` | krizaka/krizaka-ui#542 | no | the covers on the select tiles and the versus portraits |

The `arcade` look of these blocks lives in `@krizaka/ui/story.css`, which the blog does not import yet (`SiteRoot.tsx`
imports `blocks.css` only). Phase 2 adds it. Its rules already cover the light theme (`.light .kzs-arcade …`).

**Missing pieces, to file in krizaka-ui** (I cannot open issues from this run; Claude or Oussama files them, or tells me to
fold them into #548):

1. **A fighter tile**: `ChoiceGrid`'s `visual` is one node. The select screen needs two layers in it, the cover as the
   portrait and the bird standing in front of it, with the bird's idle loop. Either a `fighter` slot on `ChoiceItem`, or
   `VersusCard`'s fighter exported on its own.
2. **`GradeStamp` without a score**: the stamp must be able to carry only its remark. A chapter has a real score only when a
   run gave one (§ 5.6); a made-up « 17/20 » is exactly what the voice rule forbids.
3. **An MDX-friendly round marker**: « Round n » must come before each h2 without being typed in the MDX and without changing
   the heading's id (the redirect anchors of § 3 depend on it). The plan is a small rehype step in the blog that inserts a
   `StageBanner` before each h2; if krizaka-ui prefers to own it, it becomes a `RoundMarker` there.

### 5.2 The fighters: one bird per chapter

The birds keep the meanings `@krizaka/ui` gives them (`mascots.d.ts`). This is a proposal; **Oussama decides**.

| # | Chapter | Bird | Why this bird | Versus: what I faced (left) vs what we built (right), from the chapter's own text |
|---|---|---|---|---|
| 1 | Pourquoi Krizaka | `lovebird` (introductions) | « D'abord, qui écrit » | « une affirmation sans source » vs « une exécution qui garde son id, sa version et ses règles » |
| 2 | Un moteur sur un portable | `duck` (building, code) | the engine, the services | « le Mac saturé du 12 octobre » vs « les modèles deviennent des données » |
| 3 | Ce que coûte un GPU | `magpie` (the score, points) | the bills and the figures | « le GPU resté allumé » vs « la garde à 20 min ou 6 h » |
| 4 | D'un clip à un film | `crane` (listening, a calm moment) | the film, the voice and the music | « l'aube, jugée à l'œil » vs « le relais, mesuré » |
| 5 | Une interface partout | `flamingo` (answers) | the screen that answers the reader | « l'air IA » vs « Cahier » |
| 6 | Les premiers produits | `owl` (reading, documents) | Yomizaka reads leases and pay slips | « notre facture Akinaza » vs « Yomizaka, qui la refuse » |
| 7 | Un résultat vide… | `falcon` (watch, security) | what we will never give an agent | « `orazaka agent listen` » vs « un plan fixe, un dossier » |
| 8 | Construire avec des agents | `beaver` (a small business at work) | a company run almost alone | « une trentaine d'agents, des PR vides » vs « la charte et le pack de build » |

The versus lines are short labels, not new sentences: each one names a moment the chapter tells. In Phase 2 each label is
checked against its section, and the PR cites it. In chapter 8 (`sensitive: true`) the labels name no supplier and no amount.
In chapter 3 the left side waits for the GPU-left-on figure (§ 0, § 9).

### 5.3 Wireframe: the character select screen (the home)

Desktop (≥ 1024 px). Four tiles a row, two rows; the reading order is chapter 1 to 8, left to right.

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [K] Krizaka Blog    Histoire  Les bases  Recherche  Flux  À propos     ◐  FR/EN  ← krizaka.com   │  NavBar
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   [the blog's title, as today]                                           PageHero                │
│   « Si une affirmation ne remonte pas à une mesure, à une exécution ou à une ligne de code,      │
│     je ne l'écris pas. »                                                                         │
│                                                                                                  │
│   [ Start ]  Press start → chapitre 1                                    (Kbd + link)            │
│                                                                                                  │
├ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~  Landscape (the band)  ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ┤
│  CHOISIS TON CHAPITRE                                    ChoiceGrid variant="arcade", 4 columns  │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐                 │
│  │ 01 · [période]  │ │ 02 · [période]  │ │ 03 · [période]  │ │ 04 · [période]  │  eyebrow +      │
│  │ ┌─────────────┐ │ │ ┌─────────────┐ │ │ ┌─────────────┐ │ │ ┌─────────────┐ │  SpecimenTag    │
│  │ │   cover     │ │ │ │   cover     │ │ │ │   cover     │ │ │ │   cover     │ │  portrait       │
│  │ │      (bird) │ │ │ │      (bird) │ │ │ │      (bird) │ │ │ │      (bird) │ │  (TapedPhoto)   │
│  │ └─────────────┘ │ │ └─────────────┘ │ │ └─────────────┘ │ │ └─────────────┘ │                 │
│  │ Pourquoi        │ │ Un moteur d'IA  │ │ Ce que coûtent  │ │ D'un clip à un  │  name           │
│  │ Krizaka         │ │ sur un portable │ │ une image…      │ │ film            │                 │
│  │ promesse, 1 l.  │ │ promesse, 1 l.  │ │ promesse, 1 l.  │ │ promesse, 1 l.  │  title          │
│  │ 6 min        →  │ │ 9 min        →  │ │ 10 min       →  │ │ 10 min       →  │  meta           │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘                 │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌──────────[NEW]──┐                 │
│  │ 05 …            │ │ 06 …            │ │ 07 …            │ │ 08 …            │  latest chapter │
│  │ …               │ │ …               │ │ …               │ │ …               │  = « New » badge│
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘                 │
│  Toute l'histoire, dans l'ordre →  /story/  (Stepper, #106)                                      │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│  LES BASES                                   CardGrid of 5 LinkCards, default look (no arcade)   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                                │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘                                │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│  Newsletter: [ adresse e-mail            ] [ M'abonner ]    one muted notice line                │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

Phone (≤ 420 px). One column; the tiles stack, the portrait above the name.

```text
┌──────────────────────────────┐
│ [K]                ◐  ☰      │  NavBar (menu)
├──────────────────────────────┤
│ [the blog's title]           │
│ « Si une affirmation ne      │
│   remonte pas… »             │
│ [ Start ] Press start →      │
├ ~ ~ ~ ~ Landscape ~ ~ ~ ~ ~ ─┤
│ CHOISIS TON CHAPITRE         │
│ ┌──────────────────────────┐ │
│ │ 01 · [période]           │ │
│ │ ┌──────────────────────┐ │ │
│ │ │  cover        (bird) │ │ │  16:9, size reserved
│ │ └──────────────────────┘ │ │  (no layout shift)
│ │ Pourquoi Krizaka         │ │
│ │ promesse, 1–2 lignes     │ │
│ │ 6 min                 →  │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ 02 …                     │ │
│ └──────────────────────────┘ │
│   … 03 to 08 …               │
│ Toute l'histoire →           │
├──────────────────────────────┤
│ LES BASES  (5 cards, 1 col.) │
├──────────────────────────────┤
│ [ e-mail ][ M'abonner ]      │
└──────────────────────────────┘
```

The grid is a list of links. Keyboard and screen readers get eight links in order, each named by its chapter title. The
bird and the cover are decorative (`alt=""` on the bird, the cover keeps its `coverAlt`).

### 5.4 Wireframe: the versus screen (the head of a chapter)

The versus screen replaces the post hero. It holds the chapter's single h1 (its title), so `check-meta` still finds exactly
one h1. Chapter 2 as the example:

Desktop.

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ NavBar                                                                                           │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                         CHAPITRE 02 · [période]          StageBanner arcade, size="lg"           │
│  ╲ ╲ ╲ ╲ ╲ ╲ ╲ ╲ ╲ ╲ ╲ ╲ ╲ ╲ ╲ ╲ ╲   SpeedLines (still; behind the card only)  ╱ ╱ ╱ ╱ ╱ ╱ ╱ ╱ ╱ │
│  ┌───────────────────────────────┐        ┌──────┐        ┌───────────────────────────────┐      │
│  │  ┌─────────────────────────┐  │        │      │        │  ┌─────────────────────────┐  │      │
│  │  │  a picture of what I    │  │        │  VS  │        │  │  cover (TapedPhoto)     │  │      │
│  │  │  faced (a media entry)  │  │        │      │        │  │                (duck)   │  │      │
│  │  └─────────────────────────┘  │        └──────┘        │  └─────────────────────────┘  │      │
│  │  le Mac saturé du 12 octobre  │                        │  les modèles deviennent des   │      │
│  │                               │                        │  données                      │      │
│  └───────────────────────────────┘                        └───────────────────────────────┘      │
│                                    VersusCard (#548)                                             │
│                                                                                                  │
│   Un moteur d'IA sur un portable                                         h1 (the only one)       │
│   [the chapter's description, from its front matter]                     the lead                │
│   Oussama Abid · [date] · 9 min                                          meta row                │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                     ROUND 1 · Le 12 octobre, le Mac a saturé             StageBanner arcade, sm  │
│                     ## Le 12 octobre, le Mac a saturé                    h2, id unchanged        │
│                     body text, the normal reading column (no arcade inside the text)             │
│                     …                                                                            │
│                     ROUND 2 · Les modèles deviennent des données                                 │
│                     ## …                                                                         │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

Phone.

```text
┌──────────────────────────────┐
│ CHAPITRE 02 · [période]      │  StageBanner lg
│ ┌──────────────────────────┐ │
│ │ ce que j'ai affronté     │ │  the two sides stack:
│ │ le Mac saturé du         │ │  left on top,
│ │ 12 octobre               │ │
│ └──────────────────────────┘ │
│            VS                │  « VS » between them
│ ┌──────────────────────────┐ │
│ │ cover          (duck)    │ │
│ │ les modèles deviennent   │ │
│ │ des données              │ │
│ └──────────────────────────┘ │
│ Un moteur d'IA sur un        │  h1
│ portable                     │
│ lead, meta row               │
├──────────────────────────────┤
│ ROUND 1                      │  the marker on its own line
│ ## Le 12 octobre, le Mac     │
│    a saturé                  │
│ body, reading column         │
└──────────────────────────────┘
```

Rules for the versus screen:

- **Text first.** Both labels are real text, inside the `VersusCard`, read in order (« faced », « VS », « built »). The
  pictures are decorative when the label already says it.
- **One picture rule.** The right side is the chapter's cover, shown once, as `AGENTS.md` asks. The left side is another
  existing entry of `lib/media.json` when the chapter has one that fits; otherwise the left side is the label alone, on
  paper. No new image is made for it.
- **Round markers** are decoration over an unchanged h2: the anchor ids of § 3 do not move, and `tocOf` reads the h2, not
  the marker. A chapter has 5–6 rounds (§ 1).

### 5.5 Wireframe: the stats screen (the end of a chapter's body)

The stats screen closes the body, after the last round and before « Continue? ». It is the chapter's « concrete » in one
place: its figures, what broke and what shipped. Each figure is copied from a section of the same chapter and links to it.

Chapter 3 as the example (every figure below is from § 1, chapter 3; the GPU left on waits for § 9):

Desktop.

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                     RÉSULTATS · CHAPITRE 03                StageBanner arcade, lg (title as h2)  │
│                                                                                                  │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐                     │
│  │ 62 s           │ │ 17,36 $        │ │ 11,51 $        │ │ 2,8 h · 2,2 h  │   <Numbers><Num>    │
│  │ FLUX, médiane  │ │ payé           │ │ perdu          │ │ calcul ·       │   value + label +   │
│  │ sur le Mac     │ │                │ │                │ │ attente        │   hint (its section)│
│  └────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘                     │
│                                                                                                  │
│  CE QUI A CASSÉ / CE QUI EST SORTI                         AchievementList variant="arcade"      │
│  ┌──────────────────────────────┐ ┌──────────────────────────────┐                               │
│  │ ROUND 3            [SORTI]   │ │ ROUND 6            [SORTI]   │                               │
│  │ ~~le GPU resté allumé~~      │ │ ~~le 15 novembre~~           │                               │
│  │ la garde à 20 min ou 6 h     │ │ un jalon sans date           │                               │
│  └──────────────────────────────┘ └──────────────────────────────┘                               │
│  struck = what broke or what it replaced (`replaced`), plain = what shipped (`title`)            │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

Phone.

```text
┌──────────────────────────────┐
│ RÉSULTATS · CHAPITRE 03      │
│ ┌─────────────┐┌───────────┐ │  two figures a row
│ │ 62 s        ││ 17,36 $   │ │
│ │ FLUX, Mac   ││ payé      │ │
│ └─────────────┘└───────────┘ │
│ ┌─────────────┐┌───────────┐ │
│ │ 11,51 $     ││ 2,8 h ·   │ │
│ │ perdu       ││ 2,2 h     │ │
│ └─────────────┘└───────────┘ │
│ CE QUI A CASSÉ / SORTI       │
│ ┌──────────────────────────┐ │  one card a row
│ │ ROUND 3        [SORTI]   │ │
│ │ ~~le GPU resté allumé~~  │ │
│ │ la garde à 20 min ou 6 h │ │
│ └──────────────────────────┘ │
│ … 1 more                     │
└──────────────────────────────┘
```

Rules for the stats screen:

- **Only figures the chapter already gives**, the `<Numbers>` rule of `AGENTS.md`. Four figures at most, each with its
  section in the hint. No total that the posts do not compute, no gauge whose 100 % would be invented (so no `ProfileCard`
  gauges here).
- **Chapter 8** (`sensitive: true`) shows no amount: its figures are counts the post gives (27 commands, twelve services,
  about thirty agents). Its « broke / shipped » cards follow the strict rules.
- The stats proposed per chapter, all from § 1:

  | # | Figures (≤ 4) | Broke → shipped (struck → plain) |
  |---|---|---|
  | 1 | 3,99 $ US de l'heure (the H100) | the 48 GB GPU never in stock in Toronto → an H100 in CA-MTL-1 |
  | 2 | load 100–260 · 62 s (FLUX.2 [klein], median) · 26 GiB asked (Wan 2.2 5B) · 131 s hosted | the Mac of 12 October → models as data (ADR-030); the pack that failed four times → ADR-049 |
  | 3 | 62 s · 17,36 $ · 11,51 $ lost · 2,8 h / 2,2 h | the GPU left on → the guard at 20 min or 6 h; the 15 November date → a milestone without a date. The 4,80 $ / 72 min → 1,28 $ / 19 min pair is the post's hypothetical example (§ 1, chapter 3, section 4): it stays in the text with its assumptions and is never a card |
  | 4 | 6 $ for 5 clips · 34,42 $ for « l'aube » · 35,27 $ and 31,12 $ per finished minute | the rejected bird keyframes → « le relais » |
  | 5 | 156 · 79 · 112 components · 48 versions in 10 days | the tab bar's unwanted vertical scrollbar → the fix made once in the kit (krizaka-ui#295); the motionless engine flow → the tests. The 22 native gaps are still open in the post (« 22 trous… ») and stay in the text as outstanding, never a card |
  | 6 | about 4 s · 8/8 and 4/4 rules | the refusal swallowed as an outage → ADR-053; our own invoice → refused by our own tool |
  | 7 | 36 s, 13 entries · 422 | `agent listen` → closed on 17 October (orazaka-cli#54); the console → in the app on 21 October |
  | 8 | 27 commands · twelve services · about thirty agents | empty PRs and a CI that never ran → the charter and the build pack |

### 5.6 The « Continue? » screen (the close of a chapter)

`ContinuePrompt variant="arcade"`: the title « Continuer ? » / "Continue?", the next chapter's number, title and promise
inside, and one action, a link « Chapitre 04 » with the key-cap « Start ». No countdown: a number that ticks down would be a
figure the posts do not give. The last chapter's prompt leads to « Les bases ».

The `GradeStamp` beside it carries **what was learned**: one sentence copied from the chapter (the PR cites where). It
carries a score only when a run in the chapter gave one (chapter 6: « 8/8 »); the other chapters get the remark alone, which
needs the « no score » option of § 5.1. Until `GradeStamp` ships, the sentence stands as a plain pull quote.

```text
Desktop                                                     Phone
┌───────────────────────────────────────┐ ┌────────────┐    ┌──────────────────────────────┐
│ CONTINUER ?                     ●     │ │ ce que j'ai│    │ CONTINUER ?                  │
│ Chapitre 04 · D'un clip à un film     │ │ appris :   │    │ Chapitre 04 · D'un clip à …  │
│ promesse, une ligne                   │ │ « … »      │    │ promesse                     │
│ [Start]  Chapitre 04  →               │ │ (stamp)    │    │ [Start] Chapitre 04 →        │
└───────────────────────────────────────┘ └────────────┘    │ ┌──────────────────────────┐ │
 ContinuePrompt arcade                    GradeStamp        │ │ « … »  (stamp)           │ │
                                                            │ └──────────────────────────┘ │
                                                            └──────────────────────────────┘
```

### 5.7 Restraint

- **The text stays readable.** The body is the normal reading column, untouched. The arcade lives in the frames, the
  headers and the transitions: the select grid, the versus head, the round markers, the stats and the continue screen.
- **Dark and light, and phone width.** Every screen is checked in both themes and at 390 px wide, and the captures go to
  Bunny `pr-assets`. Contrast is AA; the arcade blocks' light rules are in `story.css`.
- **Motion.** It is still under `prefers-reduced-motion` (the blocks already do it, and `SpeedLines` is specified so).
  Nothing moves the layout: every picture reserves its size, and the stamps and banners animate with transform and opacity
  only. No sound, anywhere.
- **Inspiration only.** No SNK or Capcom name, logo, character, sprite, font or sound is used or imitated. The fighters are
  our birds, the faces are `@krizaka/fonts`, and the words « Press start », « VS », « Round » and « Continue? » are the
  genre's common words, not a brand's.
- **Messages.** Every word of these screens (« Press start », « Choisis ton chapitre », « Round », « Résultats »,
  « Continuer ? », « Sorti ») is in `messages/{en,fr}.json`, checked by `krizaka-i18n check`.

## 6. Phase 2 — the order of work (after « validé » only)

1. Rebase on #106 once it is merged.
2. Write the 8 chapters, FR first and then EN, two chapters per PR so that each review stays readable. Each PR description
   lists, for every paragraph, the source post and the section it comes from. **Every chapter lands with `draft: true`**:
   the build leaves it out (`lib/chapters.ts`, as `lib/posts.ts` does), `APP_SHOW_DRAFTS=1` previews it for the review and
   the captures, and `tests/chapters.test.mjs` asserts the staged state. So no chapter is public beside the posts it
   absorbs, no feed lists half a story, and the newsletter sees nothing (§ 3). With no published chapter, the chapter page
   builds on a placeholder param that renders the 404 (`output: export` needs one).
3. In the same PR as the last chapter, the cutover:
   - flip the eight chapters to `draft: false`, both languages at once (the rule refuses a chapter published in one
     language only);
   - move the shelf posts and delete the absorbed posts;
   - add `lib/redirects.json`, the function and the ingress rules;
   - update the sitemap, the feeds, the home and the bar;
   - teach `scripts/newsletter-send.mjs` the new addresses: today `versionsOf()` builds `/posts/${slug}/` for every send,
     the manual ones included, and `waitLive()` follows redirects and takes any 200 as live — so a dispatch for
     `why-krizaka` would wait on a retired URL, be redirected to `/story/`, accept the index and e-mail a link to it. It must
     build `/story/<slug>/` for a chapter (`content/chapters/`) and `/basics/<slug>/` for a shelf post, EN at the root and
     FR under `/fr/`, and `waitLive()` must compare the final URL with the expected page (the index is a failure).
4. The arcade screens (§ 5), in their own PR after the chapters' text is approved:
   - import `@krizaka/ui/story.css`, then the select grid, the round markers, the stats and « Continue? » with the 3.43.0 blocks;
   - the versus head, `SpeedLines`, `GradeStamp`, `Doodle` and `TapedPhoto` once krizaka/krizaka-ui#548 and #542 are released.
     Until then the chapter opens on the 3.43.0 `StageBanner` and its cover, and the grade is a pull quote. No stand-in is hand-made.
5. Media: no new image. Every cover and figure is an existing entry of `lib/media.json`, and entries no longer used stay in the library.
6. Captures of the home, the versus head, the stats and « Continue? » of one chapter, in dark and light, on desktop and at phone width, go to Bunny `pr-assets`, never to the repository.

## 7. Phase 2 — tests (`tests/*.test.mjs`)

- **Redirects**:
  - every retired slug, in both languages, is in `lib/redirects.json`, and none of them exists in `content/`;
  - every target is a published chapter or shelf post of the same language;
  - every anchor is an id of that chapter's table of contents (`tocOf`, `lib/reading.ts`);
  - the function answers `308` with the percent-encoded `Location`, and sends an unknown slug to `/story/`.
- **Ingress**: at most 10 rules. `/posts`, `/fr/posts`, `/series` and `/fr/series` go to the function, and `/api` and `/` are unchanged.
- **Chapters**: every chapter exists in FR and EN, with the same slug, `chapter` and `period`. The chapter numbers run from 1 to 8 without a gap.
- **No dead internal link**: `scripts/check-links.mjs` runs on the built `out/`, and no post body links to `/posts/…` or `/series/…`.
- **Sitemap and feeds**: no retired URL, and every chapter and shelf post present.
- **Staging**: before the cutover, every chapter of `content/chapters/` is `draft: true` in both languages; after it, none
  is; a chapter that is a draft in one language only is refused.
- **Newsletter sender**: `versionsOf()` gives the EN and FR URL of a chapter (`/story/<slug>/`, `/fr/story/<slug>/`) and of
  a shelf post (`/basics/<slug>/`, `/fr/basics/<slug>/`), with the title and the cover of each; a retired slug is refused;
  `waitLive()` refuses a page that redirects to `/story/` or `/`; `publishedBetween()` over the cutover's own diff is
  empty (the merge sends nothing).
- **Home LCP**: the first tile's cover is the home's only preloaded, `fetchpriority="high"` picture, in both languages,
  whichever tile carries « New » (`scripts/check-meta.mjs out`).
- **Content**:
  - `npm run lint`: check-content, confidentiality (with chapter 8 `sensitive: true`), `<Model>` links and the media rules;
  - `npm test` and `npm run build`;
  - `scripts/check-meta.mjs out`: one h1, titles ≤ 60 characters, descriptions ≤ 155.
- **Arcade** (§ 5):
  - a round marker precedes every h2 of a chapter, and the h2 ids equal `tocOf`'s (the redirect anchors do not move);
  - the versus head holds the page's only h1, and its two labels are text;
  - every stats figure appears in the chapter's body too (the `<Numbers>` rule), and chapter 8's stats hold no amount;
  - a grade score appears only where § 5.6 allows it;
  - the home's select grid lists the eight chapters in order, each linking to its chapter.

## 8. The voice rule, as applied here

- FR is written first, in Oussama's first person. EN is a natural translation, not a word-for-word one.
- No sentence is new, unless it only joins two kept sentences (« Le Mac, lui, ne disparaît pas. » is the kind of link that is
  allowed). Every figure, date and quote is copied from a post, and the PR description gives its source.
- What is cut first: the recaps, the « what you can take from it » lists, the « this series opens here » lines, and anything vague.
- No « plongeons », no « il est crucial », no « en conclusion », no lists of three. Few bullets, little bold.
- **Changed facts.** A fact that changed since a post was written appears only as a dated note, « Mise à jour, octobre 2026 : … ».
  The note is written only once the fact is checked in the merged PR or issue (§ 1, chapters 4, 6 and 7).
- **Paused products.** Orochia, Yasakia, Yororis and Kachizaka are named only where an old post already names them, and
  nothing new is announced about them.

## 9. Open questions

For Oussama:

1. The chapter list and its order (§ 1). Is eight right? Are chapters 1 and 8 at the right ends?
2. The GPU left on: one incident or two, and which figure (§ 0)?
3. The shelf's fifth slot: `payments-…` (the default) or `censored-…` (§ 2)?
4. The newsletter: one e-mail for chapter 1, sent by hand after the cutover, or none (§ 3)? Nothing is sent by itself
   either way.
5. The arcade: the bird of each chapter and the eight versus labels (§ 5.2).
6. The arcade's words on screen: « Press start », « Choisis ton chapitre », « Round », « Continuer ? » (tu or vous, French or
   the genre's English) (§ 5.7).
7. The grade stamp: a score only where a run gave one (chapter 6), the remark alone elsewhere (§ 5.6)?

For Claude:

8. The `/story/<chapter>/` and `/basics/<slug>/` paths, and the redirect function. The fallback is static pages that answer 200 (§ 3).
9. Should `chapter` and `period` be new front-matter fields, or be derived from somewhere else (§ 4)?
10. The three missing pieces of § 5.1 (a fighter tile, `GradeStamp` without a score, the round marker): new krizaka-ui
    issues, or folded into krizaka/krizaka-ui#548?

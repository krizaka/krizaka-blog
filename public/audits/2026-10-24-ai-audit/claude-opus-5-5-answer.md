# Technical audit of the krizaka GitHub organisation

I read the organisation through public web pages, the GitHub REST API, raw files, Maven Central and the npm registry. The GitHub pages were summarised by a fetch tool. I checked the code claims that matter most (in `JobListener`, `TimeoutSimulationHook` and `SecurityConfig`) against the source files themselves. I did not clone or build anything.

**What I did not open:** `krizaka-com`, `[redacted]`, `yomizaka`, `[redacted]`, `[redacted]`, any TypeScript source, the `orazaka-end2end` suite, test file contents, the reusable `component.yml` workflow, and the `.github` repo's CONTRIBUTING/SECURITY text. GitHub's branch-protection settings need authentication (HTTP 401), so I couldn't see them.

## 1. What the organisation is

- **Size and age:** 43 public repositories, all Apache-2.0, all with 0 stars. Except `krizaka-com` (created 2026-05-31), every repo was created between 2026-10-06 and 2026-10-23, which is less than three weeks before this review. ([org repos API](https://api.github.com/orgs/krizaka/repos?per_page=100))
- **Products:** The profile lists seven products. Two are marked "Available" (Orazaka, [redacted]) and five "In development". ([org page](https://github.com/krizaka))
- **Main system:** Orazaka, a self-hosted AI platform. It is split across about 20 repositories: a Java 21 / Spring Boot microservice backend, a Python media worker, and Next.js and Expo clients. The `orazaka` repo is the workspace and governance hub. ([orazaka README](https://github.com/krizaka/orazaka))
- **Who writes the code:** One human contributor, `oussamaABID` (160 commits), plus `krizaka-agents[bot]`, `orazaka[bot]`, Copilot, dependabot and github-actions. Most recent commits are co-authored by `claude`. ([contributors API](https://api.github.com/repos/krizaka/orazaka/contributors), [commits](https://github.com/krizaka/orazaka/commits/main))

## 2. Architecture

**Strengths**
- **Clear stated design.** The governance contract calls for hexagonal ports and adapters checked by ArchUnit. Repositories are ordered in a manifest and may only depend on earlier ones, so dependency cycles are ruled out. Shared code is split into three tiers, and messaging rules are explicit: RabbitMQ is a buffer, and interactive streaming stays synchronous. ([AGENTS.md](https://raw.githubusercontent.com/krizaka/orazaka/main/AGENTS.md))
- **Decisions are recorded.** There are about 60 ADRs (027–089) and over 30 architecture documents. ([docs/adr](https://github.com/krizaka/orazaka/tree/main/docs/adr), [docs](https://github.com/krizaka/orazaka/tree/main/docs))
- **New features ship switched off.** Unfinished work goes in as schema plus disabled flags. For example, the law-corpus tables are seeded with every switch `false` and the sources disabled. ([PR #404](https://github.com/krizaka/orazaka/pull/404), [job-service README](https://github.com/krizaka/orazaka-job-service))

**Weaknesses**
- **Too many services for one person.** About 20 repos, 8+ services, a broker, pgvector and a GPU worker are maintained by one human and some agents. The authors' own audit names single points of failure, rate limiting on only 2 of 8 services, and no read timeout or circuit breaker at the edge. ([PRODUCTION_READINESS_AUDIT.md](https://raw.githubusercontent.com/krizaka/orazaka/main/docs/PRODUCTION_READINESS_AUDIT.md))
- **The authors' two audits disagree.**
  - `ARCHITECTURE_ASSESSMENT.md` says there are zero launch blockers. ([link](https://raw.githubusercontent.com/krizaka/orazaka/main/docs/ARCHITECTURE_ASSESSMENT.md))
  - `PRODUCTION_READINESS_AUDIT.md` lists 2 open critical blockers: no schema migration path (Flyway disabled), and `/intent/route` trusting scopes the caller declares. It counts 28 of 47 findings as open and says "Do not launch until §2 is closed."
  - The second audit also says the build was not run, so its "424 tests" figure is unverified.
  - A reader can't tell which document is current.
- **Hexagonal layout not followed in the job service.** `orazaka-job-service` has top-level feature packages (`catalog`, `durable`, `erasure`) next to `application` and `infrastructure`. `JobErasureController` sits outside `adapter/rest`, and there is no domain package. ArchUnit stores only 5 rules for this service: naming, `@Transactional` placement, env access and package cycles. None of them enforce layer direction. ([git tree](https://api.github.com/repos/krizaka/orazaka-job-service/git/trees/main?recursive=1), [stored.rules](https://raw.githubusercontent.com/krizaka/orazaka-job-service/main/archunit_store/stored.rules))
- **More gaps the authors list themselves:** about 3,000 duplicated lines (four copies of `ServiceTokenProvider`), about 26 application-layer classes with inline SQL despite the "no raw SQL" rule, billing classes without unit tests, backups never restored, and service-to-service trust based on a shared secret. ([ARCHITECTURE_ASSESSMENT.md](https://raw.githubusercontent.com/krizaka/orazaka/main/docs/ARCHITECTURE_ASSESSMENT.md))
- **Two build repos.** `orazaka-build` and `krizaka-build` both provide a parent POM, a BOM and a test kit. `krizaka-build` is tagged as TypeScript on GitHub. ([org repos API](https://api.github.com/orgs/krizaka/repos?per_page=100), [krizaka-build](https://github.com/krizaka/krizaka-build))

## 3. Code quality

I sampled one service in depth: `orazaka-job-service`.

- **`SecurityConfig.java` is fine.** It is a JWT resource server through a shared `SecurityBaseline`. Per its Javadoc, `/internal/v1/**` requires the `SERVICE` authority, and the old `anyRequest().permitAll()` is gone. ([source](https://raw.githubusercontent.com/krizaka/orazaka-job-service/main/src/main/java/com/krizaka/orazaka/jobservice/infrastructure/config/SecurityConfig.java))
  - Weakness: tokens are validated with a shared HS256 secret, so any service holding the secret can mint tokens.
- **`JobListener.java` is the weakest file I read.** It is 920 lines (874 lines of code) with 16 constructor parameters. It handles messaging, state transitions, billing, asset resolution, file I/O and failure classification in one class. ([source](https://github.com/krizaka/orazaka-job-service/blob/main/src/main/java/com/krizaka/orazaka/jobservice/infrastructure/adapter/amqp/JobListener.java)) I checked these points myself:
  - **Test logic in production.** `resolveTimeout` returns a 5-second timeout whenever the prompt starts with `"TIMEOUT"`, and there is no property guard. The companion `TimeoutSimulationHook` is correctly gated by `orazaka.jobs.enable-test-simulations`, but this branch is not. Any user can shorten their own job's timeout this way. ([hook source](https://raw.githubusercontent.com/krizaka/orazaka-job-service/main/src/main/java/com/krizaka/orazaka/jobservice/infrastructure/adapter/amqp/TimeoutSimulationHook.java))
  - **Timeouts don't stop the work.** On `TimeoutException`, the code marks the job FAILED but never cancels the future. The task can keep running and may later write `COMPLETED`. I did not check whether `RunningJobs` cancels it elsewhere.
  - **Errors are swallowed.** Input and output archiving catch `Exception` and only log it. Status strings are inconsistent: some are literals (`"COMPLETED"`), others constants.
  - **Comments.** They lean on ADR numbers, audit IDs and history ("used to carry…"), and some `@param` tags don't match the parameters.
- **The rules contradict themselves.** AGENTS.md bans `-SNAPSHOT` dependencies, yet the job service's own version is `1.0.0-SNAPSHOT` and the reactor builds components as source. ([job-service README](https://github.com/krizaka/orazaka-job-service))

## 4. Testing

- **Test files.** The job service has 47 test files for 52 main files: unit tests, Testcontainers integration tests (`*IT`), architecture tests and contract tests. Every production class I looked at has a matching test. ([git tree](https://api.github.com/repos/krizaka/orazaka-job-service/git/trees/main?recursive=1))
- **Testing policy is strict.** "No test, not done", fixes start with a failing test, and tests may not be disabled. AGENTS.md also describes duplication, archunit and OpenRewrite ratchets that fail the build on new violations. The job service has a `dup-ratchet.json` (10 duplicated lines per jscpd). ([AGENTS.md](https://raw.githubusercontent.com/krizaka/orazaka/main/AGENTS.md), [dup-ratchet.json](https://raw.githubusercontent.com/krizaka/orazaka-job-service/main/dup-ratchet.json))
- **Possible stale state.** Three of the five UUID files in `archunit_store` are 0 bytes. That may be normal for ArchUnit's FrozenArchRule, but it is worth checking that the stored violations aren't left over.
- **Not checked:** I did not read test bodies, so I can't judge assertion quality. The authors' own audit says three billing-decision classes are untested, so policy and practice don't fully match.

## 5. Engineering setup

**CI.** The `orazaka` `ci.yml` is solid. ([ci.yml](https://raw.githubusercontent.com/krizaka/orazaka/main/.github/workflows/ci.yml))
- Permissions are least-privilege, and every action is pinned to a full SHA.
- There is a nightly run, no `continue-on-error`, and a `red-main` job that opens an issue when `main` breaks.
- It does a full workspace build across all sibling repos.
- Weakness: the build clones siblings at `main` HEAD and regenerates the UI lockfile from their `main` branches. Workspace builds are not reproducible from a fixed state.
- Weakness: Python test dependencies are not pinned.

**Component CI** goes through a reusable workflow pinned by SHA. It inherits secrets and has `packages: write` and `id-token: write`. ([job-service ci.yml](https://raw.githubusercontent.com/krizaka/orazaka-job-service/main/.github/workflows/ci.yml)) Other setup:
- Every repo has OpenSSF Scorecard and dependabot auto-merge workflows.
- Copilot setup workflows exist.

**Release**
- The Java artifacts really are on Maven Central: 27 artifact folders under `com/krizaka`. ([repo1](https://repo1.maven.org/maven2/com/krizaka/))
- `krizaka-build` uses release-please, signed artifacts and manual publishing. It has one GitHub release, v0.2.0. ([releases](https://github.com/krizaka/krizaka-build/releases))
- The docs disagree about versions. The `orazaka` README says the building blocks are on Central at BOM 0.2.0. The `krizaka-build` README says the 0.2.0 users/billing artifacts are "not on Maven Central yet", and Central does only have `krizaka-users` 0.1.0. ([krizaka-users](https://repo1.maven.org/maven2/com/krizaka/krizaka-users/), [krizaka-bom](https://repo1.maven.org/maven2/com/krizaka/krizaka-bom/))
- `orazaka` itself has no releases or packages.

**Versioning of `@krizaka/ui`**
- It went from 1.0.0 to 3.54.0 in 16 days: 1.0.0 on 10-08, 2.0.0 on 10-10, 3.0.0 on 10-12, 3.54.0 on 10-24. That is about 83 versions in total. ([npm](https://registry.npmjs.org/@krizaka/ui))
- Either the major and minor numbers carry little meaning, or consumers are taking frequent breaking changes. Both are a problem for a public package.

**Governance and review**
- **No independent review.** Most PRs are opened by `krizaka-agents[bot]`. PR #404 was approved and merged the same day by `oussamaABID`, and the approval comment is signed "Claude (CTO)". ([PR #404](https://github.com/krizaka/orazaka/pull/404), [PR list](https://github.com/krizaka/orazaka/pulls?q=is%3Apr))
  - In practice the agent writes the code and the approval comes from an agent-authored comment on the only human account.
  - The 11 passing checks are real, but no second person reviews anything.
- **Issue backlog.** `krizaka-ui` has 128 open issues. All 25 on the first page were opened by `krizaka-agents` on a single day (2026-10-24), and almost none are labelled. ([issues](https://github.com/krizaka/krizaka-ui/issues))
  - The `.github` repo has 84 issues, `orazaka` 87, and `akinaza` 80+.
  - A backlog generated in bulk by agents is hard to triage and doesn't show what is actually prioritised.
- **Process churn.** The ADR folder has two ADR-078s and gaps (040, 081, 082, 088; 001–026 aren't listed). There is a PR titled "remove stale agent directive files" (#405) and a "[WIP] Copilot Request" draft (#384).
- **Documentation language.** It mixes English and French: `ARCHITECTURE_ASSESSMENT.md` is in French, most other docs are in English.

## 6. Product and legal risk a reviewer would flag

- **"Uncensored" models.** The `orazaka` README says it serves open-weight models "without a vendor refusal layer". Safety then depends on refusal rules declared per pack (`scopeGuard`) and on a short list of excluded categories. ([README](https://github.com/krizaka/orazaka)) For a public product, this needs a clear threat model and evidence that the enforcement is tested. I did not read `docs/CONTENT_POLICY.md`.
- **Compliance claims.** `akinaza` claims "Loi 25 by design" and GST/QST computed "tested on known invoices". `yomizaka` reviews leases against current law. These are self-assertions with no external review shown. On the positive side, Akinaza honestly says nothing is deployed and sign-up is closed. ([akinaza](https://github.com/krizaka/akinaza))

## 7. Strengths and weaknesses

**Strengths**
- The written governance contract is unusually detailed, and CI enforces parts of it (ArchUnit, ratchets, docs-freshness check). ([AGENTS.md](https://raw.githubusercontent.com/krizaka/orazaka/main/AGENTS.md))
- The CI hygiene is good: SHA pinning, least-privilege permissions, red-main alerting, nightly builds and Scorecard. ([ci.yml](https://raw.githubusercontent.com/krizaka/orazaka/main/.github/workflows/ci.yml))
- Decisions are well documented, and the authors write candid self-audits.
- There are real Maven Central and npm releases, with signing and release-please.
- Tests sit next to the code, and integration tests use Testcontainers.

**Weaknesses**
- The bus factor is one human. Review is effectively AI approving AI-authored code.
- The services sprawl relative to the team, and critical blockers remain open by the authors' own count (no migrations, trusted scopes).
- There are god classes, and test logic sits in production code (`JobListener`).
- The written rules and the code disagree (raw SQL, SNAPSHOT, hexagonal layout).
- Workspace builds are not reproducible because they track sibling `main` branches.
- Versioning is noisy (`@krizaka/ui` 3.54 in 16 days), and the docs disagree on which artifact versions exist.
- The agent-generated backlogs are large and unlabelled.
- Everything is about three weeks old with no outside users. It is too early to tell whether the process holds up under real load or contributors.

## 8. Overall assessment

The design and documentation are above average for a small organisation, and the CI is good. The implementation is ordinary-to-uneven and further behind than the documents suggest. The organisation's own production audit says not to launch, and I agree with it. The biggest structural risk is not technical: one person and a set of agents produce more code, ADRs and issues than anyone can independently review.

## 9. The three changes I would make first

1. **Close the two open critical blockers before any further features.** Enable Flyway (or another migration tool) on every service, and stop `/intent/route` from trusting scopes the caller declares. Then make one current audit document and delete or mark the other as superseded.
2. **Make review real and builds reproducible.** Require a non-agent approval, or at least an approval account separate from the agent's, on security, billing and migration changes. Make workspace CI build against pinned sibling SHAs or released versions instead of `main` HEAD.
3. **Clean up the hot paths and versioning.** Split `JobListener`, remove the unguarded `"TIMEOUT"` branch, cancel futures on timeout, and stop swallowing archive errors. Add unit tests for the billing-decision classes. Adopt a versioning policy for `@krizaka/ui` so that major versions mean breaking changes.
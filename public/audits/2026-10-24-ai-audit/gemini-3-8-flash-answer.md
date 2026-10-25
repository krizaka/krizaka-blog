<!-- The answer of Gemini 3.8 Flash in Antigravity to the same prompt as the Claude run (prompt.txt), 2026-10-24, as
     pasted by Oussama from Antigravity. Unedited, except one redaction: the password of a local-development connection
     string is replaced by [redacted]. -->

Technical Audit: krizaka (GitHub Organisation)
Target: https://github.com/krizaka
Date of Audit: October 24, 2026
Scope: 43 public repositories inspected across the Java, TypeScript, Next.js, and infrastructure stacks.

1. Overview & Repositories Examined
The organisation comprises 43 public repositories divided into four distinct tiers:

Org Governance, Standards & Build Tooling: .github, krizaka-build, krizaka-ts, krizaka-ui, krizaka-infra, krizaka-tauri-kit.
Shared Enterprise JVM Platform: krizaka-platform-kit, krizaka-users, krizaka-billing, krizaka-notifications, krizaka-accounts.
Flagship Product (Orazaka AI Engine): orazaka (umbrella workspace), orazaka-contracts, orazaka-edge, orazaka-conversation-service, orazaka-knowledge-service, orazaka-job-service, orazaka-automation-service, orazaka-ai-engine, orazaka-worker-media, orazaka-cli, orazaka-web-client, orazaka-mobile-client.
Consumer & Vertical Applications: orochia (video platform) & orochia-mobile, yasakia (conversational dating) & yasakia-mobile, kachizaka, akinaza, yomizaka, yororis, krizaka-blog, krizaka-com.
2. Unvarnished Technical Audit
2.1 Architecture & System Topology
Multi-Repo / Hybrid-Workspace Topology: The organisation avoids monolithic lock-in while maintaining cross-repository dependency builds. In orazaka.workspace.json, 19 platform components are ordered topologically by build stage. The orchestration script scripts/workspace.mjs clones, builds upstream dependencies from source, and runs CI in isolation.
JVM Backend Pattern: The Java backend follows strict Hexagonal / Clean Architecture. For example, orazaka-conversation-service divides code into domain/model, domain/port, application/service, and infrastructure/adapter. Communication between backend services relies on asynchronous event-driven transactional outboxes (krizaka-platform-kit outbox relay over AMQP / RabbitMQ).
TypeScript & Frontend Pattern: The UI layer is built around Next.js App Router (using Next.js 16 and React 19) and Expo / React Native for mobile clients. Reusable components live in krizaka-ui, structured as a pnpm / Turborepo workspace. Size limits are strictly declared per export in packages/ui/package.json.
2.2 Code Quality & Static Analysis
ArchUnit Enforcement: Java services enforce architectural rules in code. As seen in ConversationServiceStructureTest.java, packages must have zero circular dependencies, transactions can only start in application services, and environment variables are forbidden outside configuration classes.
Rule Ratcheting via ast-grep & JSCPD: To prevent quality regression without blocking legacy debt, the organisation uses custom ratchet tools: sg-ratchet.json tracks ast-grep violations (for example, in yasakia/sg-ratchet.json and orochia/sg-ratchet.json), and dup-ratchet.json tracks duplicate code via jscpd.
Static Analysis Gaps: Empirical SonarCloud data reveals a notable divergence between Java and TypeScript codebases:
krizaka-users: 0 bugs, 1 vulnerability (dynamic SQL formatting in native query), 3 code smells.
krizaka-billing: 1 bug, 4 vulnerabilities (dynamic SQL formatting in native query).
krizaka-ui: 172 bugs, 73 vulnerabilities, 107 code smells (partially driven by scanning unexcluded HTML/CSS email snapshot fixtures and Python scripts in tools/brand-films/dawn/childsafe.py).
orochia: 22 bugs, 59 vulnerabilities, 45 code smells, including a Blocker hardcoded database password in apps/web/console/lib/db.ts#L96.
2.3 Testing & Verification
Unit and Integration Tests: Backend microservices carry thorough test suites combining unit tests and Testcontainers integration tests (e.g. over 70 test classes in krizaka-users).
Hermetic Tests & Flakiness: The organisation mandates hermetic tests in its guidelines (docs/standards/coding-agents.md). However, flaky integration tests still slip through to GitHub Actions; for example, akinaza issue #341 documents shop-flow.integration.test.ts failing 5 tests simultaneously on CI before passing on an unedited re-run.
Code Coverage Metric Blind Spot: SonarCloud integration relies on automatic analysis rather than CI-generated coverage uploads. As a result, code coverage across the organisation (coverage, line_coverage) returns empty ([]) on SonarCloud badges despite local JaCoCo setup in krizaka-parent/pom.xml.
2.4 Documentation & Engineering Governance
Self-Critique & ADRs: The repository .github houses exceptional documentation. Specifically, docs/quality-controls.md provides an unvarnished audit comparing the intended state with the real state across all 43 repositories.
Agent Governance: The organisation operates with automated coding agents (krizaka-agents[bot] committing PRs reviewed by Claude and merged by human maintainer Oussama Abid). Operational constraints are formalized in docs/standards/coding-agents.md based on production post-mortems (e.g., banning unformatted code, prohibiting mock hallucinations, and requiring offline sandbox builds).
2.5 Engineering Setup & CI/CD
SHA-Pinned Workflows: Reusable GitHub Actions workflows in .github/.github/workflows/ (such as java-ci.yml) enforce strict security standards: all third-party actions (actions/checkout, actions/setup-java) are pinned to full commit SHAs, root permissions default to contents: read, and gate jobs enforce explicit verdicts.
Path-Based Change Filtering: Workflows execute changes.yml to prevent redundant builds on documentation updates, while asserting that any unskipped run finishes with a verified pass.
Release Automation: Artifact releases are managed via Google's release-please (e.g., release-please-config.json), signing JVM artifacts and pushing to Maven Central and GitHub Packages.
3. Strengths
High Architectural Rigor in JVM Core
The platform architecture cleanly decouples domain logic from framework baggage. The contracts in orazaka-contracts are 100% pure interfaces with zero runtime dependencies. Architectural boundaries are automatically verified on every build via ArchUnit (ConversationServiceStructureTest.java).
Defensive Workspace Build Tooling
The Node-based workspace driver orazaka/scripts/workspace.mjs enables deterministic multi-repo builds across macOS, Linux, and CI without brittle shell scripts. Reusable CI actions (java-ci.yml) check out upstream components and verify downstream consumers against local sources.
Institutional Self-Awareness & Documentation
The architecture documentation in .github/docs/ is exceptionally transparent. quality-controls.md explicitly catalogs gaps, copy-paste drift, and technical debt instead of hiding them.
Supply Chain & CI Hardening
CI workflows consistently employ full-SHA pinning, OpenSSF Scorecard scans (scorecard.yml), reproducible Maven build timestamps (project.build.outputTimestamp in krizaka-parent/pom.xml), and binary compatibility checks via japicmp-maven-plugin.
Granular Frontend Bundle Budgets
krizaka-ui/packages/ui/package.json sets byte-level gzip limits on every entry point (e.g. 1 kB for promise card, 7 kB for chat), preventing bloat in web and mobile consumers.
4. Weaknesses, Inconsistencies & Unfinished Areas
Blocker Credential Leak in Production Console Code
In orochia/apps/web/console/lib/db.ts#L96, a PostgreSQL connection string with hardcoded credentials (postgresql://orochia_user:[redacted]@localhost:5432/orochia_admin?sslmode=disable) is committed directly to the repository as a fallback. SonarCloud flags this as a Blocker vulnerability (secrets:S6698).
Dynamic SQL Formatting in Core Persistence Layers
Despite clean architecture, SQL string concatenation is used in multiple native queries instead of parameterised query criteria:
krizaka-users/AdminUserPersistenceProviderImpl.java#L168: em.createNativeQuery("SELECT ... FROM admin_audit" + where + " ...") (SonarCloud java:S2077).
krizaka-billing/CreditLedgerService.java#L811 and CreditAdjustmentService.java#L95 concatenate query fragments dynamically.
Infrastructure as Code Repository is Completely Empty
The dedicated infrastructure repository krizaka-infra claims in README.md to manage DigitalOcean App Platform, PostgreSQL, Porkbun DNS, and Bunny CDN via OpenTofu. In reality, the repository contains zero .tf files. The check script scripts/check.sh exits immediately with "no OpenTofu code yet". The organisation's cloud deployment is not currently managed as code.
Copy-Pasted Scripts and Configuration Drift Across 12 Repositories
As documented in .github/docs/quality-controls.md#15, linting and tooling scripts are manually duplicated:
scripts/check-seo-family.mjs has two diverging copies across 12 repositories (255-line version with dev-redirect audit vs. 235-line version with sitemap rules).
sgconfig.yml exists as 9 manual copies.
Ast-grep scan scopes are configured manually per repository, allowing files to slip through unnoticed (e.g. in orochia, apps/web/lib is excluded from ast-grep checks because the glob only targets packages/*/src and root src/**).
The "UTC Day" Date Slice Bug Across 8 Repositories
Multiple production web applications determine today's date using new Date().toISOString().slice(0, 10) (such as in yomizaka, orochia, and akinaza). As acknowledged in quality-controls.md §3, this causes silent business logic errors every evening in timezones west of UTC (e.g. Montréal, UTC-4/UTC-5) by switching days prematurely.
Command Injection Risks in Internal Media Tooling
In krizaka-ui/tools/brand-films/dawn/childsafe.py#L42, subprocess calls take unvalidated command-line parameters directly, producing SonarCloud vulnerability flags pythonsecurity:S8705 (Command Argument Injection) and pythonsecurity:S8707 (Path Traversal).
Disparity in Mobile Code Quality
While web frontends use strict rules, mobile applications (orochia-mobile, yasakia-mobile, yomizaka mobile) lint with bare typescript-eslint, bypassing @krizaka/config and ast-grep quality ratchets entirely.
Automated Quality Gate Misleading Status
SonarCloud quality gates display "Passed / OK" on repositories with dozens or hundreds of open issues (e.g. krizaka-ui with 172 bugs and 73 vulnerabilities) because the quality gate is configured to evaluate only New Code conditions or ratcheted issues, creating a false visual impression of a clean codebase.
5. Overall Assessment
Technologies Krizaka Inc.'s engineering ecosystem shows remarkable architectural sophistication in its core backend, governance policies, and CI mechanics. The system avoids common startup pitfalls by enforcing clean domain boundaries, immutable message envelopes, ArchUnit structural checks, reproducible builds, and well-designed autonomous agent workflows.

However, the organization is visibly stretched across 43 repositories. The core platform libraries (krizaka-platform-kit, krizaka-users, orazaka-conversation-service) receive top-tier engineering attention, while downstream products and tooling (orochia, krizaka-infra, tools/brand-films) contain critical gaps: hardcoded database credentials, dynamic SQL concatenation, unwritten infrastructure configurations, and copy-pasted audit scripts.

6. The Three Changes to Make First
Purge the Hardcoded Database Credential in Orochia
Target: orochia/apps/web/console/lib/db.ts#L96
Action: Remove "postgresql://orochia_user:[redacted]@localhost:5432/orochia_admin?sslmode=disable". Fail fast if DATABASE_CONSOLE_URL is unset, or rely strictly on local .env resolution. Rotate any staging or production database instances that may share this password.
Eliminate String-Concatenated Native Queries in Backend Persistence
Target: krizaka-users/AdminUserPersistenceProviderImpl.java#L168 and krizaka-billing/CreditLedgerService.java#L811
Action: Refactor dynamic query assembly to use JPA CriteriaBuilder or named conditional parameter blocks instead of raw string concatenation ("WHERE ... " + where), resolving java:S2077 vulnerabilities across both services.
Consolidate Copy-Pasted Tooling Scripts into @krizaka/config
Target: .github/docs/adr/ADR-007-shared-rules.md and .github/docs/quality-controls.md
Action: Complete the migration outlined in ADR-007: package sgconfig.yml, ast-grep rules, scripts/sg-ratchet.mjs, and check-seo-family.mjs into @krizaka/config. Replace manual file copies across all 12 repositories with a single inherited CLI invocation (krizaka-rules check), fixing diverging rule scopes and the cross-repository UTC day bug.

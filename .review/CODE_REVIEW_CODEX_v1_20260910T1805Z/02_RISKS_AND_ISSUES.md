# Risks and Issues

[<- Back to Index](00_CODE_REVIEW_CODEX_v1_20260910T1805Z.md) | [Next: Project Review ->](03_PROJECT_REVIEWS/PROJECT_001_SALEOR_GRAPHQL_AUTOMATION.md)

**Reviewer:** AI assistant (Codex GPT-5)

## R-01 - HIGH - Smoke-safety guarantee can miss inherited mutation tags

**Risk description:** The guard clears pending tags when it reaches `Feature:` and records only tags immediately preceding each scenario. Cucumber inherits feature tags, so a feature tagged `@mutating` with a scenario tagged `@smoke` is unsafe, but the guard reports only `@smoke`. It also does not inspect GraphQL operations despite documentation claiming it prevents side-effecting mutations.

**Evidence:**

- [check-smoke-safety.ts](../../scripts/check-smoke-safety.ts) (lines 31-53) clears feature tags rather than inheriting them.
- [checkout_stateful.feature](../../features/checkout_stateful.feature) (lines 1-8) uses feature-level `@mutating`, proving inherited tags are part of this repository's conventions.
- [smoke-safety.spec.ts](../../tests/unit/smoke-safety.spec.ts) (lines 6-48) covers only scenario-local tag combinations.
- [README.md](../../README.md) (line 18) claims a guarantee of zero side-effect mutations.
- A read-only probe using `parseFeatureTags` returned `[{'tags':['@smoke']}]` for a feature tagged `@mutating` and a scenario tagged `@smoke`.

**Impact:** A future scenario can enter the smoke lane while inheriting `@mutating`, making a supposedly demo-safe run modify data. The current green guard is therefore weaker than the public safety claim.

**Refactor recommendation and strategy:** Parse Gherkin with the official Cucumber parser or compiled pickles so feature, rule, scenario, and examples tags are resolved exactly as Cucumber resolves them. Add regression tests for inherited tags and scenario outlines. Add a second control that maps smoke steps to known read-only GraphQL documents or rejects operation definitions beginning with `mutation` in the smoke execution graph.

## R-02 - HIGH - Schema drift is neither CI-gated nor usable as currently implemented

**Risk description:** The standard contract test compares the baseline schema with itself and simulated toy schemas. The script capable of fetching a live schema is not called by any npm gate; if an explicit endpoint is unreachable it silently falls back to self-comparison. When run against the pinned local Saleor image, it exited 1 with 184 non-breaking and 5 directive-level breaking differences.

**Evidence:**

- [schema-contract.spec.ts](../../tests/contract/schema-contract.spec.ts) (lines 8-15) performs baseline-versus-baseline comparison.
- [package.json](../../package.json) (lines 14 and 25) invokes the tests but never invokes `scripts/check-schema-contract.ts`.
- [check-schema-contract.ts](../../scripts/check-schema-contract.ts) (lines 72-89) fetches only when an environment variable exists and falls back when the endpoint cannot be read.
- [README.md](../../README.md) (line 16) says live introspection prevents breaking changes in CI.
- Direct execution against `http://localhost:8000/graphql/` loaded 1,482 baseline types, found 184 non-breaking changes and 5 breaking built-in-directive differences, and exited 1 in 22.120 seconds.

**Impact:** Default CI cannot detect upstream Saleor drift, while wiring the current live command into CI would fail against the repository's pinned SUT. The flagship contract-testing claim is not currently reproducible.

**Refactor recommendation and strategy:** Treat this as the first slice of SGR-P3-02. Regenerate or normalise the baseline using the exact pinned image and introspection path, decide how built-in directive differences are handled, and add tests for the normalisation. Create a distinct `check:schema:live` command that fails closed when its explicit endpoint is unavailable. Run it in a scheduled or Docker-backed workflow and keep deterministic operation-document validation in the ordinary PR gate.

## R-03 - MEDIUM - Valkey is not pinned to an immutable digest

**Risk description:** Saleor and PostgreSQL use digests, but Valkey uses the mutable tag `8.1-alpine` even though the README, backlog, design, and ADR-004 all claim complete digest pinning.

**Evidence:**

- [docker-compose.yml](../../docker/docker-compose.yml) (line 43) specifies `valkey/valkey:8.1-alpine` without a digest.
- [README.md](../../README.md) (line 19) describes all three images as digest-pinned.
- [decision-register.md](../../docs/decision-register.md) (lines 31-35) records exact digest pinning as an accepted decision.

**Impact:** A fresh pull can select different cache bytes without a repository change, weakening repeatability and supply-chain provenance.

**Refactor recommendation and strategy:** Resolve and record the approved Valkey digest, verify the full compose stack, and document an intentional dependency-refresh procedure instead of relying on a mutable tag.

## R-04 - MEDIUM - Local services are exposed on all host interfaces with fixture credentials

**Risk description:** API, PostgreSQL, and Valkey publish host ports without a loopback address. PostgreSQL uses `saleor/saleor`, the read-only role uses `saleor_read`, and Saleor uses a static development secret.

**Evidence:**

- [docker-compose.yml](../../docker/docker-compose.yml) (lines 4-6, 29-45) publishes ports 8000, 5432, and 6379 on all interfaces.
- [backend.env](../../docker/backend.env) (lines 1-4) contains database credentials and a static `SECRET_KEY`.
- [replica_user.sql](../../docker/replica_user.sql) (lines 1-11) creates a login with a fixed password.

**Impact:** On a permissive host firewall or shared network, the development database, cache, and API can be reachable beyond the intended workstation. The values are documented fixtures rather than leaked production secrets, but the exposure broadens their risk.

**Refactor recommendation and strategy:** Bind the API to `127.0.0.1:8000` and either bind database/cache ports to loopback or remove their host mappings. Label all credentials explicitly as local-only fixtures and prefer Compose-injected values for credentials that do not need to be committed.

## R-05 - MEDIUM - Design claims exceed delivered backlog scope and measured performance

**Risk description:** The design executive summary says the framework demonstrates multi-factor JWT authentication, multi-line checkout, and staff fulfilment. The current scenarios implement password JWT authentication and a single checkout line, while staff fulfilment remains backlog. NFR-1 latency alerts and the 30-second cold-boot requirement are also stated as requirements without matching acceptance evidence.

**Evidence:**

- [design-document.md](../../design-document.md) (line 17) states the expanded capability claim.
- [checkout_stateful.feature](../../features/checkout_stateful.feature) (lines 8-17) exercises one item and no fulfilment transition.
- [backlog.md](../../docs/backlog.md) (lines 24-27) keeps staff fulfilment, telemetry, living documentation, and drift monitoring open.
- [design-document.md](../../design-document.md) (lines 40-45) requires latency alerts and a 30-second cold boot.
- [live-sut-validation.md](../../docs/live-sut-validation.md) (line 8) documents an approximately 21-minute first clean bootstrap.

**Impact:** Hiring managers and maintainers can interpret planned features and an ambiguous boot target as verified outputs, reducing portfolio credibility.

**Refactor recommendation and strategy:** Separate "implemented" from "target roadmap" language. Define warm service readiness separately from clean migration/seed bootstrap, attach measured thresholds to each, and keep SGR-P2-02/P2-03/P3 items explicitly future-facing until their gates pass.

## R-06 - MEDIUM - HTTP calls have no abort timeout or uniform failure promotion

**Risk description:** `CallGraphQL` records latency but does not bound `fetch`. Checkout Tasks promote errors through `requireOperationPayload`, while earlier catalogue and authentication Tasks rely on later assertions and can leave stale authentication state after a failed re-authentication attempt.

**Evidence:**

- [CallGraphQL.ts](../../src/screenplay/abilities/CallGraphQL.ts) (lines 91-135) performs unbounded fetch and converts all transport failures into response objects.
- [Authenticate.ts](../../src/screenplay/tasks/Authenticate.ts) (lines 37-48) sets a new token on success but does not clear an existing token before an attempt.
- [QueryShopInfo.ts](../../src/screenplay/tasks/QueryShopInfo.ts) (lines 24-27) ignores HTTP and GraphQL error state.
- [backlog.md](../../docs/backlog.md) (line 25) correctly leaves latency telemetry and typed error categorisation in SGR-P2-03.

**Impact:** A stalled endpoint can consume the Cucumber timeout without aborting the request, and failures in older journeys can surface as indirect `undefined` assertions rather than actionable transport or GraphQL diagnostics.

**Refactor recommendation and strategy:** Implement SGR-P2-03 with `AbortSignal.timeout` or an explicit controller, a typed result/error model shared by every Task, threshold assertions, and tests for timeout, HTTP, invalid JSON, GraphQL, and domain errors. Clear auth state before credential rotation.

## R-07 - LOW - Declared Serenity integrations are unused and glue remains weakly typed

**Risk description:** `@serenity-js/assertions`, `@serenity-js/console-reporter`, and `@serenity-js/cucumber` are declared but not imported. Step definitions and Tasks use repeated `any` casts even with strict TypeScript enabled.

**Evidence:**

- [package.json](../../package.json) (lines 32-39) declares the packages.
- Repository-wide import search found no tracked use outside `package.json`.
- [auth_steps.ts](../../features/step_definitions/auth_steps.ts) (lines 10-17) stores World data through `this as any`.
- [Authenticate.ts](../../src/screenplay/tasks/Authenticate.ts) (line 37) accepts `actor: any`.

**Impact:** The dependency surface and portfolio claims imply richer Serenity integration than the current runner emits, while `any` weakens compile-time assurance at key state boundaries.

**Refactor recommendation and strategy:** During SGR-P3-01, either wire the Serenity/Cucumber adapter, assertions, and reporter into generated living documentation or remove unused packages. Introduce a typed Cucumber World and `Actor`/`PerformsActivities` signatures incrementally.

## R-08 - LOW - GitHub action runtime is deprecated

**Risk description:** The exact-merge CI run passed but warned that `actions/checkout@v4` and `actions/setup-node@v4` target deprecated Node.js 20 action runtimes and were being forced to Node.js 24.

**Evidence:**

- [ci.yml](../../.github/workflows/ci.yml) (lines 14-20) uses both v4 actions.
- GitHub Actions run `34511509331`, job `102986517457`, completed successfully in 14 seconds with the runtime warning.

**Impact:** The workflow remains green today but relies on compatibility behaviour that GitHub can remove.

**Refactor recommendation and strategy:** Upgrade to action majors that declare the supported Node.js 24 runtime, review runner prerequisites, and retain the existing `npm ci` plus `npm run verify` behaviour.

---

[<- Previous: Executive Summary](01_EXECUTIVE_SUMMARY.md) | [Back to Index](00_CODE_REVIEW_CODEX_v1_20260910T1805Z.md) | [Next: Project Review ->](03_PROJECT_REVIEWS/PROJECT_001_SALEOR_GRAPHQL_AUTOMATION.md)

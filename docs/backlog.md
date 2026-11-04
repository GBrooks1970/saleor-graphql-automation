# Canonical Project Backlog: saleor-graphql-automation

**Current Version:** v11
**Last Updated:** 2026-11-03
**Project:** Fourteenth Portfolio Project (P-12) — Saleor GraphQL Automation  
**Repository:** `GBrooks1970/saleor-graphql-automation`  

---

## 1. Backlog Summary Table

| ID | Title | Phase | Type | Status | Priority | Score |
|:---|:---|:---:|:---:|:---:|:---:|:---:|
| **SGR-P0-01** | Docker SUT Feasibility Probe (Saleor 3.23) | 0 | SPIKE | Done | HIGH | 24 |
| **SGR-P1-01** | Repository Scaffold, Governance & Registry | 1 | ENABLER | Done | HIGH | 22 |
| **SGR-P1-02** | Pinned SUT Docker Compose & HTTP Poller | 1 | INFRA | Done | HIGH | 21 |
| **SGR-P1-03** | Screenplay Core: `CallGraphQL` Ability & Actors | 1 | CORE | Done | HIGH | 21 |
| **SGR-P1-04** | FR-1: Catalogue Read BDD Journey | 1 | FEATURE | Done | HIGH | 20 |
| **SGR-P1-05** | FR-3: Authentication Lifecycle BDD Journey | 1 | FEATURE | Done | HIGH | 20 |
| **SGR-P1-06** | FR-4: Schema Contract Snapshot & Diff Gate | 1 | CONTRACT | Done | HIGH | 22 |
| **SGR-P1-07** | NFR-6: Demo-Safe Read-Only Smoke Profile | 1 | QUALITY | Done | MEDIUM | 18 |
| **SGR-P1-08** | GitHub Actions CI & `npm run verify` Gate | 1 | CI/CD | Done | HIGH | 20 |
| **SGR-P2-01** | FR-2: Stateful Checkout BDD Journey | 2 | FEATURE | Done | HIGH | 19 |
| **SGR-P2-02** | FR-5: Staff Order Fulfilment Journey | 2 | FEATURE | Done | MEDIUM | 16 |
| **SGR-P2-03** | NFR-1 & NFR-2: Latency Telemetry & Error Model | 2 | QUALITY | Done | MEDIUM | 15 |
| **SGR-P3-01** | Living Documentation & GitHub Pages | 3 | SHOWCASE | Done | LOW | 12 |
| **SGR-P3-02** | Upstream Schema Drift & Alerting Monitor | 3 | RELIABILITY | Done | LOW | 11 |

---

## 2. Item Details

### SGR-P1-01: Repository Scaffold, Governance & Registry
- **Goal:** Initialize git repository, configure `.gitignore`, `package.json`, `tsconfig.json`, register in portfolio root, author initial ADRs and project contract.
- **Verification:** Repository initialized, linked to GitHub, all governance files present.

### SGR-P1-02: Pinned SUT Docker Compose & HTTP Poller
- **Goal:** Provide reproducible local and CI container orchestration pinned to immutable digests, storing volumes on `E:\_DockerData`. Include TypeScript HTTP health check poller.
- **Verification:** SUT services boot cleanly and poller returns HTTP 200 on `{ shop { name } }`.

### SGR-P1-03: Screenplay Core: `CallGraphQL` Ability & Actors
- **Goal:** Implement Serenity/JS `CallGraphQL` ability supporting typed queries/mutations, header injection, JWT bearer auth, error extraction, and actor models (`Guest`, `Customer`, `Admin`).
- **Verification:** Unit tests in `tests/unit/call-graphql.spec.ts` pass 100%.

### SGR-P1-04: FR-1: Catalogue Read BDD Journey
- **Goal:** Implement Cucumber Gherkin scenarios for anonymous product browsing, channel filtering, and cursor pagination.
- **Verification:** `npm run test:api` executes catalogue read scenarios green.

### SGR-P1-05: FR-3: Authentication Lifecycle BDD Journey
- **Goal:** Implement Cucumber Gherkin scenarios for `tokenCreate`, authenticated profile queries, invalid credential rejection, and token refresh.
- **Verification:** `npm run test:api` executes authentication scenarios green.

### SGR-P1-06: FR-4: Schema Contract Snapshot & Diff Gate
- **Goal:** Author introspection snapshot `schema/saleor-3.23.graphql` and bidirectional breaking-change diff test suite with `@graphql-inspector/core`.
- **Verification:** `npm run test:contract` passes positive snapshot comparison and catches injected breaking changes.

### SGR-P1-07: NFR-6: Demo-Safe Read-Only Smoke Profile
- **Goal:** Tag read-only scenarios with `@smoke` and implement safety validator script/unit test ensuring no mutating operation runs under the smoke profile.
- **Verification:** `npm run test:smoke` and `npm run check:smoke-safety` pass.

### SGR-P1-08: GitHub Actions CI & `npm run verify` Gate
- **Goal:** Author `.github/workflows/ci.yml` and wire `npm run verify` covering typecheck, unit, contract, smoke, and API tests.
- **Verification:** Local `npm run verify` exits code 0; GitHub Actions workflow passes on push to `main`.

### SGR-P2-01: FR-2 Stateful Checkout BDD Journey
- **Goal:** Exercise the Saleor 3.23 checkout lifecycle from variant selection through shipping and billing addresses, delivery selection, modern `transactionCreate`, and `checkoutComplete` producing an order.
- **Acceptance criteria:**
  1. The scenario is tagged `@api @mutating` and remains excluded from the `@smoke and not @mutating` lane.
  2. Checkout state is isolated per scenario with unique email and PSP references and shared safely between the Customer and Admin actors.
  3. Every GraphQL document validates offline against `schema/saleor-3.23.graphql`.
  4. The deterministic embedded SUT covers the successful lifecycle and the mandatory billing-address failure.
  5. `npm run verify` passes in full.
  6. A separate run against an explicitly configured, pinned Saleor Docker SUT produces a fully charged order; explicit live endpoints must fail closed rather than silently use the mock.
- **Evidence boundary:** `npm run verify` is the deterministic CI gate. Live acceptance additionally follows `docs/live-sut-validation.md` and records the returned order number and statuses.
- **Completion evidence:** `docs/implementation-logs/2026-09-08_sgr-p2-01-stateful-checkout.md` records the implementation and deterministic evidence; `docs/implementation-logs/2026-09-10_sgr-p2-01-live-acceptance-closure.md` records the pinned live-SUT acceptance and closure evidence.

### SGR-P2-02: FR-5 Staff Order Fulfilment Journey
- **Goal:** Implement the staff order fulfilment journey (`features/order_fulfilment.feature`) where an authenticated staff actor locates a confirmed order, verifies unfulfilled lines, allocates warehouse stock, and issues `orderFulfill` transitioning status to `FULFILLED`.
- **Acceptance criteria:**
  1. The scenario is tagged `@api @mutating` and remains excluded from the smoke lane.
  2. A staff actor locates an isolated confirmed order and inspects line and stock details.
  3. The staff actor allocates stock and executes `orderFulfill` mutation, resulting in status `FULFILLED` and verified fulfillment records.
  4. Screenplay Questions and Tasks are strongly typed (`OrderDetail`, `OrderLineDetail`, `FulfillmentRecord`), eliminating `any`.
  5. Deterministic embedded SUT supports order lookup and fulfillment mutation with warehouse allocation checks.
  6. Unit tests (`tests/unit/mock-fulfilment.spec.ts`) validate mock behavior and permissions.
  7. Deterministic verification gate (`npm run verify`) passes 100%.
- **Completion evidence:** `docs/implementation-logs/2026-10-07_sgr-p2-02-staff-order-fulfilment.md` records implementation and test evidence.

### SGR-P2-03: NFR-1 & NFR-2 Latency Telemetry & Error Model
- **Goal:** Add bounded GraphQL requests, latency enforcement, and typed error models across Screenplay Tasks.
- **Acceptance criteria:**
  1. Tests cover timeout, HTTP, invalid JSON, GraphQL, and domain failures.
  2. Authentication state is cleared before credential rotation.
  3. Latency thresholds are configurable.
  4. Deterministic verification gate (`npm run verify`) passes in full.
- **Completion evidence:** Delivered in PR #10 (`d3ce465`).


### SGR-P3-01: Living Documentation & GitHub Pages
- **Goal:** Generate navigable Serenity/JS documentation from actual scenario execution and publish verified main results through GitHub Pages.
- **Acceptance criteria:**
  1. Separate smoke and API reports expose feature narratives, scenario outcomes and nested Screenplay activities without double-counting overlapping scenarios.
  2. The verification gate rejects missing, partial, failed or skipped reports and builds a landing page only after complete passing results.
  3. Failed scenario execution remains non-zero and preserves available diagnostic reports.
  4. PR and main CI retain reports; only successful main pushes can deploy, with Pages permissions confined to the deployment job.
  5. Pages is configured for GitHub Actions; exact-main CI and the returned hosted URL are verified after merge.
- **Completion evidence:** PR #19 merged as `7524176cc19921c1bbc5f9ca8959aa3aca9c2ffd`. PR CI `38906564811` and exact-main CI `38906680249` passed, including report artifacts and Pages deployment. Hosted browser checks verified the exact merge revision, API 9/9 and smoke 3/3 at https://gbrooks1970.github.io/saleor-graphql-automation/.
- **Plan and operation:** `docs/implementation-plans/2026-10-16_sgr-p3-01-living-documentation.md` and `docs/reporting.md`.

### SGR-P3-02: Upstream Schema Drift & Alerting Monitor
- **Goal:** Schedule upstream introspection and classify schema changes using the existing fail-closed schema contract gate.
- **Status:** Done. PR #20 merged as `c799d0710e7e70fcceb12492ce49e9020126b298`; exact-main CI `39078903688` and manual monitor run `39078905171` passed. The retained report identifies that revision and the official 3.23 SDL, with zero domain breaks and 117 other changes.
- **Update (2026-10-18):** First scheduled execution verified: [run 39107672846](https://github.com/GBrooks1970/saleor-graphql-automation/actions/runs/39107672846), event `schedule`, succeeded on `4660ce06dc2c0a234fc3f62678c1d9ff0b653665`. Created at 07:26:35 UTC (08:26:35 BST), following the daily 07:17 UTC slot. Retained JSON/Markdown reports match the run revision: official 3.23 SDL, compatible, zero domain breaks, zero directive-spec differences and 117 other changes. Notification settings were subsequently verified in the authenticated browser: GitHub and email enabled for failed workflows only, with a default notification email configured and repository subscription set to Participating. Actual failure-alert delivery remains untested; the CLI scope limitation did not prevent browser verification. The verification watch is paused after completion.
- **Acceptance criteria:**
  1. Compare official upstream SDL (default) or explicit live introspection against the committed baseline using ADR-010 without offline fallback.
  2. Report timestamp, source type/URL, revision, baseline and upstream SDL hashes, and all classified changes; preserve reports on failure.
  3. Fail on domain breaks, missing configuration, unreachable endpoints or invalid introspection; keep other differences visible.
  4. Schedule daily/manual execution with read-only repository permissions, bounded requests and 30-day artifacts.
  5. Verify the selected source in a real Actions run after publication; review baseline changes through a separate PR.
- **Plan and operation:** `docs/implementation-plans/2026-10-16_sgr-p3-02-schema-monitor.md` and `docs/schema-monitoring.md`.

## 3. Review remediation delivery

- **TRIAGE-06:** Node 24-compatible CI actions delivered through PR #17, merge `3ae08cc71af195571dde481f3a1c562b939700eb`.
- **TRIAGE-07:** Typed Cucumber World and Screenplay boundaries delivered through PR #18, merge `4ca143309ffc74faf957d913434f91a680a94fd1`. Exact-main CI run `38898150194` succeeded on 2026-10-16.
- Portfolio worklist and historical handover reconciliation is separate from this nested repository; their older open statuses are superseded by this merge evidence.

## 4. Maintenance follow-up (2026-10-18)

This section retains the 18 October observations. The dated reconciliation in section 5 supersedes its dependency-risk and watch state; the delivery evidence remains historical evidence.

- Transitive dependency patch: PR #21 updates `brace-expansion` 5.0.9 to 5.0.12. Only the corresponding lockfile entry changes; the full local verification gate passed. Publication and CI evidence are available on the PR.
- Historical audit (18 October): nine high affected packages inherited the then-active `braces` 3.0.3 advisory GHSA-vfj7-8cjw-p6xm. SGR-MAINT-01 below closes that specific advisory-based risk following its withdrawal; no framework downgrade was made.
- Scheduled execution and report retention are verified by run `39107672846`; that observation follow-up is complete. Notification-settings verification is also complete: GitHub and email enabled for failed workflows only, default notification email configured, repository subscription Participating. Actual failure-alert delivery remains untested; neither settings nor a successful run proves delivery.

- **Historical update (2026-10-18):** The owner approved a weekly compatible-fix watch for `braces`. The 1 November automation inventory no longer contains that watch; do not recreate it for the withdrawn advisory. Actual failure-alert delivery remains untested.

## 5. Current maintenance status (2026-11-03)

| ID | Item | Status | Priority |
|---|---|---|---|
| SGR-MAINT-01 | Reconcile the withdrawn braces advisory and obsolete watch claims | Done 2026-11-01; merged in PR #24 (`2449d7d`, 2026-11-02); exact-main CI passed | LOW |
| SGR-MAINT-02 | Review compatible remediation for the current dependency audit findings | Stage A HIGH remediation delivered 2026-11-03 (`0 HIGH`, `3 MODERATE` remaining); Stage B Cucumber 13 MODERATE option open for separate decision | MEDIUM |

### SGR-MAINT-01: withdrawn braces advisory records

GitHub [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) was withdrawn at **2026-10-23T12:53:02Z** because the reported vulnerability is not practically exploitable. The official advisory was rechecked on 1 November. A fresh isolated lockfile-only audit reports no `braces` finding. This closes the specific advisory-based risk without claiming that all dependencies are healthy or that the package code changed.

The local app automation inventory on 1 November contains no braces-fix watch. Its separate one-off `Verify Saleor scheduled schema monitor` automation is PAUSED; the daily GitHub schema monitor is independent. No automation or notification setting was changed in this reconciliation.

Published and merged in [PR #24](https://github.com/GBrooks1970/saleor-graphql-automation/pull/24) (`2449d7df6420d2561444fcab3dcb1e2b3137a452`, merged `2026-11-02T18:27:41Z`). Plan: [withdrawn advisory reconciliation](implementation-plans/2026-11-01_withdrawn-braces-records.md). Evidence and verification: [implementation log](implementation-logs/2026-11-01_withdrawn-braces-records.md).

### SGR-MAINT-02: current dependency compatibility review and Stage A HIGH remediation

**Status: Stage A delivered (HIGH findings cleared); residual MODERATE scope open. Priority: MEDIUM.** On 1 November (reconfirmed on 3 November before Stage A), `npm audit --package-lock-only --ignore-scripts --json` exited 1 with **five affected packages: two high and three moderate; zero low/critical**:

- **HIGH (resolved in Stage A, 2026-11-03):** `zod` ([GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), affecting `<4.6.6`, patched in `4.6.6`) and its dependent `@serenity-js/html-reporter@3.46.0` (which pins `zod: "4.4.3"`, while upstream `@serenity-js/html-reporter@3.49.0` still pins `4.6.5`). Stage A adds the parent-scoped npm override `"@serenity-js/html-reporter": { "zod": "4.6.6" }` in `package.json`, updating only `node_modules/zod` (`4.4.3` → `4.6.6`) in `package-lock.json` while keeping all six `@serenity-js/*` packages at `3.46.0` and `@cucumber/cucumber` at `12.9.0`. Post-change `npm audit --audit-level=high --package-lock-only --ignore-scripts` exits **0** (`0 HIGH`, `0 CRITICAL`, `0 LOW`, `3 MODERATE`), and `npm run verify` passes in **39.04 s** (typecheck clean, `56/56` unit tests across 14 suites, `check:smoke-safety` 0 violations across 9 scenarios, `35/35` contract tests across 6 suites, `3/3` smoke scenarios, `9/9` API scenarios, and `check:reports` `Complete reports: smoke=3, api=9; landing page generated.`). **Override removal trigger:** remove `overrides["@serenity-js/html-reporter"].zod` once `@serenity-js/html-reporter` is upgraded to a release that declares `zod >= 4.6.6` natively.
- **MODERATE (residual open scope — Stage B decision pending):** `glob` ([GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4), fixed in `14.0.2`), `minimatch` ([GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), fixed in `11.0.1`), and their dependent `@cucumber/cucumber@12.9.0`. Resolving this chain cleanly requires a separate Stage B migration to `@cucumber/cucumber@13.3.0` (or explicit owner risk acceptance), which remains outside Stage A.

Plan: [dependency compatibility remediation](implementation-plans/2026-11-03_sgr-maint-02-dependency-compatibility.md). Evidence and verification: [implementation log](implementation-logs/2026-11-03_sgr-maint-02-dependency-remediation.md).

### Open backlog summary

| Priority | Open items |
|---|---:|
| HIGH | 0 |
| MEDIUM | 1 (SGR-MAINT-02 — residual MODERATE Cucumber/glob/minimatch chain; Stage A HIGH chain delivered) |
| LOW | 0 |
| **Total outstanding** | **1** |

All 14 roadmap items and seven TRIAGE items remain delivered. Actual failure-alert delivery is an explicit evidence limitation, not an authorised implementation item; settings inspection and successful scheduled runs do not establish receipt.

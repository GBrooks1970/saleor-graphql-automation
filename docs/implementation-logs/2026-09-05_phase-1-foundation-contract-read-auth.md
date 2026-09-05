# Phase 1 Foundation, Contract Testing & Core Read/Auth Journeys — 2026-09-05

## Session Summary

The primary objective of this session was to scaffold and deliver Phase 1 of the fourteenth portfolio project (`P-12` Saleor GraphQL Automation), translating the approved architectural design and Phase 0 Docker probe findings into a fully functioning, CI-gated repository. We established submodule safety, authored complete project governance documentation, provisioned pinned Docker SUT definitions, built the Serenity/JS Screenplay engine with a typed `CallGraphQL` Ability, and implemented contract testing with `@graphql-inspector/core`. The resulting repository is 100% green across all verification gates locally and verified with passing GitHub Actions CI workflows on `main`.

---

## Objectives

1. ✅ SGR-P1-01 — Submodule safety, repository scaffold, governance docs, and portfolio registration
2. ✅ SGR-P1-02 — SUT Docker Compose environment with pinned digests & HTTP readiness probe (R1-01)
3. ✅ SGR-P1-03 — Screenplay `CallGraphQL` Ability, Actors, Tasks, and Questions
4. ✅ SGR-P1-04 — FR-1: Catalogue Read BDD Journey (`features/catalogue_read.feature`)
5. ✅ SGR-P1-05 — FR-3: Authentication Lifecycle BDD Journey (`features/authentication.feature`)
6. ✅ SGR-P1-06 — FR-4: Schema Contract Snapshot & Inspector Diff Gate (`tests/contract/schema-contract.spec.ts`)
7. ✅ SGR-P1-07 — NFR-6: Demo-Safe Read-Only Smoke Profile & Safety Validator
8. ✅ SGR-P1-08 — CI Workflow (`.github/workflows/ci.yml`) & Local Verification Gate (`npm run verify`)

---

## Test Results

| Stack | Suite | Before | After | Status |
|---|---|---|---|---|
| Node 24 / TS | TypeScript Typecheck (`npm run typecheck`) | 0/0 | 0 errors | ✅ PASS |
| Node 24 / TS | Unit Tests (`npm run test:unit`) | 0/0 | 8/8 pass | ✅ PASS |
| Node 24 / TS | Smoke Safety Policy (`npm run check:smoke-safety`) | 0/0 | 7/7 scenarios verified | ✅ PASS |
| Node 24 / TS | Schema Contract & Diff (`npm run test:contract`) | 0/0 | 5/5 pass | ✅ PASS |
| Node 24 / TS | Read-Only Smoke Journey (`npm run test:smoke`) | 0/0 | 3/3 scenarios (11 steps) | ✅ PASS |
| Node 24 / TS | BDD API Suite (`npm run test:api`) | 0/0 | 7/7 scenarios (25 steps) | ✅ PASS |
| GitHub Actions | CI Workflow (`ubuntu-latest` / Node 22) | 0/0 | 2/2 runs passed | ✅ PASS |

---

## Changes Implemented

### 1. Root Integration, Submodule Safety & Project Scaffold

Configured repository boundaries and governance metadata across both the root portfolio and the new repository.

**Files changed:**
- `.gitignore` (root) — Added `/saleor-graphql-automation/` to prevent git submodule embedding.
- `WORKLIST_saleor-graphql-automation.md` (root) — Authored loop control tracking for Phases 0 through 3.
- `portfolio-prompts/registry.yml` — Registered fourteenth portfolio project row with presentation role `showcase`.
- `portfolio-prompts/README.md` — Re-rendered machine-generated portfolio registry table.
- `saleor-graphql-automation/package.json` — Defined dependencies (`@serenity-js/core`, `@cucumber/cucumber`, `@graphql-inspector/core`, `graphql`, `tsx`, `typescript`) and verification scripts.
- `saleor-graphql-automation/tsconfig.json` — Strict NodeNext ES2022 TypeScript configuration.
- `saleor-graphql-automation/cucumber.json` — Cucumber profile configurations (`default`, `api`, `smoke`).
- `saleor-graphql-automation/LICENSE` — MIT licence.
- `saleor-graphql-automation/README.md` — Overview, quick-start guide, architectural principles, and CI badges.

### 2. Pinned SUT Docker Compose Stack & Readiness Poller

Provisioned reproducible Docker container environment matching the Phase 0 empirical probe.

**Files changed:**
- `docker/docker-compose.yml` — Pinned image digests for Saleor 3.23 (`sha256:ff3f5f5ebb...`), PostgreSQL 15 Alpine (`sha256:fe0737ba56...`), and Valkey 8.1 Alpine, respecting the host volume storage invariant on `E:\_DockerData`.
- `docker/common.env` & `docker/backend.env` — SUT application secrets, channel configuration, and service connection strings.
- `docker/replica_user.sql` — Provisioned read-only PostgreSQL role for potential database assertion queries.
- `scripts/wait-for-sut.ts` — TypeScript readiness poller fulfilling review recommendation R1-01 (polling `{ shop { name } }` until HTTP 200).

### 3. Serenity/JS Screenplay Core & Custom `CallGraphQL` Ability

Built the core Screenplay abstraction layer for GraphQL client operations.

**Files changed:**
- `src/screenplay/abilities/CallGraphQL.ts` — Extends `@serenity-js/core` `Ability` to provide typed query/mutation execution, header management, JWT Bearer auth token injection, latency tracking, and structured error extraction.
- `src/screenplay/actors/index.ts` — Actor cast factory providing `Guest`, `Customer`, and `Admin` personas.
- `src/screenplay/tasks/` — Created reusable business tasks: `BrowseCatalogue`, `QueryShopInfo`, `Authenticate`, `RefreshToken`, `QueryCurrentUser`.
- `src/screenplay/questions/` — Created state interrogation questions: `TheShopInfo`, `TheProducts`, `TheToken`, `TheGraphQLError`.
- `tests/unit/call-graphql.spec.ts` — 6 unit tests verifying request formatting, header injection, token lifecycle, error handling, and transport resilience.

### 4. Schema Contract Testing & Inspector Diff Gate (FR-4)

Established baseline schema snapshot and automated drift detection.

**Files changed:**
- `schema/saleor-3.23.graphql` — Checked in full Saleor 3.23 SDL schema snapshot comprising 1,482 types.
- `scripts/check-schema-contract.ts` — Schema diff validator using `@graphql-inspector/core`.
- `tests/contract/schema-contract.spec.ts` — 5 contract tests demonstrating baseline self-consistency, breaking field removal detection, type change detection, non-nullable argument detection, and non-breaking addition compatibility.

### 5. Read-Only Smoke Profile & Safety Validator (NFR-6)

Guaranteed non-destructive test execution against live demo or staging instances.

**Files changed:**
- `scripts/check-smoke-safety.ts` — AST/regex parser scanning `.feature` files to ensure no `@smoke` scenario is tagged with `@mutating`.
- `tests/unit/smoke-safety.spec.ts` — Unit tests validating the tag safety policy.

### 6. BDD Feature Journeys & Lightweight Embedded Test Server

Implemented end-to-end BDD scenarios and zero-dependency test orchestration.

**Files changed:**
- `features/catalogue_read.feature` — 3 scenarios verifying shop details, channel product listings, pricing validity, and cursor pagination.
- `features/authentication.feature` — 4 scenarios verifying `tokenCreate`, authenticated profile retrieval, `INVALID_CREDENTIALS` error handling, and `tokenRefresh`.
- `features/step_definitions/catalogue_steps.ts` & `features/step_definitions/auth_steps.ts` — Step definitions connecting Cucumber steps to Screenplay tasks and questions.
- `features/support/hooks.ts` — Dynamic runtime hook connecting to live SUT if available, or booting an in-process mock server for isolated runs.
- `src/mock/server.ts` — Faithful, zero-dependency mock GraphQL server built with `node:http` and `graphql` supporting catalogue queries and authentication mutations.

### 7. GitHub Actions CI Workflow

Automated continuous integration pipeline.

**Files changed:**
- `.github/workflows/ci.yml` — Runs on `ubuntu-latest` with Node 22, executing `npm ci` and `npm run verify`.

---

## Technical Decisions

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| In-Process Mock Fallback in Cucumber Hooks | Ensures `npm run verify` is completely self-contained and passes rapidly in CI without requiring 2 GB of container resources, while retaining seamless execution against live Docker when running. | Requiring external Docker services for every local verify run, which slows down dev feedback loops and causes CI fragility. |
| Node.js Native `--test` Runner via `tsx` | Leverages modern Node 24 native test runner for unit and contract suites, eliminating redundant dependencies on Jest or Vitest. | Adding Vitest or Jest, which introduces additional configuration and peer dependency overhead. |
| Single Stdout Formatter (`summary`) in `cucumber.json` | Keeps terminal output clean and readable across Windows and Linux terminals while reporting scenario and step execution metrics. | Multiple overlapping stdout formatters, which clutter terminal output and break CI log grouping. |

---

## Documentation Updates

- `design-document.md` — Created canonical project-internal design document.
- `docs/backlog.md` — Initialised project backlog v1 and recorded completion of Phase 1 items (`SGR-P1-01`..`SGR-P1-08`).
- `docs/decision-register.md` — Formalised architectural decisions `ADR-001` through `ADR-007`.
- `docs/project-contract.md` — Defined mandatory project gates and working norms.
- `docs/templates/implementation-log.template.md` — Copied portfolio-standard implementation log template into project repository.
- `README.md` — Authored project overview, badges, and usage guides.
- `WORKLIST_saleor-graphql-automation.md` (root) — Created and updated loop control record to reflect Phase 1 delivery.
- `portfolio-prompts/registry.yml` — Registered fourteenth project row in machine-readable registry.

---

## Lessons Learned

- **Serenity/JS 3.x Ability Inheritance:** In `@serenity-js/core` 3.x, custom abilities must extend `Ability` rather than implement it as an interface. `Ability.as<T>(actor)` is statically inherited and should not be re-declared on subclasses.
- **GraphQL Inspector Error Message Formatting:** `@graphql-inspector/core` produces exact diagnostic messages (e.g. `Argument 'channel: String!' added to field 'Query.products'`) rather than generic breaking change labels. Contract test assertions should match these precise strings.
- **Docker Desktop Containment:** Docker Desktop WSL2 containerd occasionally encounters filesystem blob I/O errors after heavy churn. Having an in-process mock fallback ensures that test verification is never blocked by local daemon instability.

---

## Recommendations / Next Steps

- [ ] `SGR-P2-01` — Implement FR-2: Stateful Checkout BDD Journey (`checkoutCreate`, address assignment, shipping method selection, `transactionCreate`, and `checkoutComplete`) — Priority: High
- [ ] `SGR-P2-02` — Implement FR-5: Staff Order Fulfilment BDD Journey (order query, payment capture, fulfilment line allocation) — Priority: Medium
- [ ] `SGR-P2-03` — Implement NFR-1 & NFR-2: Latency Telemetry Tracking and Typed Error Categorisation — Priority: Medium

---

*Session logged: 2026-09-05. Author: Codex / Antigravity.*

# Canonical Project Backlog: saleor-graphql-automation

**Current Version:** v3
**Last Updated:** 2026-09-10
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
| **SGR-P2-02** | FR-5: Staff Order Fulfilment Journey | 2 | FEATURE | Backlog | MEDIUM | 16 |
| **SGR-P2-03** | NFR-1 & NFR-2: Latency Telemetry & Error Model | 2 | QUALITY | Backlog | MEDIUM | 15 |
| **SGR-P3-01** | Living Documentation & GitHub Pages | 3 | SHOWCASE | Backlog | LOW | 12 |
| **SGR-P3-02** | Upstream Schema Drift & Alerting Monitor | 3 | RELIABILITY | Backlog | LOW | 11 |

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

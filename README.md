# Saleor GraphQL Automation (P-12)

[![CI](https://github.com/GBrooks1970/saleor-graphql-automation/actions/workflows/ci.yml/badge.svg)](https://github.com/GBrooks1970/saleor-graphql-automation/actions/workflows/ci.yml)
[![Node.js Version](https://img.shields.io/badge/node-24.15%2B-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Pattern: Screenplay](https://img.shields.io/badge/pattern-Screenplay-blueviolet.svg)](https://serenity-js.org/)
[![SUT: Saleor 3.23](https://img.shields.io/badge/SUT-Saleor%203.23-teal.svg)](https://saleor.io/)

Fourteenth portfolio project (`P-12`) demonstrating enterprise-grade GraphQL automation for headless e-commerce. Built against a containerised Saleor 3.23 core instance, the repository showcases contract testing with GraphQL Inspector, stateful BDD journeys with Serenity/JS and Cucumber, and non-destructive smoke safety profiles.

---

## Key Features

1. **Screenplay Pattern with Serenity/JS:** Modular, user-centric actors (`Guest`, `Customer`, `Admin`) equipped with a typed `CallGraphQL` Ability that manages headers, JWT Bearer tokens, query variables, and typed error responses.
2. **Contract Testing & Schema Diffing:** Baseline schema snapshot (`schema/saleor-3.23.graphql`) with bidirectional breaking-change diff testing via `@graphql-inspector/core`, plus truthful, fail-closed live introspection diffing (`npm run check:schema:live`) classified under ADR-010.
3. **Stateful BDD Journeys:** Business-readable Cucumber Gherkin scenarios testing catalogue querying, JWT authentication, and the six-operation checkout lifecycle through modern `transactionCreate` and `checkoutComplete`.
4. **Read-Only Smoke Profile (NFR-6):** Demo-safe `@smoke and not @mutating` profile guaranteed to execute zero side-effect mutations, verified by automated safety tests.
5. **Deterministic Docker SUT:** Self-contained Docker Compose stack with pinned immutable digests (`saleor:3.23@sha256:ff3f5f5ebb...`, `postgres:15-alpine@sha256:fe0737ba56...`, `valkey:8.1-alpine@sha256:77643d1525...`), bound exclusively to host loopback (`127.0.0.1`), respecting host storage policies on `E:\_DockerData`.

---

## Project Structure

```
saleor-graphql-automation/
├── .github/workflows/ci.yml    # Continuous integration workflow
├── cucumber.json                # Cucumber profiles (default, api, smoke)
├── design-document.md           # Architecture, requirements, and design
├── docker/                      # Pinned Docker Compose stack & environment files
│   ├── docker-compose.yml
│   ├── common.env
│   ├── backend.env
│   └── replica_user.sql
├── docs/                        # Backlog, decision register, and project contract
│   ├── backlog.md
│   ├── decision-register.md
│   └── project-contract.md
├── features/                    # Canonical Gherkin feature files
│   ├── catalogue_read.feature   # FR-1 catalogue read journey
│   ├── authentication.feature   # FR-3 JWT auth lifecycle journey
│   ├── checkout_stateful.feature # FR-2 stateful checkout journey
│   └── step_definitions/        # Serenity/JS step definitions
├── schema/                      # Baseline GraphQL introspection schema
│   └── saleor-3.23.graphql
├── scripts/                     # SUT readiness, smoke safety, schema check
├── src/screenplay/              # Screenplay actors, abilities, tasks, questions
│   ├── abilities/CallGraphQL.ts
│   ├── actors/index.ts
│   ├── questions/
│   └── tasks/
└── tests/                       # Unit and contract tests
    ├── unit/
    └── contract/
```

---

## Quick Start

### Prerequisites
- Node.js 24.15+ (CI uses Node 24) and npm; Node 22.22.2+ is also supported by the installed Serenity/JS packages
- Docker Desktop (WSL2 engine configured on `E:\_DockerData`)

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Deterministic Gate
```bash
npm run verify
```

The gate always starts the embedded SUT unless `SALEOR_GRAPHQL_URL` is explicitly configured, so a running local Saleor instance cannot make deterministic verification environment-dependent. For the separate pinned-Docker acceptance procedure, including database migration and deterministic seeding, follow [docs/live-sut-validation.md](docs/live-sut-validation.md).

---

## Available Scripts

| Command | Description |
|:---|:---|
| `npm run typecheck` | Validates TypeScript types across the project |
| `npm run test:unit` | Executes unit tests for abilities, error parsers, and safety guards |
| `npm run test:contract` | Executes bidirectional schema diff contract tests |
| `npm run check:schema` | Validates baseline schema snapshot self-consistency offline |
| `npm run monitor:schema` | Downloads the official 3.23 schema by default; optional live introspection; retained drift reports |
| `npm run check:schema:live` | Diffs live Saleor introspection schema against baseline, failing closed on unreachable endpoints or domain breaks (ADR-010) |
| `npm run check:smoke-safety`| Asserts that no `@mutating` scenario is tagged with `@smoke` |
| `npm run test:smoke` | Runs read-only smoke scenarios against local or demo instances |
| `npm run test:api` | Runs full BDD GraphQL journey suite |
| `npm run test:checkout` | Runs only the `@mutating` stateful checkout journey |
| `npm run verify` | Clean reports, typecheck, unit, contract, smoke, API tests, and report integrity |
| `npm run check:reports` | Validate complete passing smoke/API reports and build the documentation landing page |
| `npm run sut:up` / `npm run sut:down` | Starts or stops the pinned Docker SUT without deleting its seeded volumes |
| `npm run sut:migrate` / `npm run sut:seed` | Applies Saleor migrations and creates the deterministic sample dataset |

---

## Architecture & Design Decisions

See [design-document.md](design-document.md) and [docs/decision-register.md](docs/decision-register.md) for detailed architecture, requirements tracing, and ADRs.

## Living Documentation

`npm run verify` produces `target/site/serenity/index.html`, linking separate full API and read-only smoke reports. Open it through a local HTTP server; see [reporting instructions](docs/reporting.md) for browsing, CI artifacts and Pages setup. Reports describe the embedded mock SUT by default. [Published living documentation](https://gbrooks1970.github.io/saleor-graphql-automation/) was verified after PR #19 deployment.

## Upstream Schema Monitor

The separate daily/manual workflow downloads the official Saleor 3.23 schema by default, compares it with the reviewed baseline and retains JSON/Markdown drift reports. Live introspection is optional. See [schema monitoring](docs/schema-monitoring.md) for the 07:17 UTC schedule, source settings, notification behaviour and reviewed baseline promotion. The first scheduled run `39107672846` passed on main `4660ce0`, with matching retained reports; notification settings are verified for GitHub/email on failed workflows only, while actual failure-alert delivery remains untested.

# Saleor GraphQL Automation (P-12)

[![CI](https://github.com/GBrooks1970/saleor-graphql-automation/actions/workflows/ci.yml/badge.svg)](https://github.com/GBrooks1970/saleor-graphql-automation/actions/workflows/ci.yml)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Pattern: Screenplay](https://img.shields.io/badge/pattern-Screenplay-blueviolet.svg)](https://serenity-js.org/)
[![SUT: Saleor 3.23](https://img.shields.io/badge/SUT-Saleor%203.23-teal.svg)](https://saleor.io/)

Fourteenth portfolio project (`P-12`) demonstrating enterprise-grade GraphQL automation for headless e-commerce. Built against a containerised Saleor 3.23 core instance, the repository showcases contract testing with GraphQL Inspector, stateful BDD journeys with Serenity/JS and Cucumber, and non-destructive smoke safety profiles.

---

## Key Features

1. **Screenplay Pattern with Serenity/JS:** Modular, user-centric actors (`Guest`, `Customer`, `Admin`) equipped with a typed `CallGraphQL` Ability that manages headers, JWT Bearer tokens, query variables, and typed error responses.
2. **Contract Testing & Schema Diffing:** Baseline schema snapshot (`schema/saleor-3.23.graphql`) compared against live introspection via `@graphql-inspector/core`, preventing breaking changes in CI.
3. **Stateful BDD Journeys:** Business-readable Cucumber Gherkin scenarios testing catalogue querying, JWT authentication, and the six-operation checkout lifecycle through modern `transactionCreate` and `checkoutComplete`.
4. **Read-Only Smoke Profile (NFR-6):** Demo-safe `@smoke and not @mutating` profile guaranteed to execute zero side-effect mutations, verified by automated safety tests.
5. **Deterministic Docker SUT:** Self-contained Docker Compose stack with pinned digests (`saleor:3.23`, `postgres:15-alpine`, `valkey:8.1-alpine`), respecting host storage policies on `E:\_DockerData`.

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
- Node.js 20+ and npm
- Docker Desktop (WSL2 engine configured on `E:\_DockerData`)

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Deterministic Gate
```bash
npm run verify
```

The gate starts the embedded SUT when no local Saleor endpoint is available. For the separate pinned-Docker acceptance procedure, including database migration and deterministic seeding, follow [docs/live-sut-validation.md](docs/live-sut-validation.md).

---

## Available Scripts

| Command | Description |
|:---|:---|
| `npm run typecheck` | Validates TypeScript types across the project |
| `npm run test:unit` | Executes unit tests for abilities, error parsers, and safety guards |
| `npm run test:contract` | Executes bidirectional schema diff contract tests |
| `npm run check:smoke-safety`| Asserts that no `@mutating` scenario is tagged with `@smoke` |
| `npm run test:smoke` | Runs read-only smoke scenarios against local or demo instances |
| `npm run test:api` | Runs full BDD GraphQL journey suite |
| `npm run test:checkout` | Runs only the `@mutating` stateful checkout journey |
| `npm run verify` | Complete verification gate: typecheck, unit, contract, smoke, and API tests |
| `npm run sut:up` / `npm run sut:down` | Starts or stops the pinned Docker SUT without deleting its seeded volumes |
| `npm run sut:migrate` / `npm run sut:seed` | Applies Saleor migrations and creates the deterministic sample dataset |

---

## Architecture & Design Decisions

See [design-document.md](design-document.md) and [docs/decision-register.md](docs/decision-register.md) for detailed architecture, requirements tracing, and ADRs.

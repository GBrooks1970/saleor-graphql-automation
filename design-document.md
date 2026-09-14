# Design Document: Saleor GraphQL Automation (P-12)

**Status:** Approved & Active (Phase 2)
**Author:** Gary Brooks  
**Date:** 2026-09-04  
**Version:** 1.0  
**Target SUT:** Saleor Core 3.23 (BSD-3-Clause)  
**Execution Framework:** Serenity/JS 3.x + Cucumber 12.x + TypeScript + GraphQL Inspector  

---

## 1. Executive Summary

This repository delivers the fourteenth portfolio project (`P-12`), establishing an enterprise-grade GraphQL automation suite for modern headless e-commerce. Built against a containerised Saleor 3.23 SUT, the framework demonstrates:
- **Contract Testing:** Automated schema introspection snapshotting and bidirectional breaking-change diff gating via `@graphql-inspector/core`, with fail-closed live checking and ADR-010 specification directive classification.
- **Screenplay Pattern:** Modular, business-readable Actor-Task-Question interactions using `@serenity-js/core` and a custom, typed `CallGraphQL` Ability.
- **Stateful BDD Journeys:** End-to-end e-commerce workflows covering catalogue browsing, password JWT authentication with token refresh, and stateful checkout with transaction payments. Planned roadmap enhancements include staff order fulfilment (SGR-P2-02), multi-line cart checkout, and multi-factor authentication (MFA).
- **Read-only Smoke Profile:** NFR-6 compliant `@smoke and not @mutating` test lane safe for executing against demo and production environments, guarded by AST tag inheritance and mutation operation inspection (TRIAGE-01).
- **Reproducible SUT Orchestration:** Docker Compose environment pinned to immutable image digests, running against `E:\_DockerData` per workspace operational rules.

---

## 2. Requirements Baseline

### Functional Requirements (FR)
- **FR-1: Catalogue Browsing & Querying (Read-Only) [Delivered — Phase 1]**
  - Anonymous customer can query product collections, filter by channel (`default-channel`), retrieve pricing details, and paginate forward across product edges.
- **FR-2: Stateful Checkout Lifecycle (Mutations) [Delivered — Phase 2]**
  - Customer discovers available product variant, creates checkout, attaches line, assigns billing and delivery addresses, selects shipping method, creates payment transaction, and triggers `checkoutComplete` producing a confirmed Order.
- **FR-3: Authentication & Authorisation Lifecycle [Delivered — Phase 1]**
  - Public customer logs in via password `tokenCreate`, receives RS256 JWT and refresh token, executes authenticated queries, refreshes tokens via `tokenRefresh`, and verifies rejection of invalid credentials. (Note: Multi-factor authentication is a planned future roadmap capability).
- **FR-4: Schema Contract & Breaking Change Diffing [Delivered — Phase 1 & TRIAGE-02]**
  - Offline baseline schema (`schema/saleor-3.23.graphql`) validated offline and compared against active runtime schema via `check:schema:live`. Diff gate detects breaking changes with fail-closed probing and ADR-010 specification directive classification.
- **FR-5: Staff Order Fulfilment & Lifecycle Transitions [Target Roadmap — Backlog SGR-P2-02]**
  - Staff user transitions confirmed orders: capture payment, allocate stock, generate fulfilment lines, and transition order to `FULFILLED`.
- **FR-6: Fault Tolerance & Typed Error Handling [Delivered Baseline — Unified Model in SGR-P2-03]**
  - Queries/mutations validate typed GraphQL errors (`AccountError`, `CheckoutError`, `OrderError`) and assert code/field-level diagnostic accuracy. Comprehensive unified typed error handling across all tasks is scheduled under SGR-P2-03.

### Non-Functional Requirements (NFR)
- **NFR-1: Latency Tracking & SLA Telemetry [Delivered Baseline — Threshold Alerting in SGR-P2-03]:** Each GraphQL operation records execution latency in `CallGraphQL`. Active SLA threshold assertions (alerting if operation latency exceeds 2,000ms) are scheduled under backlog SGR-P2-03.
- **NFR-2: Error Categorisation & Assertions [Delivered Baseline — Unified Model in SGR-P2-03]:** Framework differentiates between HTTP-level transport errors, top-level GraphQL syntax/validation errors, and domain-level mutation errors.
- **NFR-3: Test Independence & Data Isolation [Delivered]:** Scenarios manage their own state; UUID generation and scenario-scoped Serenity notes ensure isolation without cross-test state leakage.
- **NFR-4: Docker SUT Determinism & Operational Readiness [Delivered]:**
  - **NFR-4a: Warm Service Readiness:** Docker container stack returns healthy GraphQL probe within 30 seconds (empirically measured: ~14.6 seconds via `npm run sut:wait`).
  - **NFR-4b: Clean Bootstrap & Seeding:** Initial database migration (1,439 schema migrations) and deterministic sample data generation (`populatedb --createsuperuser`) completes within 25 minutes (empirically measured: ~15 to 21 minutes).
- **NFR-5: CI Execution Speed [Delivered]:** Full local and CI verification gate completes within 5 minutes (empirically measured: ~13 to 20 seconds).
- **NFR-6: Demo/Staging Safe Execution [Delivered — TRIAGE-01]:** Smoke profile (`@smoke and not @mutating`) guaranteed side-effect free; protected by automated AST tag inheritance and mutation operation inspection.

---

## 3. Architecture & Screenplay Design

### 3.1 Screenplay Layering
- **Actor:** Represents the persona interacting with the system (`Guest`, `Customer`, `Admin`).
- **Ability (`CallGraphQL`):** Encapsulates HTTP client interactions with Saleor's GraphQL endpoint (`/graphql/`), including endpoint resolution, header management, JWT bearer auth injection, and structured error extraction.
- **Tasks:** Business-level interactions composed of low-level queries and mutations (`BrowseCatalogue`, `Authenticate`, `CreateCheckout`, etc.).
- **Questions:** State queries interrogating the system or previous responses (`TheProducts`, `TheShopInfo`, `TheToken`, `TheGraphQLError`).

### 3.2 Directory Structure
```
saleor-graphql-automation/
├── .github/workflows/ci.yml
├── .gitignore
├── README.md
├── LICENSE
├── package.json
├── tsconfig.json
├── cucumber.json
├── design-document.md
├── docs/
│   ├── backlog.md
│   ├── decision-register.md
│   └── project-contract.md
├── docker/
│   ├── docker-compose.yml
│   ├── common.env
│   ├── backend.env
│   └── replica_user.sql
├── schema/
│   └── saleor-3.23.graphql
├── scripts/
│   ├── wait-for-sut.ts
│   ├── check-smoke-safety.ts
│   └── check-schema-contract.ts
├── src/
│   └── screenplay/
│       ├── abilities/
│       │   └── CallGraphQL.ts
│       ├── actors/
│       │   └── index.ts
│       ├── questions/
│       └── tasks/
├── features/
│   ├── catalogue_read.feature
│   ├── authentication.feature
│   └── step_definitions/
└── tests/
    ├── unit/
    └── contract/
```

---

## 4. Phase Delivery Roadmap

- **Phase 0:** Feasibility Probe (Completed 2026-09-03, GO verdict).
- **Phase 1:** Core Foundation, Schema Diffing & Read/Auth Journeys (Completed 2026-09-05).
- **Phase 2:** Stateful Checkout, Staff Fulfilment & Advanced Error Handling (Active).
- **Phase 3:** Serenity/JS Living Documentation, Drift Monitoring & Portfolio Showcase.

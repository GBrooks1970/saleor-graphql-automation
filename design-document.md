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
- **Contract Testing:** Automated schema introspection snapshotting and bidirectional breaking-change diff gating via `@graphql-inspector/core`.
- **Screenplay Pattern:** Modular, business-readable Actor-Task-Question interactions using `@serenity-js/core` and a custom, typed `CallGraphQL` Ability.
- **Stateful BDD Journeys:** End-to-end e-commerce workflows covering catalogue browsing, multi-factor JWT authentication, multi-line cart checkout with transaction payments, and staff order fulfilment.
- **Read-only Smoke Profile:** NFR-6 compliant `@smoke and not @mutating` test lane safe for executing against demo and production environments.
- **Reproducible SUT Orchestration:** Docker Compose environment pinned to immutable image digests, running against `E:\_DockerData` per workspace operational rules.

---

## 2. Requirements Baseline

### Functional Requirements (FR)
- **FR-1: Catalogue Browsing & Querying (Read-Only)**
  - Anonymous customer can query product collections, filter by channel (`default-channel`), retrieve pricing details, and paginate forward across product edges.
- **FR-2: Stateful Checkout Lifecycle (Mutations)**
  - Customer creates checkout, attaches lines, assigns billing and delivery addresses, selects shipping method, creates payment transaction, and triggers `checkoutComplete` producing a confirmed Order.
- **FR-3: Authentication & Authorisation Lifecycle**
  - Public customer logs in via `tokenCreate`, receives RS256 JWT and refresh token, executes authenticated queries, refreshes tokens via `tokenRefresh`, and verifies rejection of invalid credentials.
- **FR-4: Schema Contract & Breaking Change Diffing**
  - Offline baseline schema (`schema/saleor-3.23.graphql`) compared against active runtime schema. Diff gate detects breaking changes (removed fields, altered scalars, non-nullable additions) and passes non-breaking additions.
- **FR-5: Staff Order Fulfilment & Lifecycle Transitions**
  - Staff user transitions confirmed orders: capture payment, allocate stock, generate fulfilment lines, and transition order to `FULFILLED`.
- **FR-6: Fault Tolerance & Typed Error Handling**
  - Queries/mutations validate typed GraphQL errors (`AccountError`, `CheckoutError`, `OrderError`) and assert code/field-level diagnostic accuracy.

### Non-Functional Requirements (NFR)
- **NFR-1: Latency Tracking & SLA Telemetry:** Each GraphQL operation records execution latency; alerts if operation latency exceeds 2,000ms.
- **NFR-2: Error Categorisation & Assertions:** Framework differentiates between HTTP-level transport errors, top-level GraphQL syntax/validation errors, and domain-level mutation errors.
- **NFR-3: Test Independence & Data Isolation:** Scenarios manage their own state; UUID generation ensures isolation without cross-test state leakage.
- **NFR-4: Docker SUT Determinism:** Environment boots from pinned image digests; cold boot completes within 30 seconds.
- **NFR-5: CI Execution Speed:** Full local and CI verification gate completes within 5 minutes.
- **NFR-6: Demo/Staging Safe Execution:** Smoke profile (`@smoke and not @mutating`) guaranteed side-effect free; protected by automated safety tests.

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

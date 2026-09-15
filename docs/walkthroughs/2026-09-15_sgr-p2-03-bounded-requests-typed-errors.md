# Walkthrough — SGR-P2-03: Bounded GraphQL Requests, Latency Enforcement & Unified Typed Error Model

Addresses backlog item `SGR-P2-03` and Code Review Codex v1 Finding `R-06` (MEDIUM priority) in `saleor-graphql-automation`.

---

## 1. Executive Summary

- **Objective:** Eliminate unbounded HTTP requests, enforce latency SLAs, introduce a unified typed error model across all tasks, and ensure auth state is cleanly reset before credential rotation.
- **Project PR:** [#10](https://github.com/GBrooks1970/saleor-graphql-automation/pull/10) (merged as [`d3ce465`](https://github.com/GBrooks1970/saleor-graphql-automation/commit/d3ce465))
- **Portfolio Tracking PR:** [#205](https://github.com/GBrooks1970/test-automation-portfolio/pull/205) (merged as [`69c0506`](https://github.com/GBrooks1970/test-automation-portfolio/commit/69c0506))
- **Test Gate Status:** 100% green (`npm run verify`: 39 unit tests, 21 contract tests, 3 smoke scenarios, 8 API scenarios; `check:schema:live`: 0 domain breaks against pinned Saleor 3.23 SUT).

---

## 2. Key Changes Implemented

### 2.1 Bounded GraphQL Requests via `AbortSignal.timeout`
- **File:** `src/screenplay/abilities/CallGraphQL.ts`
- Configured default request timeout of `15,000ms`, overridable via `process.env.SALEOR_GRAPHQL_TIMEOUT_MS`, constructor options, or per-call `timeoutMs` parameter.
- Integrated `AbortSignal.timeout(effectiveTimeoutMs)` into `fetch()`.
- Catches `TimeoutError` and timeout aborts, categorising the response with `errorCategory: 'TIMEOUT'`, `status: 0`, and a descriptive timeout error message while capturing observed latency.

### 2.2 Configurable Latency SLA Enforcement
- **Files:**
  - `src/screenplay/abilities/CallGraphQL.ts`
  - `src/screenplay/questions/LastOperationLatency.ts`
- Configured default latency SLA threshold of `2,000ms` (per NFR-1), overridable via `process.env.SALEOR_GRAPHQL_MAX_LATENCY_MS` or constructor options.
- Added `assertLatencyWithin(maxLatencyMs?, operation?)` on `CallGraphQL`, throwing typed `GraphQLLatencyError` if the last operation exceeded SLA.
- Created Serenity/JS Question `LastOperationLatency.inMilliseconds()` allowing actors to interrogate latency in step assertions.

### 2.3 Unified Typed Error Model
- **Files:**
  - `src/screenplay/errors/GraphQLOperationError.ts`
  - `src/screenplay/errors/index.ts`
  - `src/screenplay/checkout/GraphQLOperation.ts`
- Introduced a typed hierarchy extending `GraphQLOperationError`:
  - `GraphQLTimeoutError`: captures timeout duration, observed latency, and status 0.
  - `GraphQLNetworkError`: captures socket/transport level errors (e.g. `ECONNREFUSED`).
  - `GraphQLHttpError`: captures non-2xx HTTP status codes (e.g. 500 Internal Server Error, 502 Bad Gateway).
  - `GraphQLInvalidJsonError`: captures malformed/non-JSON response bodies (e.g. HTML error pages).
  - `GraphQLSyntaxError`: captures top-level GraphQL schema/validation errors.
  - `GraphQLDomainError`: captures business domain mutation errors (`field`, `message`, `code`).
  - `GraphQLLatencyError`: captures SLA latency threshold breaches.
- Created uniform assertion functions:
  - `requireTransportSuccess(operation, response)`: validates network, timeout, HTTP, and JSON validity without prematurely failing negative BDD scenarios inspecting domain errors.
  - `requireOperationSuccess(operation, response)`: enforces absence of top-level GraphQL errors.
  - `requireOperationPayload(operation, response, payload)`: enforces payload presence and zero domain errors across all tasks.

### 2.4 Uniform Task Promotion & Authentication State Reset
- **Files:**
  - `src/screenplay/tasks/Authenticate.ts`
  - `src/screenplay/tasks/RefreshToken.ts`
  - `src/screenplay/tasks/QueryShopInfo.ts`
  - `src/screenplay/tasks/BrowseCatalogue.ts`
  - `src/screenplay/tasks/QueryCurrentUser.ts`
- In `Authenticate`, calls `ability.clearAuthToken()` before issuing `tokenCreate` so failed login attempts never preserve stale credentials. Uses `requireTransportSuccess` to catch infrastructure failures while allowing domain errors to reach BDD assertions.
- In `RefreshToken`, clears auth token on failure.
- In read tasks (`QueryShopInfo`, `BrowseCatalogue`, `QueryCurrentUser`), uses `requireOperationPayload` so unexpected infrastructure or GraphQL failures throw descriptive typed errors.

---

## 3. Verification & Validation Evidence

### 3.1 Unit Test Suite (`npm run test:unit`)
Expanded from 19 to 39 unit tests (100% green pass rate):
```
▶ CallGraphQL Ability (Unit Tests)
  ✔ initialises with default endpoint and headers (3.1512ms)
  ✔ allows custom timeout and latency thresholds via constructor options (0.5365ms)
  ✔ manages auth tokens correctly (0.3428ms)
  ✔ executes GraphQL query and captures data & latency (46.1793ms)
  ✔ injects Bearer token into headers when auth token is present (0.9936ms)
  ✔ captures GraphQL errors and classifies errorCategory as GRAPHQL_ERROR (0.9975ms)
  ✔ handles network transport failure gracefully and classifies as NETWORK (0.8635ms)
  ✔ handles request timeout abort and classifies errorCategory as TIMEOUT (0.7148ms)
  ✔ handles HTTP non-2xx status and classifies errorCategory as HTTP_ERROR (1.055ms)
  ✔ handles invalid non-JSON responses and classifies errorCategory as INVALID_JSON (1.0984ms)
  ✔ enforces latency thresholds via assertLatencyWithin() (1.7105ms)
✔ CallGraphQL Ability (Unit Tests) (61.3311ms)
▶ GraphQL Typed Error Model & Task Promotion (Unit Tests)
  ▶ requireTransportSuccess
    ✔ passes valid 200 HTTP response (2.1688ms)
    ✔ throws GraphQLTimeoutError on TIMEOUT errorCategory (1.6601ms)
    ✔ throws GraphQLNetworkError on NETWORK errorCategory (0.8131ms)
    ✔ throws GraphQLInvalidJsonError on INVALID_JSON errorCategory (1.2146ms)
    ✔ throws GraphQLHttpError on non-2xx HTTP status (0.9708ms)
  ✔ requireTransportSuccess (9.3339ms)
  ▶ requireOperationSuccess
    ✔ throws GraphQLSyntaxError when top-level errors are present (1.2514ms)
  ✔ requireOperationSuccess (1.6846ms)
  ▶ requireOperationPayload
    ✔ throws GraphQLOperationError when payload is missing (1.1439ms)
    ✔ throws GraphQLDomainError when payload contains domain errors (0.8955ms)
    ✔ returns unwrapped payload when clean (1.5924ms)
  ✔ requireOperationPayload (5.7583ms)
  ▶ Task-level authentication state clearing and error promotion
    ✔ clears stale authentication state before issuing credentials attempt (73.0475ms)
    ✔ sets new auth token when Authenticate succeeds (28.312ms)
    ✔ clears auth token when RefreshToken fails (15.212ms)
    ✔ propagates typed errors from QueryShopInfo on transport failure (15.9697ms)
    ✔ propagates typed errors from BrowseCatalogue on HTTP error (14.9418ms)
    ✔ propagates typed errors from QueryCurrentUser when payload is missing (15.3501ms)
  ✔ Task-level authentication state clearing and error promotion (164.0617ms)
✔ GraphQL Typed Error Model & Task Promotion (Unit Tests) (182.342ms)
▶ Stateful checkout mock
  ✔ returns the Saleor billing-address error before checkout completion (138.4051ms)
✔ Stateful checkout mock (223.8284ms)
▶ Smoke Safety Policy Guard (NFR-6 & TRIAGE-01)
  ▶ Layer 1: Tag Inheritance & Scenario Tag Parsing (4 tests pass)
  ▶ Layer 2: Step Mutation Detection (findMutatingStep) (4 tests pass)
  ▶ Dual-Control Safety Validation (validateSmokeSafety) (4 tests pass)
✔ Smoke Safety Policy Guard (NFR-6 & TRIAGE-01) (116.9632ms)
ℹ tests 39
ℹ suites 11
ℹ pass 39
ℹ fail 0
```

### 3.2 Full Verification Gate (`npm run verify`)
Passed in 21 seconds on GitHub Actions CI and locally:
- `npm run typecheck`: 0 errors.
- `npm run test:unit`: 39/39 passed.
- `npm run check:smoke-safety`: 8 scenarios inspected, 3 @smoke, 0 violations.
- `npm run test:contract`: 21/21 passed (offline baseline self-consistency + ADR-010 directive classification).
- `npm run test:smoke`: 3/3 scenarios passed (11 steps passed).
- `npm run test:api`: 8/8 scenarios passed (34 steps passed; Order #21 created with `FULLY_CHARGED` and `FULL`).

### 3.3 Live SUT Validation (`npm run check:schema:live`)
Tested against pinned Docker Saleor 3.23 SUT on port 8000:
```
[check-schema-contract] Probing explicit live endpoint at http://127.0.0.1:8000/graphql/...
[check-schema-contract] Diffing live schema against baseline...
[check-schema-contract] Inspected 189 total changes:
  - Domain breaking changes: 0
  - Built-in specification directive differences: 5
  - Non-breaking changes / enhancements: 184
[check-schema-contract] Live schema contract valid! Zero domain breaking changes detected.
```

---

## 4. Worklist Cross-Check

| Backlog Item | Description | Review Finding | Status | Evidence |
|---|---|---|---|---|
| **SGR-P2-03** | Bounded GraphQL Requests, Latency Enforcement & Typed Error Model | R-06 (MEDIUM) | **DELIVERED** | PR [#10](https://github.com/GBrooks1970/saleor-graphql-automation/pull/10) (`d3ce465`), Root PR [#205](https://github.com/GBrooks1970/test-automation-portfolio/pull/205) (`69c0506`) |

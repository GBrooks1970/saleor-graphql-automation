# Walkthrough — TRIAGE-01 Smoke Safety Tag Inheritance & Mutation Rejection

## Executive Summary

TRIAGE-01 resolves Code Review Finding R-01 (remediation gap against Done task SGR-P1-07) in `saleor-graphql-automation`.
Prior to this remediation, `scripts/check-smoke-safety.ts` used simple regex string matching that missed Feature-, Rule-, Scenario Outline-, and Examples-level tags, and lacked inspection of step-level mutation operations.

This batch introduces a two-layer safety guard:
1. **Layer 1 (Cucumber AST Tag Inheritance):** Uses the official `@cucumber/gherkin` (`Parser`, `AstBuilder`, `compile`) and `@cucumber/messages` (`IdGenerator`) to compile feature documents into Cucumber scenario pickles with 100% parity to Cucumber's runtime tag filter (`@smoke and not @mutating`). Any scenario bearing or inheriting both `@smoke` and `@mutating` is rejected.
2. **Layer 2 (Mutation Operation Inspection):** Inspects all steps within `@smoke` scenarios against domain operation mappings (`KNOWN_STEP_OPERATIONS`) and heuristic keywords. Rejects smoke scenarios that invoke side-effecting GraphQL mutations (`tokenCreate`, `checkoutCreate`, `checkoutShippingAddressUpdate`, `checkoutDeliveryMethodUpdate`, `transactionCreate`, `checkoutComplete`).

## 1. Changes Implemented

### Core Scripts & Dual-Control Safety Guard

- [`scripts/check-smoke-safety.ts`](file:///d:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/saleor-graphql-automation/scripts/check-smoke-safety.ts):
  - Integrated `@cucumber/gherkin` and `@cucumber/messages` AST compilation.
  - Defined `KNOWN_STEP_OPERATIONS` covering catalogue queries, user profile queries, authentication mutations, and checkout transaction mutations.
  - Implemented `findMutatingStep(stepText)` with keyword heuristic fallback.
  - Implemented `parseFeatureTags(content, filename)` returning `ScenarioTagInfo` objects with scenario name, compiled tags, and step texts.
  - Implemented `validateSmokeSafety(featuresDir)` executing dual-control validation across feature files.

### Unit Test Suite Expansion

- [`tests/unit/smoke-safety.spec.ts`](file:///d:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/saleor-graphql-automation/tests/unit/smoke-safety.spec.ts):
  - Expanded from 2 basic tests to 12 targeted smoke-safety tests across 3 sub-suites:
    - **Layer 1: Tag Inheritance & Scenario Tag Parsing**: verifies scenario-level tags, Feature-level `@mutating` inheritance, Rule-level `@mutating` inheritance, and Scenario Outline / Examples table tag inheritance down to generated pickles.
    - **Layer 2: Step Mutation Detection**: verifies detection of known mutations (`tokenCreate`, `checkoutCreate`, `checkoutShippingAddressUpdate`, `transactionCreate`, `checkoutComplete`), permit of read-only queries and assertions, and heuristic keyword detection.
    - **Dual-Control Safety Validation**: verifies isolated directory violation checks for inherited tags, isolated directory violation checks for mutating steps, clean feature pass, and 0 violations across active workspace feature files.

## 2. Verification & Test Evidence

### Complete Verification Gate (`npm run verify`)

```text
> saleor-graphql-automation@0.1.0 verify
> npm run typecheck && npm run test:unit && npm run check:smoke-safety && npm run test:contract && npm run test:smoke && npm run test:api

> saleor-graphql-automation@0.1.0 typecheck
> tsc --noEmit

> saleor-graphql-automation@0.1.0 test:unit
> tsx --test tests/unit/**/*.spec.ts

▶ CallGraphQL Ability (Unit Tests)
  ✔ initialises with default endpoint and headers (1.2727ms)
  ✔ manages auth tokens correctly (0.2832ms)
  ✔ executes GraphQL query and captures data & latency (23.5751ms)
  ✔ injects Bearer token into headers when auth token is present (0.4453ms)
  ✔ captures GraphQL errors and exposes error helpers (0.5182ms)
  ✔ handles network transport failure gracefully without unhandled rejection (0.4091ms)
✔ CallGraphQL Ability (Unit Tests) (27.9324ms)
▶ Stateful checkout mock
  ✔ returns the Saleor billing-address error before checkout completion (108.1414ms)
✔ Stateful checkout mock (176.4013ms)
▶ Smoke Safety Policy Guard (NFR-6 & TRIAGE-01)
  ▶ Layer 1: Tag Inheritance & Scenario Tag Parsing
    ✔ identifies @smoke and @mutating tags on individual scenarios (6.4723ms)
    ✔ inherits @mutating tag from Feature level down to all scenarios (1.6524ms)
    ✔ inherits @mutating tag from Rule level down to scenarios within the Rule (2.6116ms)
    ✔ inherits tags from Scenario Outline and Examples tables down to generated pickles (2.8887ms)
  ✔ Layer 1: Tag Inheritance & Scenario Tag Parsing (15.0203ms)
  ▶ Layer 2: Step Mutation Detection (findMutatingStep)
    ✔ detects known GraphQL mutation steps (1.9455ms)
    ✔ permits known read-only queries and assertion steps (0.4376ms)
    ✔ identifies mutation keywords via fallback heuristic (0.6004ms)
    ✔ has step operations configured for all critical domain workflows (0.3579ms)
  ✔ Layer 2: Step Mutation Detection (findMutatingStep) (4.0463ms)
  ▶ Dual-Control Safety Validation (validateSmokeSafety)
    ✔ detects violations when a scenario inherits @mutating from Feature level (10.3558ms)
    ✔ detects violations when a smoke scenario invokes a mutating step (6.7855ms)
    ✔ passes when scenarios are strictly read-only and free of mutating tags/operations (6.402ms)
    ✔ validates that current workspace feature files have zero smoke-safety violations (4.575ms)
  ✔ Dual-Control Safety Validation (validateSmokeSafety) (28.8292ms)
✔ Smoke Safety Policy Guard (NFR-6 & TRIAGE-01) (48.8387ms)
ℹ tests 19
ℹ suites 6
ℹ pass 19
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1466.0681

> saleor-graphql-automation@0.1.0 check:smoke-safety
> tsx scripts/check-smoke-safety.ts

[check-smoke-safety] Verifying smoke scenario safety across features/...
[check-smoke-safety] Inspected 8 scenarios (3 @smoke).
[check-smoke-safety] Safety check passed: zero @smoke scenarios are tagged with @mutating or execute mutations.

> saleor-graphql-automation@0.1.0 test:contract
> tsx --test tests/contract/**/*.spec.ts

▶ Stateful checkout operation contracts (FR-2)
  ✔ SelectCheckoutVariant matches the pinned Saleor 3.23 schema (48.0824ms)
  ✔ CreateCheckout matches the pinned Saleor 3.23 schema (1.5334ms)
  ✔ UpdateCheckoutShippingAddress matches the pinned Saleor 3.23 schema (1.7847ms)
  ✔ UpdateCheckoutBillingAddress matches the pinned Saleor 3.23 schema (1.6078ms)
  ✔ UpdateCheckoutDeliveryMethod matches the pinned Saleor 3.23 schema (1.5473ms)
  ✔ CreateCheckoutTransaction matches the pinned Saleor 3.23 schema (1.4887ms)
  ✔ CompleteCheckout matches the pinned Saleor 3.23 schema (1.1549ms)
✔ Stateful checkout operation contracts (FR-2) (59.5042ms)
▶ Schema Contract & Breaking Change Diff Gate (FR-4)
  ✔ validates that the baseline schema is self-consistent with zero breaking changes (379.3586ms)
  ▶ Bidirectional Proof Tests (Simulated Breaking Changes)
    ✔ detects breaking change when an existing field is removed (4.9286ms)
    ✔ detects breaking change when a field return type changes incompatibly (3.701ms)
    ✔ detects breaking change when a non-nullable argument is added to an existing field (4.4924ms)
    ✔ permits non-breaking changes such as adding a nullable field or optional argument (1.961ms)
  ✔ Bidirectional Proof Tests (Simulated Breaking Changes) (15.7544ms)
✔ Schema Contract & Breaking Change Diff Gate (FR-4) (396.6922ms)
ℹ tests 12
ℹ suites 3
ℹ pass 12
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1360.1303

> saleor-graphql-automation@0.1.0 test:smoke
> node --import tsx ./node_modules/@cucumber/cucumber/bin/cucumber.js --profile smoke

[Cucumber Hooks] Started local test SUT at http://127.0.0.1:57938/graphql/
[Cucumber Hooks] Closed local test SUT.
3 scenarios (3 passed)
11 steps (11 passed)
0m00.373s (executing steps: 0m00.226s)

> saleor-graphql-automation@0.1.0 test:api
> node --import tsx ./node_modules/@cucumber/cucumber/bin/cucumber.js --profile api

[Cucumber Hooks] Started local test SUT at http://127.0.0.1:57940/graphql/
[Checkout Evidence] Order #21: status=UNFULFILLED, paymentStatus=FULLY_CHARGED, chargeStatus=FULL, total=29.18 USD
[Cucumber Hooks] Closed local test SUT.
8 scenarios (8 passed)
34 steps (34 passed)
0m00.642s (executing steps: 0m00.567s)
```

### Quality Gate Summary

| Gate / Command | Status | Metrics | Duration |
|---|---|---|---|
| `npm run typecheck` | PASS | 0 TypeScript errors | 2.5s |
| `npm run test:unit` | PASS | 19/19 passed across 6 suites | 1.47s |
| `npm run check:smoke-safety` | PASS | 8 scenarios (3 @smoke), 0 violations | 0.8s |
| `npm run test:contract` | PASS | 12/12 passed across 3 suites | 1.36s |
| `npm run test:smoke` | PASS | 3/3 scenarios, 11/11 steps passed | 0.37s |
| `npm run test:api` | PASS | 8/8 scenarios, 34/34 steps passed | 0.64s |
| **`npm run verify`** | **PASS** | **All 6 quality gates passed** | **~6.8s** |
| GitHub Actions Run `34717145719` | PASS | CI Verify job completed green | 18s |

## 3. Merged Pull Requests & Artifacts

- **Project PR:** [`saleor-graphql-automation` PR #4](https://github.com/GBrooks1970/saleor-graphql-automation/pull/4) — merged via squash as commit [`f037e79`](https://github.com/GBrooks1970/saleor-graphql-automation/commit/f037e79).
- **Portfolio Worklist PR:** [`test-automation-portfolio` PR #202](https://github.com/GBrooks1970/test-automation-portfolio/pull/202) — merged via squash as commit [`94fa62a`](https://github.com/GBrooks1970/test-automation-portfolio/commit/94fa62a).
- **Worklist Updated:** [`WORKLIST_saleor-graphql-automation.md`](file:///d:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/WORKLIST_saleor-graphql-automation.md) reflects `[x] TRIAGE-01` completed.

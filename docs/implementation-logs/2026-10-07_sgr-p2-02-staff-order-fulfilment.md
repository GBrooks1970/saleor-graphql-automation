# SGR-P2-02 Staff Order Fulfilment Journey — 2026-10-07

## Session Summary

This session completed the Phase 2 Staff Order Fulfilment BDD journey (`SGR-P2-02`, FR-5). The journey implements order lookup, status verification, stock line allocation, and fulfillment creation by an authenticated staff actor. Weak types (`any[]`, `any`) were eliminated in favour of strongly-typed Screenplay Questions and mock models (`OrderDetail`, `OrderLineDetail`, `FulfillmentRecord`, `MockVariant`). The smoke safety policy guard and contract suites were updated and verified. The full offline deterministic verification gate (`npm run verify`) passed 100% cleanly.

---

## Objectives

1. ✅ Implement `SGR-P2-02` as an `@api @mutating` Screenplay BDD journey (`features/order_fulfilment.feature`).
2. ✅ Implement Screenplay Tasks `LocateOrder` and `FulfillOrder` with typed operations.
3. ✅ Implement Screenplay Questions `TheOrder` and `TheFulfillment` returning strongly-typed records without `any`.
4. ✅ Extend embedded SUT mock server with typed variant structures, `orderFulfill` mutation handling, authorization checks, and warehouse stock allocation.
5. ✅ Register the `Staff` actor with shared notepad state in Cucumber scenario hooks.
6. ✅ Add unit test suite `tests/unit/mock-fulfilment.spec.ts` validating mock fulfilment logic, permission checks, and error cases.
7. ✅ Maintain smoke safety invariant: updated `scripts/check-smoke-safety.ts` with fulfilment operations and `tests/unit/smoke-safety.spec.ts` for 9 total scenarios.
8. ✅ Pass full verification gate (`npm run verify`).

---

## Test Results

| Stack | Suite | Before | After | Status |
|---|---|---|---|---|
| Node 24 / TypeScript | Typecheck (`tsc --noEmit`) | 0 errors | 0 errors | ✅ PASS |
| Node 24 | Unit tests (`npm run test:unit`) | 39 tests / 11 suites | 43 tests / 12 suites | ✅ PASS |
| Cucumber | Smoke safety check (`npm run check:smoke-safety`) | 8 scenarios / 0 violations | 9 scenarios / 0 violations | ✅ PASS |
| GraphQL Inspector / Saleor 3.23 SDL | Contract tests (`npm run test:contract`) | 23 tests / 5 suites | 23 tests / 5 suites | ✅ PASS |
| Cucumber | Read-only smoke (`npm run test:smoke`) | 3 scenarios / 11 steps | 3 scenarios / 11 steps | ✅ PASS |
| Cucumber | Full API (`npm run test:api`) | 8 scenarios / 34 steps | 9 scenarios / 49 steps | ✅ PASS |

Deterministic verification (`npm run verify`) passed completely in ~15s on 2026-10-07.

---

## Changes Implemented

### Screenplay Domain & Tasks
- `src/screenplay/checkout/operations.ts`: Added `GetOrderDetails` query and `FulfillOrder` mutation documents and operation names.
- `src/screenplay/tasks/LocateOrder.ts`: Task for authenticated staff to retrieve order details by order ID or number and store them in notes.
- `src/screenplay/tasks/FulfillOrder.ts`: Task for staff actor to issue `orderFulfill` mutation for specified order lines and warehouse allocation.
- `src/screenplay/questions/TheOrder.ts`: Refactored to provide strongly-typed Questions (`lines(): Question<Promise<OrderLineDetail[]>>`, `fulfillments(): Question<Promise<FulfillmentRecord[]>>`, `detail(): Question<Promise<OrderDetail>>`).
- `src/screenplay/questions/TheFulfillment.ts`: Questions inspecting fulfillment count, statuses, and tracking details.
- `src/screenplay/checkout/CheckoutNotes.ts`: Added keys for order lines, fulfillment records, and active staff context.
- `src/screenplay/index.ts`: Exported new Tasks and Questions.

### BDD Features & Step Definitions
- `features/order_fulfilment.feature`: Added `@api @mutating` feature covering the end-to-end staff order fulfilment lifecycle (locating order, verifying `UNFULFILLED`, allocating warehouse stock, verifying `FULFILLED`, 1 fulfillment record, and fulfilled lines).
- `features/step_definitions/fulfilment_steps.ts`: Cucumber step definitions mapping Gherkin steps to `Staff` actor tasks and questions.
- `features/support/hooks.ts`: Registered `Staff` actor with `CallGraphQL` and shared `TakeNotes(sharedCheckoutNotes)` ability alongside `Customer` and `Admin`.

### Mock SUT & Unit Tests
- `src/mock/server.ts`: Replaced untyped variant references with `MockVariant`; implemented `orderFulfill` mutation resolver validating permissions, line existence, and warehouse allocation; transitions status from `UNFULFILLED` to `FULFILLED`.
- `tests/unit/mock-fulfilment.spec.ts`: 4 unit tests covering confirmed order querying, successful fulfilment transition, unauthenticated/non-staff rejection, and non-existent order handling.

### Smoke Safety Policy
- `scripts/check-smoke-safety.ts`: Registered `tokenCreate`, `GetOrderDetails`, and `FulfillOrder` operations in `KNOWN_STEP_OPERATIONS`.
- `tests/unit/smoke-safety.spec.ts`: Updated expected total scenarios from 8 to 9 (3 `@smoke`, 0 violations).

---

## Technical Decisions

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Share `sharedCheckoutNotes` across Customer, Admin, and Staff | Allows staff to fulfill the exact order created by Customer in multi-actor or isolated scenarios without leaking global state | Process-global state; relying on hardcoded order IDs |
| Strong typing for `OrderLineDetail` and `FulfillmentRecord` | Eliminates TypeScript `any` in Screenplay questions and mock server, adhering to production-grade quality standards | Using `any[]` or loose dictionary objects |
| Explicit warehouse allocation parameter in `FulfillOrder` | Matches Saleor 3.23 `OrderFulfillInput` schema specification | Omitting warehouse ID or hardcoding in mock |

---

## Evidence & Verification

- `npm run verify` passed cleanly with exit code 0.
- All 9 API scenarios passed (49 steps).
- Smoke safety validator inspected 9 scenarios and verified 0 violations.
- Contract tests confirmed all GraphQL documents match `schema/saleor-3.23.graphql`.

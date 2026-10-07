# Walkthrough — SGR-P2-02: Staff Order Fulfilment BDD Journey & Typing Quality

Addresses backlog item `SGR-P2-02` (FR-5 Staff Order Fulfilment) in `saleor-graphql-automation`.

---

## 1. Executive Summary

- **Objective:** Deliver the staff order fulfilment BDD journey (FR-5), introduce `Staff` actor with shared notepad state, model order querying and fulfillment operations in the Screenplay pattern, eliminate weak `any` and `any[]` typings in questions and mock models, maintain the dual-control smoke safety policy, and verify the complete test gate.
- **Branch:** `feature/sgr-p2-02-staff-order-fulfilment`
- **Backlog Item:** `SGR-P2-02` (MEDIUM priority) marked Done in canonical backlog v4 and portfolio worklist.
- **Verification Gate Status:** 100% green (`npm run verify`: typecheck clean, 43 unit tests across 12 suites, 0 smoke safety violations across 9 scenarios, 23 contract tests across 5 suites, 3 smoke scenarios / 11 steps, 9 API scenarios / 49 steps).

---

## 2. Key Changes Implemented

### 2.1 Strong Typings & Quality Improvements
- **Files:**
  - `src/screenplay/questions/TheOrder.ts`
  - `src/mock/server.ts`
- Replaced untyped `any[]` return signatures in `TheOrder`:
  - `lines()` now returns `Question<Promise<OrderLineDetail[]>>`
  - `fulfillments()` now returns `Question<Promise<FulfillmentRecord[]>>`
  - `detail()` returns `Question<Promise<OrderDetail>>`
- Replaced `variant: any` on `MockOrderLine` with typed `MockVariant` interface containing `name`, `quantityAvailable`, `pricing`, and `stocks`.

### 2.2 Screenplay Tasks and Questions
- **Files:**
  - `src/screenplay/checkout/operations.ts`
  - `src/screenplay/checkout/CheckoutNotes.ts`
  - `src/screenplay/tasks/LocateOrder.ts`
  - `src/screenplay/tasks/FulfillOrder.ts`
  - `src/screenplay/questions/TheFulfillment.ts`
  - `src/screenplay/index.ts`
- Added `GetOrderDetails` query and `FulfillOrder` mutation operation documents matching Saleor 3.23 schema.
- Added Screenplay Tasks:
  - `LocateOrder`: retrieves order details by order ID or number and stores line details in shared notepad.
  - `FulfillOrder`: issues `orderFulfill` mutation allocating warehouse lines and records fulfillment outcomes in notes.
- Added Screenplay Questions:
  - `TheFulfillment.count()`: inspects count of created fulfillments.
  - `TheFulfillment.status()`: inspects fulfillment record status.
  - `TheFulfillment.lines()`: inspects fulfilled order line allocations.

### 2.3 Actor Registration & Shared Scenario State
- **File:** `features/support/hooks.ts`
- Registered the `Staff` actor alongside `Customer` and `Admin`.
- Equipped `Staff` with `CallGraphQL` and shared `TakeNotes(sharedCheckoutNotes)` ability so orders created in customer flows can be located and fulfilled by staff without leaking cross-scenario state.

### 2.4 BDD Feature & Step Definitions
- **Files:**
  - `features/order_fulfilment.feature`
  - `features/step_definitions/fulfilment_steps.ts`
- Added `@api @mutating` feature covering the end-to-end staff order fulfilment lifecycle:
  - Staff logs in with staff credentials.
  - Staff locates the confirmed order.
  - Verifies order status is initially `UNFULFILLED` with unfulfilled lines.
  - Allocates warehouse stock and submits fulfillment.
  - Verifies order transitions to `FULFILLED` with 1 fulfillment record and fulfilled line allocations.
- Implemented corresponding Cucumber step definitions using Screenplay Tasks and Questions.

### 2.5 Mock SUT Server & Unit Tests
- **Files:**
  - `src/mock/server.ts`
  - `tests/unit/mock-fulfilment.spec.ts`
- Extended embedded SUT mock server to support `orderFulfill` mutation:
  - Validates staff authentication and permissions.
  - Validates order existence and line IDs.
  - Decrements available warehouse stock and creates fulfillment records.
  - Updates order status to `FULFILLED`.
- Created unit test suite with 4 tests covering positive fulfillment, order details query, unauthenticated/non-staff rejection, and non-existent order error handling.

### 2.6 Smoke Safety Policy Guard
- **Files:**
  - `scripts/check-smoke-safety.ts`
  - `tests/unit/smoke-safety.spec.ts`
- Registered `tokenCreate`, `GetOrderDetails`, and `FulfillOrder` in `KNOWN_STEP_OPERATIONS`.
- Updated expected total scenario count from 8 to 9 (3 `@smoke`, 0 violations), ensuring that mutating fulfilment steps cannot inadvertently leak into smoke runs.

---

## 3. Verification & Validation Evidence

### 3.1 Typecheck
```
> saleor-graphql-automation@0.1.0 typecheck
> tsc --noEmit
```
Completed with 0 errors (exit code 0).

### 3.2 Unit Test Suite (`npm run test:unit`)
Expanded from 39 to 43 unit tests across 12 suites:
```
▶ Staff order fulfilment mock (FR-5)
  ✔ queries confirmed order details with lines and stock info (919.8159ms)
  ✔ allows authenticated staff to fulfill an order and transition status to FULFILLED (521.4336ms)
  ✔ rejects order fulfilment when actor is unauthenticated or not staff (577.1786ms)
  ✔ returns error when fulfilling an order that does not exist (82.0557ms)
✔ Staff order fulfilment mock (FR-5) (2298.9768ms)
ℹ tests 43
ℹ suites 12
ℹ pass 43
ℹ fail 0
```

### 3.3 Smoke Safety Policy Check (`npm run check:smoke-safety`)
```
[check-smoke-safety] Verifying smoke scenario safety across features/...
[check-smoke-safety] Inspected 9 scenarios (3 @smoke).
[check-smoke-safety] Safety check passed: zero @smoke scenarios are tagged with @mutating or execute mutations.
```

### 3.4 Contract Tests (`npm run test:contract`)
```
▶ Stateful checkout operation contracts (FR-2)
  ✔ SelectCheckoutVariant matches the pinned Saleor 3.23 schema
  ✔ CreateCheckout matches the pinned Saleor 3.23 schema
  ✔ UpdateCheckoutShippingAddress matches the pinned Saleor 3.23 schema
  ✔ UpdateCheckoutBillingAddress matches the pinned Saleor 3.23 schema
  ✔ UpdateCheckoutDeliveryMethod matches the pinned Saleor 3.23 schema
  ✔ CreateCheckoutTransaction matches the pinned Saleor 3.23 schema
  ✔ CompleteCheckout matches the pinned Saleor 3.23 schema
  ✔ GetOrderDetails matches the pinned Saleor 3.23 schema
  ✔ FulfillOrder matches the pinned Saleor 3.23 schema
✔ Stateful checkout operation contracts (FR-2)
ℹ tests 23
ℹ suites 5
ℹ pass 23
ℹ fail 0
```

### 3.5 Cucumber Smoke Profile (`npm run test:smoke`)
```
3 scenarios (3 passed)
11 steps (11 passed)
0m00.851s (executing steps: 0m00.687s)
```

### 3.6 Cucumber Full API Profile (`npm run test:api`)
Expanded from 8 to 9 scenarios (49 steps):
```
[Cucumber Hooks] Started local test SUT at http://127.0.0.1:53253/graphql/
[Checkout Evidence] Order #21: status=UNFULFILLED, paymentStatus=FULLY_CHARGED, chargeStatus=FULL, total=29.18 USD
[Cucumber Hooks] Closed local test SUT.
9 scenarios (9 passed)
49 steps (49 passed)
0m02.243s (executing steps: 0m01.918s)
```

---

## 4. Documentation Updates

- `docs/backlog.md`: Bumped to v4, marked `SGR-P2-02` as `Done`, and added detailed item description.
- `docs/implementation-logs/2026-10-07_sgr-p2-02-staff-order-fulfilment.md`: Authored implementation and test log.
- `../WORKLIST_saleor-graphql-automation.md`: Marked `SGR-P2-02` as `[x]` with delivered outcome and updated backlog counts (12 Done, 2 Backlog).

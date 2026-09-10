# SGR-P2-01 Stateful Checkout Journey — 2026-09-08

## Session Summary

This session implemented the Phase 2 stateful checkout journey from purchasable variant discovery through address assignment, delivery selection, staff-authorised transaction recording, and order completion. The deterministic embedded SUT, pinned-schema contracts, smoke boundary, and fail-closed live-endpoint guard are green. Live execution against the pinned Docker SUT remains deferred because the shared Docker Desktop Linux engine returned HTTP 503 before any project containers could be inspected or started; the backlog item therefore remains In Progress.

---

## Objectives

1. ✅ Implement `SGR-P2-01` as an `@api @mutating` Screenplay BDD journey.
2. ✅ Validate every checkout GraphQL document against the pinned Saleor 3.23 schema.
3. ✅ Extend the embedded SUT with isolated checkout state and the mandatory billing-address failure.
4. ✅ Separate deterministic evidence from live evidence and make explicit live endpoints fail closed.
5. ⏸️ Execute the checkout against the pinned live Docker SUT — deferred because Docker Desktop returned HTTP 503; no daemon restart was attempted.

---

## Test Results

| Stack | Suite | Before | After | Status |
|---|---|---|---|---|
| Node 24 / TypeScript | Typecheck | 0 errors | 0 errors | ✅ PASS |
| Node 24 | Unit tests | 8/8 | 9/9 | ✅ PASS |
| GraphQL Inspector / Saleor 3.23 SDL | Contract tests | 5/5 | 12/12 | ✅ PASS |
| Cucumber | Smoke safety | 7 scenarios inspected; 3 smoke | 8 scenarios inspected; 3 smoke; 0 violations | ✅ PASS |
| Cucumber | Read-only smoke | 3 scenarios / 11 steps | 3 scenarios / 11 steps | ✅ PASS |
| Cucumber | Full API | 7 scenarios / 25 steps | 8 scenarios / 34 steps | ✅ PASS |
| Cucumber | Targeted checkout | Not present | 1 scenario / 9 steps | ✅ PASS |
| Cucumber | Explicit unavailable endpoint | Silent mock fallback possible | Expected exit 1 with endpoint-unhealthy error | ✅ PASS |
| Docker / Saleor 3.23 | Live checkout | Phase 0 probe only | Not run; engine HTTP 503 | ⏸️ DEFERRED |

The deterministic results above came from `npm run verify` and `npm run test:checkout` on 2026-09-08. The expected-failure probe set `SALEOR_GRAPHQL_URL=http://127.0.0.1:1/graphql/` and exited 1 before scenario execution, proving that explicit live targets no longer fall back to the mock.

---

## Changes Implemented

### Stateful Screenplay Checkout Model

**Files changed:**
- `src/screenplay/checkout/CheckoutNotes.ts` — introduced typed, scenario-scoped state shared by Customer and Admin.
- `src/screenplay/checkout/GraphQLOperation.ts` — centralised HTTP, top-level GraphQL, and domain-error validation.
- `src/screenplay/checkout/operations.ts` — defined variant discovery and the six Saleor 3.23 checkout operations.
- `src/screenplay/tasks/SelectCheckoutVariant.ts` — selects an in-stock, priced variant without relying on a fixed seed ID.
- `src/screenplay/tasks/CreateCheckout.ts`, `SetCheckoutShippingAddress.ts`, `SetCheckoutBillingAddress.ts`, `SelectCheckoutDeliveryMethod.ts`, `RecordCheckoutTransaction.ts`, and `CompleteCheckout.ts` — implemented the business operation sequence.
- `src/screenplay/questions/TheCheckout.ts` and `TheOrder.ts` — exposed typed checkout and order evidence.
- `features/support/hooks.ts` — provides Customer and Admin with a shared fresh notepad for every scenario.

### BDD Journey and Safety Boundary

**Files changed:**
- `features/checkout_stateful.feature` — added one `@api @mutating` checkout scenario with nine steps.
- `features/step_definitions/checkout_steps.ts` — mapped business steps to Screenplay Tasks, Admin authentication, and final order assertions.
- `src/screenplay/index.ts` and `src/screenplay/actors/index.ts` — exported and provisioned the new Screenplay vocabulary.

### Deterministic SUT and Contract Proof

**Files changed:**
- `src/mock/server.ts` — added product variants, checkout state, addresses, delivery, staff-only transactions, order completion, and typed negative outcomes.
- `tests/unit/mock-checkout.spec.ts` — proved that completion without a billing address returns `BILLING_ADDRESS_NOT_SET`.
- `tests/contract/checkout-operations.spec.ts` — proved all seven GraphQL documents validate against `schema/saleor-3.23.graphql`.
- `package.json` — added targeted checkout and pinned Docker lifecycle commands.

### Honest Live-SUT Routing

**Files changed:**
- `features/support/hooks.ts` — now throws when an explicitly configured endpoint is unhealthy; automatic mock fallback remains available only when no endpoint was explicitly supplied.
- `docs/live-sut-validation.md` — documented storage, bootstrap, credentials, execution, evidence, and non-destructive teardown rules.

---

## Technical Decisions

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| ADR-008: share a typed scenario-scoped Serenity/JS Notepad between Customer and Admin | Preserves the actor boundary without coupling domain state to `CallGraphQL` or process-global variables | Expanding the transport Ability; untyped Cucumber World state; module globals |
| ADR-009: require deterministic, schema-contract, and separate live-SUT evidence | Keeps CI fast while preventing mock success from being reported as live Saleor compatibility | Docker-only CI; mock-only acceptance; silent fallback from explicit endpoints |
| Discover a purchasable variant at runtime | Supports repeated and reseeded runs without depending on the Phase 0 variant ID | Hard-coded seed variant IDs |

---

## Documentation Updates

- `docs/backlog.md` — advanced to v2, marked SGR-P2-01 In Progress, and added explicit acceptance criteria and evidence boundaries.
- `docs/decision-register.md` — added ADR-008 and ADR-009.
- `docs/live-sut-validation.md` — added the pinned live-SUT acceptance procedure.
- `design-document.md` — advanced the project status from Phase 1 to active Phase 2.
- `README.md` — documented the checkout capability, deterministic gate, live procedure, and new commands.

---

## Lessons Learned

- A fallback SUT is safe only when the evidence clearly says which implementation ran; explicit endpoints must fail closed.
- Validating operation documents directly against the pinned SDL catches real Saleor interface drift without paying the cost of a Docker bootstrap on every CI run.
- A shared Serenity/JS Notepad provides a clean cross-actor state boundary when one business journey requires both customer and privileged staff operations.
- The previously proven live bootstrap remains operationally expensive, so seeded volumes should be preserved and destroyed only deliberately.

---

## Recommendations / Next Steps

- [ ] Complete `SGR-P2-01` live acceptance after restoring Docker Desktop, recording the created order number and fully charged statuses — HIGH.
- [ ] Implement `SGR-P2-03` latency telemetry and typed error categorisation across the new multi-operation journey — MEDIUM.
- [ ] Implement `SGR-P2-02` as an independently seeded staff fulfilment journey — MEDIUM.
- [ ] Implement `SGR-P3-01` living documentation and Pages, followed by `SGR-P3-02` scheduled schema drift monitoring — LOW.

---

*Session logged: 2026-09-08. Author: Codex.*

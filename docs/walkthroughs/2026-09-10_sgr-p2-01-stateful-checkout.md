# Walkthrough — SGR-P2-01 Stateful Checkout and Live Acceptance

## Executive Summary

SGR-P2-01 delivers a business-readable, stateful Saleor 3.23 checkout journey across Customer and Admin actors, backed by offline schema contracts and an isolated embedded SUT. The completed batch also proves the journey against the pinned local Docker SUT: explicit live execution created order `#22` with `UNFULFILLED`, `FULLY_CHARGED`, and `FULL` statuses. A post-bootstrap defect in implicit SUT selection was corrected so `npm run verify` remains deterministic even while the live stack is healthy.

## 1. Changes Implemented

### Business Journey and Screenplay Model

- [features/checkout_stateful.feature](file:///D:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/saleor-graphql-automation/features/checkout_stateful.feature) defines the nine-step `@api @mutating` checkout scenario.
- [features/step_definitions/checkout_steps.ts](file:///D:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/saleor-graphql-automation/features/step_definitions/checkout_steps.ts) maps the business flow to Customer and Admin Screenplay actions and records the final order evidence.
- [src/screenplay/checkout/CheckoutNotes.ts](file:///D:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/saleor-graphql-automation/src/screenplay/checkout/CheckoutNotes.ts) defines typed, scenario-scoped state shared across the two actors.
- [src/screenplay/checkout/GraphQLOperation.ts](file:///D:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/saleor-graphql-automation/src/screenplay/checkout/GraphQLOperation.ts) centralises transport, GraphQL, and Saleor domain-error handling.
- [src/screenplay/checkout/operations.ts](file:///D:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/saleor-graphql-automation/src/screenplay/checkout/operations.ts) owns the seven schema-validated checkout documents.
- [src/screenplay/actors/index.ts](file:///D:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/saleor-graphql-automation/src/screenplay/actors/index.ts) provisions actors with the abilities required by the new workflow.
- [src/screenplay/index.ts](file:///D:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/saleor-graphql-automation/src/screenplay/index.ts) exports the checkout vocabulary through the package boundary.
- [src/screenplay/tasks/SelectCheckoutVariant.ts](file:///D:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/saleor-graphql-automation/src/screenplay/tasks/SelectCheckoutVariant.ts) discovers an in-stock, priced variant instead of relying on a fixed seed identifier.
- [src/screenplay/tasks/CreateCheckout.ts](file:///D:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/saleor-graphql-automation/src/screenplay/tasks/CreateCheckout.ts) creates an isolated checkout with a unique customer email.
- [src/screenplay/tasks/SetCheckoutShippingAddress.ts](file:///D:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/saleor-graphql-automation/src/screenplay/tasks/SetCheckoutShippingAddress.ts) supplies the delivery address and records available delivery data.
- [src/screenplay/tasks/SetCheckoutBillingAddress.ts](file:///D:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/saleor-graphql-automation/src/screenplay/tasks/SetCheckoutBillingAddress.ts) satisfies Saleor's mandatory billing-address rule.
- [src/screenplay/tasks/SelectCheckoutDeliveryMethod.ts](file:///D:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/saleor-graphql-automation/src/screenplay/tasks/SelectCheckoutDeliveryMethod.ts) selects an available method discovered from checkout state.
- [src/screenplay/tasks/RecordCheckoutTransaction.ts](file:///D:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/saleor-graphql-automation/src/screenplay/tasks/RecordCheckoutTransaction.ts) records the checkout total through the staff-authorised Transaction API.
- [src/screenplay/tasks/CompleteCheckout.ts](file:///D:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/saleor-graphql-automation/src/screenplay/tasks/CompleteCheckout.ts) completes the checkout and records the resulting order.
- [src/screenplay/questions/TheCheckout.ts](file:///D:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/saleor-graphql-automation/src/screenplay/questions/TheCheckout.ts) exposes typed checkout evidence to assertions.
- [src/screenplay/questions/TheOrder.ts](file:///D:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/saleor-graphql-automation/src/screenplay/questions/TheOrder.ts) exposes the final order, payment, and charge state.

### Deterministic and Contract Test Infrastructure

- [src/mock/server.ts](file:///D:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/saleor-graphql-automation/src/mock/server.ts) adds isolated product, checkout, delivery, transaction, and order behaviour to the embedded GraphQL SUT.
- [tests/unit/mock-checkout.spec.ts](file:///D:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/saleor-graphql-automation/tests/unit/mock-checkout.spec.ts) proves the mandatory billing-address failure path.
- [tests/contract/checkout-operations.spec.ts](file:///D:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/saleor-graphql-automation/tests/contract/checkout-operations.spec.ts) validates all seven checkout documents against the pinned Saleor 3.23 schema.
- [features/support/hooks.ts](file:///D:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/saleor-graphql-automation/features/support/hooks.ts) creates fresh shared notes per scenario and now treats live execution as explicit opt-in.
- [package.json](file:///D:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/saleor-graphql-automation/package.json) adds targeted checkout and non-destructive Docker lifecycle commands.

The critical SUT-selection correction changed the default from an environment-dependent localhost probe to deterministic embedded execution:

```ts
const explicitTargetUrl = process.env.SALEOR_GRAPHQL_URL;

if (!explicitTargetUrl) {
  mockServerHandle = await startMockServer(0);
  process.env.SALEOR_GRAPHQL_URL = mockServerHandle.url;
  return;
}
```

An explicit URL is still health-checked and fails before scenario execution when unavailable.

### Architecture, Operations, and Evidence

- [README.md](file:///D:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/saleor-graphql-automation/README.md) documents the checkout capability, commands, and explicit live-SUT boundary.
- [design-document.md](file:///D:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/saleor-graphql-automation/design-document.md) advances the documented architecture to active Phase 2.
- [docs/backlog.md](file:///D:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/saleor-graphql-automation/docs/backlog.md) advances to v3 and marks SGR-P2-01 Done with linked evidence.
- [docs/decision-register.md](file:///D:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/saleor-graphql-automation/docs/decision-register.md) records ADR-008 for cross-actor notes and ADR-009 for deterministic versus live evidence.
- [docs/live-sut-validation.md](file:///D:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/saleor-graphql-automation/docs/live-sut-validation.md) provides the safe bootstrap, seed, readiness, acceptance, and teardown procedure.
- [docs/implementation-logs/2026-09-08_sgr-p2-01-stateful-checkout.md](file:///D:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/saleor-graphql-automation/docs/implementation-logs/2026-09-08_sgr-p2-01-stateful-checkout.md) records the feature implementation and initially deferred live gate.
- [docs/implementation-logs/2026-09-10_sgr-p2-01-live-acceptance-closure.md](file:///D:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/saleor-graphql-automation/docs/implementation-logs/2026-09-10_sgr-p2-01-live-acceptance-closure.md) records Docker recovery, live evidence, the discovered routing defect, and closure.

## 2. Verification & Test Evidence

| Command | Quality Gate / Suite | Status | Metrics (Passed/Total) | Duration |
|---|---|---|---|---|
| `npm run verify` | Complete deterministic project gate | PASS | Typecheck 0 errors; unit 9/9; contract 12/12; smoke 3/3 scenarios and 11/11 steps; API 8/8 scenarios and 34/34 steps | 19.935s wall time |
| `npm audit --audit-level=high` | Dependency security audit | PASS | 0 vulnerabilities | 3.915s wall time |
| `npm run sut:wait` | Pinned Saleor GraphQL readiness | PASS | Healthy GraphQL response | 14.6s |
| `npm run test:checkout` with explicit local URL | Live Saleor acceptance | PASS | 1/1 scenario; 9/9 steps; order `#22` fully charged | 5.889s Cucumber duration |
| `npm run test:checkout` with `http://127.0.0.1:1/graphql/` | Explicit-target fail-closed probe | PASS | Expected exit 1 before scenario execution | 4.613s wall time |
| GitHub Actions run `34510166134` | PR #2 CI | PASS | Verify job completed successfully for `e8d7dd2` | 19s |

Reproduction evidence:

```text
VERIFY_EXIT=0
VERIFY_WALL_SECONDS=19.935
tests 9; pass 9; fail 0
tests 12; pass 12; fail 0
3 scenarios (3 passed); 11 steps (11 passed)
8 scenarios (8 passed); 34 steps (34 passed)
```

```text
[Checkout Evidence] Order #22: status=UNFULFILLED,
paymentStatus=FULLY_CHARGED, chargeStatus=FULL, total=29.18 USD
1 scenario (1 passed)
9 steps (9 passed)
```

```text
found 0 vulnerabilities
AUDIT_EXIT=0
AUDIT_WALL_SECONDS=3.915
```

## 3. Operational State & Invariants

- Evidence branch: `codex/sgr-p2-01-live-closure` at `e8d7dd2`; it was clean with `ahead=0` and `behind=0` relative to its upstream before this walkthrough was authored.
- Implementation PR #1 merged to `main` as `f771496`; closure PR #2 was open, mergeable, and had successful CI run `34510166134` when evidence was gathered.
- Docker Desktop used the `desktop-linux` context. Its configured WSL data directory was `E:\_DockerData\DockerDesktopWSL`, satisfying the workspace storage invariant.
- The pinned `api`, `worker`, `db`, and `cache` services were all running. Seeded volumes `docker_saleor-db`, `docker_saleor-cache`, and `docker_saleor-media` were preserved.
- Deterministic verification ran against fresh ephemeral `127.0.0.1` embedded endpoints even while the live API remained healthy on port 8000.
- The `@smoke and not @mutating` safety policy inspected eight scenarios, three tagged smoke, with zero violations.
- Documentation uses en-GB spelling, and project history remains separate from the root-tracked worklist history.

## 4. Recommended Next Actions

1. **Recommended:** merge project PR #2, then merge root control PR #193 so code, backlog, evidence, and worklist land in dependency order.
2. Verify both exact merge commits and CI, fast-forward the two repositories, and prune only the merged SGR-P2-01 closure branches.
3. Review the merged Saleor repository against backlog v3 and triage any concrete findings before beginning another implementation item.
4. Write the next Saleor handover pair so a successor starts from the completed live gate and the remaining Phase 2 backlog.

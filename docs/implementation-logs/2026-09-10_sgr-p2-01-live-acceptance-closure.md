# SGR-P2-01 Live Acceptance and Closure — 2026-09-10

## Session Summary

This session completed the live Saleor 3.23 acceptance gate deferred by the implementation recorded on 2026-09-08. The pinned Docker SUT was bootstrapped on the configured `E:\_DockerData` storage, and the merged checkout journey created fully charged orders in two successful live runs. A full verification attempt then exposed and fixed an environment-dependent SUT-selection defect, after which the deterministic and explicit-live gates both passed and SGR-P2-01 was marked Done.

---

## Objectives

1. ✅ Bootstrap and verify the pinned Saleor 3.23 Docker SUT without deleting its seeded volumes.
2. ✅ Execute SGR-P2-01 against the explicit live GraphQL endpoint and record the resulting order evidence.
3. ✅ Preserve `npm run verify` as a deterministic embedded-SUT gate even while the local Docker SUT is healthy.
4. ✅ Reconcile the canonical backlog with the completed implementation and empirical evidence.

---

## Test Results

| Stack | Suite | Before | After | Status |
|---|---|---|---|---|
| Docker Desktop / Saleor 3.23 | Clean SUT bootstrap | Deferred: Docker engine HTTP 503 | Migrations applied; sample data and `admin@example.com` seeded; GraphQL readiness passed in 14.6s | ✅ PASS |
| Cucumber / explicit live Saleor | `npm run test:checkout` | Not run against the Phase 2 implementation | 1/1 scenario; 9/9 steps; order `#22`, `UNFULFILLED`, `FULLY_CHARGED`, charge `FULL`, `29.18 USD` | ✅ PASS |
| Node 24 / TypeScript | Typecheck | 0 errors | 0 errors | ✅ PASS |
| Node 24 | Unit tests | 9/9 | 9/9 | ✅ PASS |
| GraphQL Inspector / Saleor 3.23 SDL | Contract tests | 12/12 | 12/12 | ✅ PASS |
| Cucumber | Smoke safety | 8 scenarios inspected; 3 smoke; 0 violations | 8 scenarios inspected; 3 smoke; 0 violations | ✅ PASS |
| Cucumber / embedded SUT | Read-only smoke | 3/3 scenarios; 11/11 steps | 3/3 scenarios; 11/11 steps | ✅ PASS |
| Cucumber / embedded SUT | Full API | First post-bootstrap attempt incorrectly selected live Saleor: 3/8 scenarios passed, 18/34 steps passed | 8/8 scenarios; 34/34 steps | ✅ PASS |
| Cucumber / explicit unavailable endpoint | Fail-closed probe | Expected exit 1 before scenario execution | Exit 1 with `Explicit Saleor SUT is unavailable or unhealthy` | ✅ PASS |

The final `npm run verify` command exited 0 while all four Docker services remained running. Its Cucumber hooks logged fresh `127.0.0.1` embedded endpoints for both smoke and API suites, proving that the deterministic gate no longer depends on whether Saleor occupies port 8000. The final explicit-live `npm run test:checkout` command also exited 0 and produced order `#22`; an earlier pre-fix live run independently produced order `#21` with the same statuses and total.

---

## Changes Implemented

### Deterministic SUT Selection

**Files changed:**
- `features/support/hooks.ts` — changed the default path to start the embedded SUT immediately when `SALEOR_GRAPHQL_URL` is absent. Explicit URLs are still health-checked and fail closed when unavailable.

Before this correction, a healthy Saleor process on the conventional localhost port was selected implicitly. That made `npm run verify` execute against live fixtures and fail five of eight API scenarios after the clean bootstrap, despite the gate being documented and designed as deterministic.

### SGR-P2-01 Evidence Closure

**Files changed:**
- `docs/backlog.md` — advanced the backlog to v3, marked SGR-P2-01 Done, and linked the implementation and closure logs.
- `README.md` — clarified that live execution is opt-in through `SALEOR_GRAPHQL_URL` and that the default verification path is embedded.
- `docs/live-sut-validation.md` — aligned the live procedure with the corrected deterministic boundary.
- `docs/implementation-logs/2026-09-10_sgr-p2-01-live-acceptance-closure.md` — recorded the bootstrap, failed diagnostic run, correction, and final evidence.

---

## Technical Decisions

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Require an explicit `SALEOR_GRAPHQL_URL` for every live-SUT run | Enforces the existing ADR-009 evidence boundary and makes `npm run verify` invariant to unrelated local services | Probing localhost and selecting any healthy Saleor instance implicitly; stopping Docker before every deterministic run |
| Preserve the newly seeded Docker volumes after acceptance | Makes subsequent live acceptance runs fast and follows the documented non-destructive lifecycle | `docker compose down -v`, which would discard the proven fixture |

No new ADR was created because the routing correction enforces ADR-009 rather than introducing a new structural decision.

---

## Documentation Updates

- `docs/backlog.md` — marked SGR-P2-01 Done and linked its complete evidence chain.
- `README.md` — corrected the deterministic/live selection description.
- `docs/live-sut-validation.md` — stated the explicit opt-in boundary for live testing.
- `docs/implementation-logs/2026-09-10_sgr-p2-01-live-acceptance-closure.md` — added this immutable closure record.

---

## Lessons Learned

- A default localhost probe is not deterministic: the result changes when a developer starts or stops an otherwise valid service.
- Running the deterministic gate while the live stack remains healthy is a stronger isolation check than validating the two paths sequentially after stopping Docker.
- Live acceptance should record domain outcomes such as order, payment and charge states, not merely an HTTP or process exit code.

---

## Recommendations / Next Steps

- [ ] Implement SGR-P2-03 latency telemetry and typed error categorisation across the multi-operation checkout journey — MEDIUM.
- [ ] Implement SGR-P2-02 as an independently seeded staff fulfilment journey — MEDIUM.
- [ ] Preserve the seeded Saleor volumes; use `npm run sut:down` when the local stack is no longer needed — operational.

---

*Session logged: 2026-09-10. Author: Codex.*

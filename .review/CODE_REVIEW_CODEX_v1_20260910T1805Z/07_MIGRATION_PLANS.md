# Migration Plans

[<- Back to Index](00_CODE_REVIEW_CODEX_v1_20260910T1805Z.md) | [Previous: Architecture Assessment](06_ARCHITECTURE_ASSESSMENT.md)

**Reviewer:** AI assistant (Codex GPT-5)

## Plan 1 - Establish a Reliable Schema Source of Truth

1. Capture introspection from the exact pinned Saleor digest and document the generator version and command.
2. Normalise or explicitly classify built-in directive differences, with regression fixtures for the five differences observed in this review.
3. Change explicit live-schema fetch failures from self-comparison fallback to a non-zero result.
4. Add `check:schema:live` separately from the deterministic PR gate.
5. Run it in a Docker-backed or scheduled SGR-P3-02 workflow and publish the diff as an artefact.
6. Require reviewed baseline promotion after intentional Saleor upgrades.

## Plan 2 - Harden Docker Compose for Local Development

1. Pin Valkey to an approved immutable digest.
2. Bind the Saleor API to loopback and remove or loopback-bind PostgreSQL and Valkey host ports.
3. Mark fixture passwords and `SECRET_KEY` as development-only in the runbook.
4. Add service health checks and make API/worker depend on healthy database/cache services.
5. Define measured warm readiness separately from clean migration and seed bootstrap.
6. Re-run compose validation, readiness, explicit live checkout, and storage-location checks.

## Plan 3 - Strengthen CI and Reporting

1. Upgrade checkout/setup action majors to supported Node.js 24 runtimes.
2. Keep `npm ci` and `npm run verify` as the single deterministic PR gate.
3. Add regression tests for inherited Gherkin tags and actual mutation exclusion.
4. Implement SGR-P2-03 timeout and typed-error tests before expanding the live journey set.
5. Decide whether to configure Serenity living documentation under SGR-P3-01 or remove unused packages.
6. Add scheduled dependency review for major upgrades while retaining `npm audit` in evidence collection.

---

[<- Previous: Architecture Assessment](06_ARCHITECTURE_ASSESSMENT.md) | [Back to Index](00_CODE_REVIEW_CODEX_v1_20260910T1805Z.md)

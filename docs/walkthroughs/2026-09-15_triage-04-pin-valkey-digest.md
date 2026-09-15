# Walkthrough — TRIAGE-04: Pin Valkey Image Digest & Document Image Refresh Policy

Remediates Code Review Finding `R-03` (MEDIUM priority) in `saleor-graphql-automation`.

---

## 1. Executive Summary

- **Objective:** Eliminate the mutable `valkey/valkey:8.1-alpine` tag by pinning the exact immutable sha256 digest, align all project governance claims (ADR-004 and `README.md`), and document the formal SUT image manifest and refresh policy.
- **Project PR:** [#12](https://github.com/GBrooks1970/saleor-graphql-automation/pull/12) (merged as [`aaaed81`](https://github.com/GBrooks1970/saleor-graphql-automation/commit/aaaed81))
- **Portfolio Tracking PR:** [#206](https://github.com/GBrooks1970/test-automation-portfolio/pull/206) (merged as [`dee406b`](https://github.com/GBrooks1970/test-automation-portfolio/commit/dee406b))
- **Live Acceptance Result:** Order #23 created on live SUT (`UNFULFILLED`, `FULLY_CHARGED`, `FULL`, $29.18 USD).
- **Verification Gate Status:** 100% green (`npm run verify`: 39 unit tests, 21 contract tests, 3 smoke scenarios, 8 API scenarios; `check:schema:live`: 0 domain breaks).

---

## 2. Key Changes Implemented

### 2.1 Immutable Digest Pinning in Compose
- **File:** `docker/docker-compose.yml`
- Pinned the `cache` service from mutable `valkey/valkey:8.1-alpine` to:
  ```yaml
    cache:
      image: valkey/valkey:8.1-alpine@sha256:77643d152547b446fc15cbafaff22004545663fcd40c6b28038ad283837baa75
  ```
- Verified via `docker compose -f docker/docker-compose.yml config` that the Compose model parses cleanly and outputs the pinned digest for all 4 services (`api`, `worker`, `db`, `cache`).

### 2.2 Governance & Architectural Claim Alignment
- **Files:**
  - `docs/decision-register.md`
  - `README.md`
- Updated **ADR-004** in `docs/decision-register.md` to explicitly record the exact Valkey digest alongside Saleor 3.23 and PostgreSQL 15 Alpine.
- Updated Key Feature #5 in `README.md` to reflect that all three SUT images are pinned by immutable sha256 digests.

### 2.3 SUT Image Manifest & Refresh Policy Documentation
- **File:** `docs/live-sut-validation.md`
- Documented the authoritative **Pinned SUT Image Manifest**:
  | Service | Repository | Tag | sha256 Digest | Role |
  |---|---|---|---|---|
  | `api` | `ghcr.io/saleor/saleor` | `3.23` | `sha256:ff3f5f5ebb0f40c36c8fa4cdd647be33f9db2762afc889d6c27704fc61813141` | Django Core GraphQL API |
  | `worker` | `ghcr.io/saleor/saleor` | `3.23` | `sha256:ff3f5f5ebb0f40c36c8fa4cdd647be33f9db2762afc889d6c27704fc61813141` | Celery background task worker |
  | `db` | `postgres` | `15-alpine` | `sha256:fe0737ba566a2c5b2a28f34433c0a423261900ec17b9bf7ad115e1aae7e57f1b` | Relational PostgreSQL data store |
  | `cache` | `valkey/valkey` | `8.1-alpine` | `sha256:77643d152547b446fc15cbafaff22004545663fcd40c6b28038ad283837baa75` | Redis/Valkey cache & Celery broker |
- Authored formal 6-step **Image Refresh & Maintenance Procedure** covering storage location verification (`E:\_DockerData`), digest extraction (`docker image inspect`), Compose updates, syntax validation, test execution, and documentation synchronisation.

---

## 3. Verification & Validation Evidence

### 3.1 Docker Compose Configuration
```powershell
docker compose -f docker/docker-compose.yml config
```
```yaml
  cache:
    image: valkey/valkey:8.1-alpine@sha256:77643d152547b446fc15cbafaff22004545663fcd40c6b28038ad283837baa75
    ports:
      - mode: ingress
        target: 6379
        published: "6379"
        protocol: tcp
```

### 3.2 Live SUT Readiness & Checkout Execution
- **Warm SUT Probe (`npm run sut:wait`):** Responded healthy in **2.6s**.
- **Mutating Checkout Journey (`npm run test:checkout`):**
  ```
  [Cucumber Hooks] Connected to live Saleor SUT at http://localhost:8000/graphql/
  [Checkout Evidence] Order #23: status=UNFULFILLED, paymentStatus=FULLY_CHARGED, chargeStatus=FULL, total=29.18 USD
  1 scenario (1 passed)
  9 steps (9 passed)
  0m14.758s (executing steps: 0m12.908s)
  ```
- **Live Schema Introspection (`npm run check:schema:live`):**
  ```
  [check-schema-contract] Probing explicit live endpoint at http://127.0.0.1:8000/graphql/...
  [check-schema-contract] Inspected 189 total changes: 0 domain breaks, 5 ADR-010 classified spec differences, 184 non-breaking additions.
  [check-schema-contract] Live schema contract valid! Zero domain breaking changes detected.
  ```

### 3.3 Full Verification Gate (`npm run verify`)
Passed in 13s on GitHub Actions CI and locally:
- `typecheck`: 0 errors
- `test:unit`: 39/39 passed (0 failed)
- `check:smoke-safety`: 8 scenarios inspected (3 @smoke), 0 violations
- `test:contract`: 21/21 passed (0 failed)
- `test:smoke`: 3/3 scenarios passed (11 steps passed)
- `test:api`: 8/8 scenarios passed (34 steps passed; Order #21 verified)

### 3.4 Host Docker Storage Verification
- Docker WSL2 data directory verified on `E:\_DockerData` per `AGENTS.md`. Zero storage leakage to `C:`.

---

## 4. Worklist Cross-Check

| Backlog Item | Description | Review Finding | Status | Evidence |
|---|---|---|---|---|
| **TRIAGE-04** | Pin Valkey to approved immutable digest & document refresh policy | R-03 (MEDIUM) | **DELIVERED** | PR [#12](https://github.com/GBrooks1970/saleor-graphql-automation/pull/12) (`aaaed81`), Root PR [#206](https://github.com/GBrooks1970/test-automation-portfolio/pull/206) (`dee406b`) |

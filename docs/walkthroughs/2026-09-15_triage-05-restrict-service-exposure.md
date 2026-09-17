# Walkthrough — TRIAGE-05: Restrict Local Service Exposure & Clarify Fixture-Secret Scope

Remediates Code Review Finding `R-04` (MEDIUM priority) in `saleor-graphql-automation`.

---

## 1. Executive Summary

- **Objective:** Eliminate wildcard interface exposure (`0.0.0.0`) by binding all published SUT container ports strictly to host loopback (`127.0.0.1`), annotate all connection strings and secrets as non-production development/test fixtures, and document the security boundary.
- **Project PR:** [#14](https://github.com/GBrooks1970/saleor-graphql-automation/pull/14) (merged as [`6902ebb`](https://github.com/GBrooks1970/saleor-graphql-automation/commit/6902ebb))
- **Portfolio Tracking PR:** [#207](https://github.com/GBrooks1970/test-automation-portfolio/pull/207) (merged as [`41ac35f`](https://github.com/GBrooks1970/test-automation-portfolio/commit/41ac35f))
- **Live Acceptance Result:** Order #24 created on live SUT (`UNFULFILLED`, `FULLY_CHARGED`, `FULL`, $29.18 USD).
- **Verification Gate Status:** 100% green (`npm run verify`: 39 unit tests, 21 contract tests, 3 smoke scenarios, 8 API scenarios; `check:schema:live`: 0 domain breaks).

---

## 2. Key Changes Implemented

### 2.1 Loopback-Only Interface Binding (`127.0.0.1`)
- **File:** [`docker/docker-compose.yml`](../docker/docker-compose.yml)
- Restricted all published service ports to `127.0.0.1`:
  - `api`: `"127.0.0.1:8000:8000"` (Saleor Core GraphQL endpoint)
  - `db`: `"127.0.0.1:5432:5432"` (PostgreSQL database for local assertions / GUI inspection)
  - `cache`: `"127.0.0.1:6379:6379"` (Valkey cache and Celery broker)
- Verified via `docker compose -f docker/docker-compose.yml config` and `docker ps` that zero services listen on wildcard `0.0.0.0`.

### 2.2 Fixture-Secret Scoping & Non-Production Boundaries
- **Files:**
  - [`docker/backend.env`](../docker/backend.env)
  - [`docker/docker-compose.yml`](../docker/docker-compose.yml)
  - [`docker/replica_user.sql`](../docker/replica_user.sql)
- Annotated all configuration files with security headers explicitly labelling credentials (`saleor:saleor`, `saleor_read:saleor_read`, `admin:admin`, `SECRET_KEY=secret_saleor_graphql_automation_key_323_ci`) as ephemeral, development-only test fixtures that must never be deployed to staging or production.

### 2.3 Documentation & Architecture Decision Alignment
- **Files:**
  - [`docs/live-sut-validation.md`](./live-sut-validation.md)
  - [`docs/decision-register.md`](./decision-register.md)
  - [`README.md`](../README.md)
- Added dedicated **Local Service Exposure & Fixture-Secret Scope** section in `docs/live-sut-validation.md`.
- Updated **ADR-004** in `docs/decision-register.md` and Key Feature #5 in `README.md` to record loopback isolation and secret governance.

---

## 3. Verification & Validation Evidence

### 3.1 Docker Compose Port Inspection
```powershell
docker ps --filter "name=docker-"
```
```
CONTAINER ID   IMAGE                        COMMAND                  STATUS          PORTS                      NAMES
30e199a04ab0   ghcr.io/saleor/saleor:3.23   "uvicorn saleor.asgi…"   Up 20 minutes   127.0.0.1:8000->8000/tcp   docker-api-1
2b8909468bc1   postgres:15-alpine           "docker-entrypoint.s…"   Up 20 minutes   127.0.0.1:5432->5432/tcp   docker-db-1
ee0350843cd5   valkey/valkey:8.1-alpine     "docker-entrypoint.s…"   Up 20 minutes   127.0.0.1:6379->6379/tcp   docker-cache-1
958e90b3a70f   ghcr.io/saleor/saleor:3.23   "celery -A saleor --…"   Up 5 days       8000/tcp                   docker-worker-1
```

### 3.2 Live SUT Readiness & Checkout Execution
- **Warm SUT Probe (`npm run sut:wait`):** Responded healthy in **0.6s**.
- **Mutating Checkout Journey (`npm run test:checkout`):**
  ```
  [Cucumber Hooks] Connected to live Saleor SUT at http://localhost:8000/graphql/
  [Checkout Evidence] Order #24: status=UNFULFILLED, paymentStatus=FULLY_CHARGED, chargeStatus=FULL, total=29.18 USD
  1 scenario (1 passed)
  9 steps (9 passed)
  0m06.947s (executing steps: 0m06.261s)
  ```
- **Live Schema Introspection (`npm run check:schema:live`):**
  ```
  [check-schema-contract] Probing explicit live endpoint at http://127.0.0.1:8000/graphql/...
  [check-schema-contract] Inspected 189 total changes: 0 domain breaks, 5 ADR-010 classified spec differences, 184 non-breaking additions.
  [check-schema-contract] Live schema contract valid! Zero domain breaking changes detected.
  ```

### 3.3 Full Verification Gate (`npm run verify`)
Passed in 15s on GitHub Actions CI and locally:
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
| **TRIAGE-05** | Restrict local service exposure & clarify fixture secrets | R-04 (MEDIUM) | **DELIVERED** | PR [#14](https://github.com/GBrooks1970/saleor-graphql-automation/pull/14) (`6902ebb`), Root PR [#207](https://github.com/GBrooks1970/test-automation-portfolio/pull/207) (`41ac35f`) |

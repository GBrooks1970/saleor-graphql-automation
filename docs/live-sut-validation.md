# Live Saleor SUT Validation

This procedure produces the live-SUT evidence required for mutating checkout journeys. Without an explicit `SALEOR_GRAPHQL_URL`, the ordinary `npm run verify` gate always uses the embedded test SUT; it must not be represented as live Saleor evidence.

## Safety and prerequisites

- Confirm Docker Desktop stores its images, containers and volumes under `E:\_DockerData`; do not continue if it is configured to use `C:`.
- **Operational Performance Thresholds:**
  - **Clean Bootstrap & Seeding (Cold Setup):** Applies 1,439 Django schema migrations and runs `populatedb --createsuperuser`. Empirically measured: **15 to 21 minutes** (recorded Phase 0 baseline: 21m). Preserve the seeded volume (`docker_saleor-db`) for routine testing.
  - **Warm Service Readiness:** Routine container start (`npm run sut:up && npm run sut:wait`) against a previously seeded volume. Empirically measured: **~14.6 seconds** (GraphQL `{ shop { name } }` health probe).
- The seed command creates `admin@example.com` with password `admin`. Override these defaults with `SALEOR_ADMIN_EMAIL` and `SALEOR_ADMIN_PASSWORD` where the fixture differs.
- The checkout scenario is mutating. Run it only against the local pinned SUT or an environment explicitly approved for test data.
- **Delivered vs Roadmap Journey Scope:**
  - **Delivered (Phase 2):** Single-line variant checkout with address assignments, delivery method selection, staff `transactionCreate`, and `checkoutComplete` producing a confirmed order (`features/checkout_stateful.feature`).
  - **Target Roadmap:** Staff order fulfilment (`SGR-P2-02`), multi-line cart checkouts, and multi-factor authentication (MFA).

## Clean bootstrap

From the repository root:

```powershell
docker compose -f docker/docker-compose.yml up -d db cache
npm run sut:migrate
npm run sut:seed
npm run sut:up
npm run sut:wait
```

Do not use `docker compose down -v` unless destroying the seeded database volume is intentional. A normal `npm run sut:down` preserves it.

## Warm service start

For routine local validation when seeded volumes exist:

```powershell
npm run sut:up
npm run sut:wait
```

## Checkout acceptance run

PowerShell:

```powershell
$env:SALEOR_GRAPHQL_URL = 'http://localhost:8000/graphql/'
$env:SALEOR_ADMIN_EMAIL = 'admin@example.com'
$env:SALEOR_ADMIN_PASSWORD = 'admin'
npm run test:checkout
```

An explicitly configured but unhealthy endpoint fails the run; it never falls back to the embedded SUT. Record the returned order number, order status, payment status and charge status in the implementation evidence.

## Pinned SUT Image Manifest & Refresh Policy

All container services in `docker/docker-compose.yml` are strictly pinned to immutable sha256 digests to guarantee reproducibility across workstations and CI runners.

### Image Manifest

| Service | Repository | Tag | sha256 Digest | Role |
|---|---|---|---|---|
| `api` | `ghcr.io/saleor/saleor` | `3.23` | `sha256:ff3f5f5ebb0f40c36c8fa4cdd647be33f9db2762afc889d6c27704fc61813141` | Django Core GraphQL API |
| `worker` | `ghcr.io/saleor/saleor` | `3.23` | `sha256:ff3f5f5ebb0f40c36c8fa4cdd647be33f9db2762afc889d6c27704fc61813141` | Celery background task worker |
| `db` | `postgres` | `15-alpine` | `sha256:fe0737ba566a2c5b2a28f34433c0a423261900ec17b9bf7ad115e1aae7e57f1b` | Relational PostgreSQL data store |
| `cache` | `valkey/valkey` | `8.1-alpine` | `sha256:77643d152547b446fc15cbafaff22004545663fcd40c6b28038ad283837baa75` | Redis/Valkey cache & Celery broker |

### Image Refresh & Maintenance Procedure

When refreshing or upgrading container dependencies:
1. **Verify Storage Location:** Ensure Docker Desktop WSL2 data disk is located on `E:\_DockerData` (never `C:`).
2. **Inspect New Image Digest:** Pull the desired target tag and extract its exact immutable repo digest:
   ```powershell
   docker pull valkey/valkey:8.1-alpine
   docker image inspect valkey/valkey:8.1-alpine --format "{{json .RepoDigests}}"
   ```
3. **Update Compose Definition:** Update `docker/docker-compose.yml` with the full `image: <repository>:<tag>@sha256:<digest>` specification.
4. **Validate Configuration:** Run `docker compose -f docker/docker-compose.yml config` to ensure the YAML parses cleanly and prints the pinned digest.
5. **Run Verification:** Execute warm start (`npm run sut:up && npm run sut:wait`), run live checkout (`npm run test:checkout`), and diff the schema (`npm run check:schema:live`).
6. **Synchronise Documentation:** Update the image manifest in this document, `docs/decision-register.md` (ADR-004), and `README.md`.

# Live Saleor SUT Validation

This procedure produces the live-SUT evidence required for mutating checkout journeys. The ordinary `npm run verify` gate remains deterministic and can use the embedded test SUT; it must not be represented as live Saleor evidence.

## Safety and prerequisites

- Confirm Docker Desktop stores its images, containers and volumes under `E:\_DockerData`; do not continue if it is configured to use `C:`.
- The first clean bootstrap applies 1,439 migrations and runs `populatedb --createsuperuser`; the recorded Phase 0 run took about 21 minutes. Preserve the seeded volume for later runs.
- The seed command creates `admin@example.com` with password `admin`. Override these defaults with `SALEOR_ADMIN_EMAIL` and `SALEOR_ADMIN_PASSWORD` where the fixture differs.
- The checkout scenario is mutating. Run it only against the local pinned SUT or an environment explicitly approved for test data.

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

## Checkout acceptance run

PowerShell:

```powershell
$env:SALEOR_GRAPHQL_URL = 'http://localhost:8000/graphql/'
$env:SALEOR_ADMIN_EMAIL = 'admin@example.com'
$env:SALEOR_ADMIN_PASSWORD = 'admin'
npm run test:checkout
```

An explicitly configured but unhealthy endpoint fails the run; it never falls back to the embedded SUT. Record the returned order number, order status, payment status and charge status in the implementation evidence.

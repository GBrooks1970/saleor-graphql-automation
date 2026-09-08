# Decision Register: saleor-graphql-automation

This register documents key architectural decisions (ADRs) governing the `saleor-graphql-automation` repository.

---

## ADR-001: GraphQL-First HTTP Client vs Saleor JS SDK
- **Status:** Accepted (2026-09-02)
- **Context:** Automation can either use Saleor's client SDK (`@saleor/auth-sdk`) or direct GraphQL POST requests via an HTTP client.
- **Decision:** Implement a lightweight, typed `CallGraphQL` Screenplay Ability using standard `fetch`.
- **Consequences:** Avoids dependency bloat and tightly couples tests directly to the GraphQL specification rather than SDK client abstractions, ensuring tests reflect raw API contracts.

---

## ADR-002: Serenity/JS + Cucumber for BDD & Reporting
- **Status:** Accepted (2026-09-02)
- **Context:** Need consistent portfolio alignment with BDD and Screenplay principles.
- **Decision:** Standardise on Serenity/JS 3.x with Cucumber 12.x and TypeScript.
- **Consequences:** Provides expressive actor-based vocabulary, narrative living documentation, and structured assertion error reporting.

---

## ADR-003: Schema Contract Diffing via GraphQL Inspector
- **Status:** Accepted (2026-09-02)
- **Context:** Need contract validation to detect breaking changes in the Saleor GraphQL schema over time without relying solely on end-to-end assertions.
- **Decision:** Integrate `@graphql-inspector/core` to validate offline baseline schemas (`schema/saleor-3.23.graphql`) against runtime introspection schemas.
- **Consequences:** Provides automated drift detection in CI and gates breaking API modifications before feature tests run.

---

## ADR-004: Pinned SUT Container Stack on `E:\_DockerData`
- **Status:** Accepted (2026-09-02)
- **Context:** Saleor 3.23 requires PostgreSQL 15 and Redis/Valkey. Docker resources must respect host machine storage rules.
- **Decision:** Pin exact image digests (`saleor:3.23@sha256:...`, `postgres:15-alpine@sha256:...`, `valkey/valkey:8.1-alpine`) and configure Docker WSL2 volumes exclusively on `E:\_DockerData` per `AGENTS.md`.
- **Consequences:** 100% deterministic test execution across local workstations and CI runners with zero storage leakage to the `C:` drive.

---

## ADR-005: Read-Only Smoke Profile Separation (NFR-6)
- **Status:** Accepted (2026-09-02)
- **Context:** Automated tests running against live demo or staging environments (`demo.saleor.io`) must not alter catalogue or customer data.
- **Decision:** Establish a strict smoke profile tagging convention: `@smoke and not @mutating`, guarded by automated safety checks.
- **Consequences:** Enables non-destructive health checks against any deployed Saleor instance without state pollution.

---

## ADR-006: Direct JWT Token Authentication vs Cookies
- **Status:** Accepted (2026-09-02)
- **Context:** Saleor supports both JWT tokens in `Authorization: Bearer <token>` headers and HTTP-only session cookies.
- **Decision:** Use explicit JWT token management via `tokenCreate` and `tokenRefresh` mutations.
- **Consequences:** Eliminates cookie-jar management in test actors and matches modern headless API consumer patterns.

---

## ADR-007: Saleor 3.x Transaction Flow API
- **Status:** Accepted (2026-09-03)
- **Context:** Saleor 3.x deprecates `checkoutPaymentCreate` in favour of the modern Transaction API (`transactionCreate`).
- **Decision:** Automate payment creation and order completion exclusively using the Transaction API.
- **Consequences:** Ensures compliance with current Saleor standards and aligns test journeys with modern e-commerce checkout lifecycles.

---

## ADR-008: Shared Typed Scenario Notes for Cross-Actor Checkout State
- **Status:** Accepted (2026-09-08)
- **Context:** The Customer owns the checkout lifecycle while the Admin actor supplies the staff-authorised `transactionCreate` operation. Checkout IDs, selected delivery data, totals, transaction evidence, and the resulting order must cross that actor boundary without being added to the transport-focused `CallGraphQL` Ability or leaked through global state.
- **Decision:** Give Customer and Admin a shared, scenario-scoped typed Serenity/JS `Notepad`, recreated in the Cucumber `Before` hook. Tasks record only domain state in the notepad; `CallGraphQL` remains responsible for transport and actor-specific authentication.
- **Consequences:** Stateful Screenplay Tasks remain composable, scenario isolation is explicit, and cross-actor collaboration does not couple checkout state to HTTP mechanics.

---

## ADR-009: Separate Deterministic and Live-SUT Checkout Evidence
- **Status:** Accepted (2026-09-08)
- **Context:** CI needs a fast, deterministic checkout path, but an embedded mock alone cannot prove that mutation documents and workflow assumptions still match Saleor 3.23. Silent fallback from an explicitly configured live endpoint could mislabel mock evidence as live evidence.
- **Decision:** Keep the embedded stateful SUT in `npm run verify`, validate every checkout document against the pinned schema, and require a separately identified live Docker run for SGR-P2-01 acceptance. If `SALEOR_GRAPHQL_URL` is explicitly supplied but unhealthy, the Cucumber hook fails closed.
- **Consequences:** CI remains fast while live compatibility claims stay evidence-based. Operators must bootstrap the pinned SUT and provide Admin credentials before recording live acceptance.

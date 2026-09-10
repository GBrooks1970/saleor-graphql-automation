# Cross-Cutting Analysis

[<- Back to Index](00_CODE_REVIEW_CODEX_v1_20260910T1805Z.md) | [Next: Recommendations ->](05_RECOMMENDATIONS.md)

**Reviewer:** AI assistant (Codex GPT-5)

## Tool-Agnostic Tests

- Gherkin describes catalogue, authentication, and checkout intent independently of HTTP-client details.
- GraphQL documents and expected domain statuses could be reused by another runner.
- Step definitions bind directly to Serenity/JS and Node assertions, so execution is not framework-neutral.

## Code-Agnostic Tests

- Feature prose and the checked-in GraphQL schema are portable specifications.
- Typed Tasks and the embedded SUT are TypeScript-specific reference implementations.
- Fixture credentials and channel names should move behind documented test-data contracts before cross-language reuse.

## Single Source of Truth

- `docs/backlog.md` is current and correctly marks SGR-P2-01 Done.
- Feature files define executable business expectations; `schema/saleor-3.23.graphql` defines the offline API surface.
- The design overview conflicts with both sources by presenting future work as current capability.

## API Contract Compliance

- N/A for REST/OpenAPI - this is a GraphQL-only project.
- Checkout documents are parsed and validated against the baseline on every gate.
- Live baseline drift is not CI-enforced, and the current checker fails against the pinned runtime.

## Screenplay Parity

- Checkout consistently separates Tasks, Questions, transport Ability, and scenario notes.
- Authentication and catalogue Tasks do not use the checkout error helper, producing uneven diagnostics.
- Direct Node assertions and unused Serenity adapter/reporting dependencies limit narrative reporting parity.

## Batch File Design

N/A - the repository contains no Windows batch or PowerShell launcher files; lifecycle commands are npm and Docker Compose scripts.

## Documentation Alignment

- Backlog v3, ADR-009, implementation logs, and the walkthrough agree on SGR-P2-01 completion.
- README schema and smoke guarantees exceed the current executable controls.
- The design document needs implemented/planned labels and measurable bootstrap definitions.

## Logging Alignment

- Console summaries expose scenario counts, step counts, and live checkout order evidence.
- `CallGraphQL` captures response headers and latency in memory but does not emit structured telemetry.
- No durable Serenity report is generated; this is transparently scheduled for SGR-P3-01.

## Test Coverage Metrics

- Verified totals: 9 unit tests, 12 contract tests, and 8 BDD scenarios with 34 steps.
- Three smoke scenarios with 11 steps pass under the current tag expression.
- No statement or branch coverage instrumentation exists, so structural coverage percentages are unavailable.

---

[<- Previous: Project Review](03_PROJECT_REVIEWS/PROJECT_001_SALEOR_GRAPHQL_AUTOMATION.md) | [Back to Index](00_CODE_REVIEW_CODEX_v1_20260910T1805Z.md) | [Next: Recommendations ->](05_RECOMMENDATIONS.md)

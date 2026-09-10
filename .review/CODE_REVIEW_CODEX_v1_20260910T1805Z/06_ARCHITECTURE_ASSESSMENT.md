# Architecture Assessment

[<- Back to Index](00_CODE_REVIEW_CODEX_v1_20260910T1805Z.md) | [Next: Migration Plans ->](07_MIGRATION_PLANS.md)

**Reviewer:** AI assistant (Codex GPT-5)

## Test Pyramid

- The fast layer is healthy: 9 unit tests and 12 schema/operation contract tests execute before BDD.
- Eight embedded-SUT scenarios provide component-level workflow assurance without Docker cost.
- One separately controlled live checkout provides a deliberately narrow end-to-end layer.
- Negative checkout coverage is shallow, and no quantitative code coverage gate exists.

## SOLID Principles

- **SRP:** Tasks and Questions are focused; `src/mock/server.ts` now carries too many responsibilities.
- **OCP:** New GraphQL operations can be added without modifying `CallGraphQL`, but error handling is duplicated between old and new Tasks.
- **LSP:** No problematic subtype hierarchy was found; the custom Ability follows the Serenity base abstraction.
- **ISP:** Actors receive a broad transport Ability but only the capabilities their Tasks call; no oversized custom interfaces are present.
- **DIP:** Business Tasks depend on the `CallGraphQL` abstraction, though direct global `fetch` makes transport substitution rely on monkey-patching in unit tests.

## KISS

- Native `fetch`, Node test runner, and a small embedded GraphQL server keep the toolchain understandable.
- Central operation documents and one gate command reduce execution ambiguity.
- Manual Gherkin parsing is deceptively simple and is the root cause of R-01; a standard parser is simpler operationally because it matches Cucumber semantics.

## YAGNI

- The project avoids a large Saleor SDK and implements only the API subset it exercises.
- Unused Serenity integration packages are premature until SGR-P3-01 is delivered.
- The dormant schema script creates a claim without an operational gate; either productise it or narrow the claim.

## REST and OpenAPI

N/A - the system under test is GraphQL. Equivalent contract concerns are schema provenance, operation validation, runtime introspection, and backwards-compatible schema evolution.

## ISTQB Strategies

- The checkout scenario demonstrates state-transition and use-case testing across a realistic business workflow.
- Invalid credentials and missing billing address provide equivalence-partition and negative-path examples.
- Boundary-value coverage is limited for quantities, money, pagination, and timeout thresholds.
- A decision table for address, delivery, payment, and confirmation states would strengthen SGR-P2-02/P2-03.

## Pedagogical Comments

- Names explain business intent without excessive inline commentary.
- ADR-008 and ADR-009 teach why shared notes and evidence separation exist.
- Review findings should be resolved before presenting smoke and schema safeguards as complete guarantees.
- Structured Serenity assertions and reports would make the activity model more visible to learners.

---

[<- Previous: Recommendations](05_RECOMMENDATIONS.md) | [Back to Index](00_CODE_REVIEW_CODEX_v1_20260910T1805Z.md) | [Next: Migration Plans ->](07_MIGRATION_PLANS.md)

# Project Contract — saleor-graphql-automation

## Gates

npm run verify        # one command per line; all must pass before a commit is gated green

## Working norms

- **Single Source of Truth:** BDD feature files in `features/` and GraphQL introspection schema in `schema/saleor-3.23.graphql` define contracts and business expectations.
- **Screenplay Pattern Idiom:** Scenario steps map directly to Screenplay vocabulary: Actors (`Guest`, `Customer`, `Admin`), Ability (`CallGraphQL`), Tasks (`BrowseCatalogue`, `Authenticate`, `RefreshToken`), and Questions (`TheProducts`, `TheShopInfo`, `TheToken`, `TheGraphQLError`).
- **Contract Diffing:** Schema contract diffing via `@graphql-inspector/core` must execute bidirectionally (positive verification against baseline schema, negative verification of breaking change detection).
- **Read-Only Smoke Safety:** The `@smoke` profile is strictly read-only (`@smoke and not @mutating`); mutating queries are forbidden in smoke.
- **Docker Storage Invariant:** SUT containers, images, and volumes reside strictly on `E:\_DockerData` (never `C:`).
- **AI-Agent Agnostic:** All validation, builds, and test runs execute via standard CLI commands (`npm run verify`, `docker compose`).
- **House Style:** en-GB spelling across all markdown documents, code comments, and Gherkin step descriptions.

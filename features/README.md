# Saleor GraphQL journeys

These executable requirements cover anonymous catalogue browsing, customer authentication, checkout payment and staff fulfilment against Saleor 3.23 contracts.

The full API suite runs all feature scenarios. The read-only smoke suite selects `@smoke and not @mutating`; these scenarios are also part of the API suite, so the two report counts must not be added as unique coverage.

By default the journeys execute against a deterministic embedded mock SUT. Passing reports establish the automated behaviour of that harness. Pinned Docker acceptance is a separate exercise described in `docs/live-sut-validation.md`.

Inspect a scenario to see its Gherkin steps, Screenplay Tasks, assertions and outcome. The catalogue, authentication, checkout and fulfilment features link business intent to the executed activities.

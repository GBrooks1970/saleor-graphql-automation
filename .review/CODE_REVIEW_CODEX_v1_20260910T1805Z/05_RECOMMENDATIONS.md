# Recommendations

[<- Back to Index](00_CODE_REVIEW_CODEX_v1_20260910T1805Z.md) | [Next: Architecture Assessment ->](06_ARCHITECTURE_ASSESSMENT.md)

**Reviewer:** AI assistant (Codex GPT-5)

## Recommended Refactors

1. **HIGH:** Replace the smoke tag parser with Cucumber-equivalent inherited-tag resolution and add mutation-operation verification.
2. **HIGH:** Make live schema comparison fail closed, normalise the pinned runtime schema, and add a real drift workflow under SGR-P3-02.
3. **MEDIUM:** Pin Valkey by digest and restrict Docker host bindings to loopback or the Compose network.
4. **MEDIUM:** Implement SGR-P2-03 using bounded HTTP calls and one typed error model across every Task.
5. **MEDIUM:** Reconcile README/design claims with implemented, planned, and empirically measured states.

## Next Steps

- Triage R-01 and R-02 into small, independently mergeable worklist items before adding another mutating journey.
- Keep SGR-P2-02 independent from the existing checkout data and provide its own live acceptance evidence.
- Update GitHub action majors in a low-risk CI maintenance PR.
- Decide whether Serenity living documentation is a real deliverable; wire the declared packages or remove them.
- Preserve the seeded local volumes while keeping live mutation commands explicitly opt-in.

## Future Project Ideas

- Scheduled upstream Saleor schema capture with reviewed baseline promotion and drift classification.
- A data-driven state-transition suite for checkout and fulfilment domain errors.
- Operation-level latency histograms with percentile thresholds rather than a single elapsed-time assertion.
- A generated traceability matrix linking FR/NFR identifiers to feature scenarios, contract tests, and CI jobs.

---

[<- Previous: Cross-Cutting Analysis](04_CROSS_PROJECT_ANALYSIS.md) | [Back to Index](00_CODE_REVIEW_CODEX_v1_20260910T1805Z.md) | [Next: Architecture Assessment ->](06_ARCHITECTURE_ASSESSMENT.md)

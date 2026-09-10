# Project Review - Saleor GraphQL Automation

[<- Back to Index](../00_CODE_REVIEW_CODEX_v1_20260910T1805Z.md) | [Next: Cross-Cutting Analysis ->](../04_CROSS_PROJECT_ANALYSIS.md)

**Reviewer:** AI assistant (Codex GPT-5)

- **Architecture:** The Actor-Task-Question structure is clear, and the shared typed Notepad is an effective solution for a journey split between Customer and Admin. Transport remains isolated in `CallGraphQL`, while checkout error promotion sits in a small helper.
- **Maintainability:** Operation documents are centralised and validated against the baseline schema. The mock server is now 694 lines and mixes schema, fixtures, state, resolvers, and HTTP lifecycle, so future Phase 2 growth should split those responsibilities.
- **Coverage:** The repository has 9 passing unit tests, 12 passing contract tests, and 8 passing BDD scenarios. Checkout has one successful business path and one direct billing-address negative test; boundary combinations, timeouts, and other domain errors remain limited.
- **Runtime stability:** Scenario notes and checkout maps are recreated for each embedded process, UUIDs prevent obvious clashes, and explicit live targets fail closed. The unbounded HTTP client and absence of live-data cleanup remain acceptable only for the approved local SUT.
- **Documentation:** Backlog v3, ADR-009, two implementation logs, and the walkthrough form a strong evidence chain. The design overview and contract/smoke claims need correction to match current enforcement.
- **CI and dependencies:** `npm ci` plus one canonical gate provides good reproducibility, the audit is clear, and exact-merge CI passed. Mutable Valkey selection, unused Serenity packages, available dependency majors, and the action-runtime warning need deliberate maintenance.
- **Portfolio value:** The project demonstrates senior judgement in evidence separation and cross-actor state. Addressing R-01 and R-02 would materially improve trust because they affect the two most prominent assurance claims.

## Deferred and Planned Coverage

- SGR-P2-02 staff fulfilment is not implemented and should remain separate from the checkout completion evidence.
- SGR-P2-03 accurately captures the current timeout, SLA, and error-model gaps.
- SGR-P3-01 is the appropriate home for Serenity reporting and living documentation; current output is summary-only.
- SGR-P3-02 should own a reliable live schema drift workflow after normalisation is proven against the pinned SUT.

---

[<- Previous: Risks and Issues](../02_RISKS_AND_ISSUES.md) | [Back to Index](../00_CODE_REVIEW_CODEX_v1_20260910T1805Z.md) | [Next: Cross-Cutting Analysis ->](../04_CROSS_PROJECT_ANALYSIS.md)

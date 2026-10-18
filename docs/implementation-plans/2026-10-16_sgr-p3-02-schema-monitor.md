---
version: 1
created: 2026-10-16
project: saleor-graphql-automation
type: implementation-plan
item: SGR-P3-02
status: complete
approved: owner instructed proceeding to next item and accepted daily 07:17 UTC checks with GitHub Actions failure reporting
language: en-GB
---

# Implementation plan: upstream schema monitoring

## Baseline and decisions

SGR-P3-01 merged through PR #19 as `7524176cc19921c1bbc5f9ca8959aa3aca9c2ffd`. PR run `38906564811` and exact-main run `38906680249` passed, including deployment. Browser inspection verified the hosted landing page revision and both suites (API 9/9; smoke 3/3) at `https://gbrooks1970.github.io/saleor-graphql-automation/`.

The owner accepted a daily 07:17 UTC schedule and GitHub Actions failures plus retained reports as the alert mechanism. No endpoint was supplied; repository Actions variables are currently empty. Use an explicit `SALEOR_SCHEMA_MONITOR_URL` repository variable instead of inventing a target or silently using localhost. No external messages or issue creation are needed. Notification delivery depends on the owner's GitHub notification settings.

## Implementation

1. Reuse the existing live contract comparison engine (`loadBaselineSchema`, `fetchLiveSchema`, `validateContract`) and ADR-010 classification; preserve the offline verification gate and existing live CLI.
2. Add a monitor command requiring an explicit HTTP(S) endpoint. Reject embedded credentials, query strings and fragments. Fetch only introspection, with the existing bounded request; never mutate store data or promote a baseline automatically.
3. Write structured JSON and Markdown reports with baseline hash, source revision, timestamp, endpoint, classified changes and operational outcome. Distinguish compatible, domain-breaking, unavailable and configuration errors. Non-breaking/specification changes remain visible without failing domain compatibility.
4. Add a separate scheduled/manual workflow, read-only repository permissions, Node 24-compatible actions, bounded execution and report retention on failure. Keep this network-dependent workflow outside PR verification and Pages deployment.
5. Add meaningful local HTTP integration tests for successful, additive and breaking schemas; missing configuration, invalid endpoints, unavailable HTTP, GraphQL errors and malformed introspection; CLI exit codes, report creation and baseline preservation.
6. Document configuration, Actions notifications, retained reports, triage and reviewed baseline promotion. Reconcile SGR-P3-01 completion and SGR-P3-02 in-progress status.

## Verification and delivery boundary

Run targeted monitor tests, full `npm run verify`, workflow YAML checks and `git diff --check`. This branch starts from the verified main above. Local fixtures prove monitor behaviour, not upstream health or scheduled delivery. A configured real endpoint and an actual workflow run are required for operational acceptance. Publication of this next item is separate from approval to merge PR #19.

## Local implementation evidence - 2026-10-16

- Added `scripts/monitor-schema.ts`, `npm run monitor:schema`, a daily/manual read-only Actions workflow and operational documentation. Existing live CLI behaviour remains intact; loader and timeout parameters were made injectable for deterministic integration checks.
- Nine monitor integration tests passed (3824.9473 ms including test-runner overhead). These execute real loopback HTTP exchanges and cover compatible/additive/domain-breaking schemas, ADR-010 spec versus domain directives, HTTP 503, GraphQL errors, invalid JSON, malformed introspection, timeout, connection refusal, missing/invalid configuration, rejected credentials, baseline preservation, report replacement and actual CLI exit 2.
- Full `npm run verify` completed through its final report check: **56/56 unit tests in 14 suites** (4814.1806 ms), **32/32 contract tests in 6 suites** (3221.8258 ms), **3/3 smoke scenarios**, **9/9 API scenarios**, typecheck and smoke-safety checks passed. Report validation confirmed smoke=3 and api=9. Logs are ignored under `target/schema-monitor-verify.log`.
- Workflow YAML parsing and structural checks confirmed `17 7 * * *`, manual dispatch, read-only contents permission, ten-minute job timeout and absence of PR triggers. `git diff --check` passed.
- SGR-P3-01 completion evidence is reconciled in the backlog, reporting guide, README/design and plan index.
- **Remaining:** real upstream endpoint, publication of this branch, first actual monitor workflow run, and confirmation of notification delivery/settings. No repository variable, live health result or scheduled run has been invented. Changes remain local and uncommitted.

## Approved refinement and publication - 2026-10-18

The owner instructed merge and continue after the recommendation to monitor the official Saleor 3.23 SDL. This supersedes the live-endpoint prerequisite above. Default to schema-file mode using `https://raw.githubusercontent.com/saleor/saleor/3.23/saleor/graphql/schema.graphql`; retain explicit live introspection as an optional mode. Add source type and upstream content hash to evidence, reject unknown modes and invalid SDL, bound downloads, and extend HTTP integration tests. Keep daily 07:17 UTC execution and GitHub Actions failure reporting. Commit, push, PR creation and merge are authorised for this item after validation. Verify PR CI, exact-main CI and a manual monitor run before recording completion; a manual run does not establish that the daily schedule has fired.

## Final pre-publication validation - 2026-10-18

Default SDL mode and optional explicit introspection are implemented. Twelve targeted monitor tests passed. The full gate exited 0 with 56 unit tests, 35 contract tests, 3 smoke scenarios and 9 API scenarios; both report checks passed. Workflow YAML/permissions/schedule checks and `git diff --check` passed. Documents were normalised to UTF-8 and the previous reporting completion claims reconciled.

The actual default source fetch exited 0: compatible, zero domain breaks, 117 other changes. Baseline SHA-256: `36a111ba8f822b25a62fa82df0d7e4477e1aebc611d70adb83f5006a5cf76624`; upstream SDL SHA-256: `bf37d116a6e04354cbb9c35a4ee1343ab0602269b2b4ee0f8872adaa03abec6d`. The baseline was not promoted. This local network check does not replace post-merge workflow acceptance.

## Merge and operational acceptance - 2026-10-18 (Europe/London)

PR #20 head `cb2aa0bf0649dd670b953c00bb56465764d52445` passed PR CI `39078857724` and merged as `c799d0710e7e70fcceb12492ce49e9020126b298`. Exact-main CI `39078903688`, including Pages deployment, and manual monitor run `39078905171` succeeded for that same SHA. Main was clean and synchronised before the dependency-maintenance branch began.

Artifact `schema-drift-39078905171-1` (ID 12117843774, 5204 bytes) was downloaded and inspected. Its JSON records the exact main revision, SDL mode, zero domain breaks and 117 other changes; source and baseline hashes match the pre-publication probe. The report observation timestamp is `2026-10-17T23:24:41.568Z` (18 October in Europe/London). The workflow is active. This proves manual execution and artifact retention, not first scheduled execution or notification delivery.

## Scheduled execution outcome - 2026-10-18

The owner approved recording the completed scheduled-run observation and publishing the documentation through separate project and portfolio PRs. Run `39107672846` succeeded with event `schedule` on `4660ce06dc2c0a234fc3f62678c1d9ff0b653665`, created at 07:26:35 UTC. Artifact `schema-drift-39107672846-1` (ID 12129560327, 5205 bytes) contains matching JSON/Markdown reports: official 3.23 SDL, compatible, zero domain breaks, zero directive-spec differences and 117 other changes. The hashes match the earlier manual observation. See `docs/schema-monitoring.md` for full provenance.

The verification watch is paused. Notification settings and delivery remain unverified because the connection lacks notification access; success does not prove failure-alert delivery. This outcome adds evidence without altering the approved monitor design or baseline. Validate the documentation with the project gate and `git diff --check`, then verify PR and exact-main CI after publication.

## Notification-settings outcome - 2026-10-18

The owner signed in and authorised recording the completed verification and closing this maintenance batch. Authenticated browser inspection showed GitHub Actions notifications enabled on GitHub and by email for failed workflows only, a configured default email, and the Saleor repository subscription set to Participating. No settings were changed. This supersedes the earlier settings-access limitation; actual failure-alert delivery remains untested. The owner-approved weekly compatible `braces` fix watch is active, while the scheduled-run verification watch remains paused.

This documentation-only close-out updates backlog v9 and current operations records, preserves historical outcomes, and publishes a separate portfolio handover. Validate with the project gate and PR/exact-main CI; keep the dependency risk tracked and do not infer tested alert delivery.

# Withdrawn braces advisory record reconciliation — 2026-11-01

## Session Summary

Action 2 closes the stale `braces` advisory record and removes the obsolete current claim that its watch remains active. The official withdrawal and a fresh isolated audit support that closure. Five other affected packages remain grouped into one HIGH-priority compatibility-review item, SGR-MAINT-02. This is a documentation reconciliation with passing local verification; publication awaits owner review.

## Objectives

1. Complete — verify the withdrawal and close SGR-MAINT-01 in backlog v10 and the portfolio worklist.
2. Complete — capture current dependency findings separately without changing package manifests.
3. Complete — inspect automation metadata and preserve the untested failure-alert-delivery boundary.
4. Complete — run the existing verification gate and provide a separate plan, log and v7 handover pair.
5. Deferred to owner review — merge the project and support branches. Dependency remediation requires separate authorisation.

## Test Results

| Suite/check | Before | After | Result |
|---|---|---|---|
| Unit tests | Not rerun before documentation changes | 56 passed, 14 suites, zero failures/skips | PASS |
| Contract tests | Not rerun before documentation changes | 35 passed, 6 suites, zero failures/skips | PASS |
| Smoke lane | Not rerun before documentation changes | 3 successful scenarios | PASS |
| API lane | Not rerun before documentation changes | 9 successful scenarios | PASS |
| Report completeness | Not rerun before documentation changes | `Complete reports: smoke=3, api=9` | PASS |
| Isolated lockfile audit | Historical record describes withdrawn braces risk | No braces finding; 2 HIGH and 3 MODERATE affected packages | Expected exit 1: residual findings |
| Package manifests | Original SHA-256 values captured | Both unchanged | PASS |

`npm run verify` exited 0 in **48.598 s**. The captured unit and contract durations were 13042.1051 ms and 3232.5064 ms respectively; the overall duration above is the measured wrapper duration, not a sum of selected suites. No source tests were added for this documentation change. The gate used the embedded SUT; it does not establish live Docker readiness. Deliberately unreachable endpoints in contract-test output were expected negative cases, not failures of the overall gate.

The isolated audit was observed at `2026-11-01T11:53:50.661389+00:00`, took **4.371 s**, and ran `npm audit --package-lock-only --ignore-scripts --json` against temporary copies only. No install or automatic fix ran. Unchanged source hashes:

```text
package.json       54da25cf9f4855a61b45eb1ef75605113922adce6812ee4d39d9a31ef336adf8
package-lock.json  fc80396dc67978fd2b7f33e959194c6e24b3e14317a4acfd4b2f93e5b005ea0f
```


Close-out resumed on **2026-11-02**. Fetched main and the implementation base remained unchanged. Markdown/HTML metadata and generated bodies, all eight handover sections, preserved CSS, local links and latest-manifest selections passed; the manifest contains 127 handovers across 19 subjects with complete pairs. The original package-manifest hashes were reconfirmed unchanged. The passing 1 November project gate remains applicable because this branch changes only documentation. The dependency snapshot is explicitly dated 1 November and is not presented as a new 2 November audit.

## Changes Implemented

### Close the withdrawn advisory record

[GitHub GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) reports `withdrawn_at: 2026-10-23T12:53:02Z` because the reported vulnerability is not practically exploitable. `docs/backlog.md` v10 records SGR-MAINT-01 as complete, preserving the older audit as a dated observation. The portfolio root worklist mirrors this result. This does not imply a package patch or a clear audit.

### Preserve distinct current findings

SGR-MAINT-02 groups the fresh audit's HIGH `zod` and `@serenity-js/html-reporter` findings, and MODERATE `minimatch`, `glob` and `@cucumber/cucumber` findings, into one HIGH compatibility-review item. npm offered no automatic fix for the Zod chain; its proposed Cucumber major change is outside this action. The open summary is **HIGH 1 / MEDIUM 0 / LOW 0 / total 1**. All 14 roadmap items and seven TRIAGE items remain delivered.

### Reconcile watch claims

The local automation metadata inventory contains no braces-fix watch. The separate `Verify Saleor scheduled schema monitor` automation is PAUSED. No automation or notification setting was changed. Actual failure-alert delivery remains untested, independently of successful scheduled execution and verified notification settings.

## Technical Decisions

| Decision | Rationale | Alternative considered |
|---|---|---|
| Close only the withdrawn advisory-based risk | Official withdrawal and a fresh audit support that specific conclusion | Claim the whole dependency audit is clear |
| Audit temporary package-manifest copies | Obtain current evidence while preserving source and lockfile | Run a dependency update or forced audit fix |
| Group remaining findings into one assessment | Compatibility across the Serenity/Cucumber toolchain needs a coherent review | Add five independent patch tickets |
| Preserve historical records and delivery limits | Earlier observations remain valid as dated evidence | Rewrite old immutable logs or claim alert receipt |

No new architecture decision was introduced. Project base: `abd506e38c0c3f1f7c56d0e17155545d1959069a`; support base: `fb4b0f2c68fa6811debd78ad3d4e7057ceed9c98`. Final source commit and review links are recorded in v7.

## Documentation Updates

- `docs/backlog.md` v10 — dated closure, separate current risk and explicit counts.
- `docs/implementation-plans/2026-11-01_withdrawn-braces-records.md` and `_index.md` — approved plan and outcome.
- This append-only implementation log.
- Root `WORKLIST_saleor-graphql-automation.md` — current maintenance status and closed obsolete watch claim.
- Root `session-notes/saleor-graphql-automation_session-notes_v7_20261101T1158Z.md` and `.html` — separate handover, superseding v6.
- Root generated `session-notes/manifest.json` — local latest-version discovery.

## Lessons Learned

- Audit package counts and backlog item counts measure different things: five findings are one pending compatibility review here.
- Advisory withdrawal is a dated source fact. It does not justify erasing other risks or changing package versions.
- A historical automation description is not a current inventory; check both independently.

## Recommendations / Next Steps

- Owner: review the reconciliation PR and corresponding portfolio support records before merging.
- Assess [SGR-MAINT-02](../backlog.md#sgr-maint-02-current-dependency-compatibility-review) as the next dependency task before proposing a bounded compatible change.
- Keep actual failure-alert delivery explicitly untested until an authorised exercise produces evidence.

*Session logged: 2026-11-01; close-out: 2026-11-02. Author: Codex.*

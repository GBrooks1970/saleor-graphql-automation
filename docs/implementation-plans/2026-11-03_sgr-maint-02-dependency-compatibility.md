---
version: 1
created: 2026-11-03T15:59Z
project: saleor-graphql-automation
type: implementation-plan
item: SGR-MAINT-02
status: stage-a-implemented
approved: 2026-11-03
delivered: "2026-11-03 (Stage A HIGH remediation); Stage B MODERATE Cucumber 13 option remains separate"
language: en-GB
---

# Implementation plan: Action 4 — Saleor dependency compatibility remediation

**Goal.** Resolve the confirmed HIGH Zod/reporting chain with the smallest explicitly reviewed dependency change, preserve the existing embedded-SUT verification and report pipeline, and keep the MODERATE Cucumber migration as a separate owner decision. This is an assessment and proposed plan, not approval to change dependencies.

## Evidence gathered before planning

Read-only investigation on 3 November 2026 inspected the project contract, backlog SGR-MAINT-02, v7 handover, current manifests/lockfile, CI workflow and npm registry metadata. Local and GitHub main both identify `2449d7df6420d2561444fcab3dcb1e2b3137a452` (PR #24 merged); no project PRs were open. The working tree was initially clean. No nested AGENTS.md was found; portfolio guidelines apply.

A fresh `npm audit --package-lock-only --ignore-scripts --json` ran against copied manifests in `C:\Users\brook\AppData\Local\Temp\saleor-audit-plan-i2zsuv2f`, exited 1, and reported **five affected packages: two HIGH, three MODERATE, zero LOW/CRITICAL**. Both copies remained byte-identical to repository source. Raw output is `audit.json` in that external temporary directory; recreate it if unavailable. No install, dependency resolution, tests, Docker operations or notification changes were performed. Only this proposed plan and its index entry are repository writes.

| Finding | Consequence |
|---|---|
| Reporter `3.46.0` pins Zod exactly `4.4.3`; all six installed Serenity packages are `3.46.0` | A normal lockfile refresh cannot cross the exact Zod pin |
| [Zod advisory GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) affects `<4.6.6`, patched in `4.6.6` | Use 4.6.6 as the minimum evidenced candidate, recheck at execution |
| Registry metadata for latest reporter `3.49.0` still pins Zod `4.6.5` | Upgrading the reporter alone currently leaves the HIGH issue; npm reports no automatic fix |
| Cucumber `12.9.0` brings `glob ^13.0.0`; locked glob is `13.0.6`, minimatch `10.2.6` | Current major ranges cannot obtain both fixes through a routine refresh |
| [Glob advisory](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) affects `>=9.0.0 <=14.0.1`, fixed in `14.0.2`; [minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249) affects `<11.0.1` | Cross-major glob/minimatch overrides would be a separate compatibility risk |
| npm proposes Cucumber `13.3.0`; its published dependencies omit glob/minimatch, engines `22 || 24 || >=26` | Supported parent upgrade is preferable to forcing the old glob graph, but it is an explicit Cucumber major migration |
| Existing Serenity Cucumber `3.46.0` peer range includes `^13.0.0`; project engines are `^22.22.2 || ^24.15.0` | Cucumber 13 is a plausible separate candidate; peer/engine compatibility does not prove behavioural compatibility |
| CI runs Node 24 and `npm run verify`, with no audit gate | Existing green CI is not evidence of a clear audit; retain audit evidence separately |
| v7 records passing embedded-SUT gate (56 unit, 35 contract, 3 smoke, 9 API) on 1 November | Historical baseline only; all counts/results must be measured again after any change |

### Suggested solutions

1. **Recommended bounded first stage:** add a parent-scoped npm override under `@serenity-js/html-reporter` for exact `zod: 4.6.6`, keeping the six currently locked Serenity versions at 3.46.0, Cucumber 12.9.0 and all other direct resolved versions unchanged. This intentionally overrides an upstream exact pin and therefore requires owner approval plus focused report compatibility evidence. It is a candidate, not a proven safe drop-in replacement.
2. **Wait for an upstream reporter fix:** avoids an override, but leaves the HIGH finding open. If a new reporter release adopts a patched Zod before implementation, reassess that supported update instead of applying an obsolete workaround. Do not create a watch/automation without separate instruction.
3. **Optional separate second stage:** move Cucumber to exact 13.3.0 after the HIGH-only baseline is verified, preserving Serenity 3.46.0 initially. This should remove the current glob/minimatch path; clean resolution/audit and scenario/report tests must prove it. Review Cucumber migration/release notes before the version edit. If broader framework changes are required, return with a revised plan.
4. **Rejected:** force downgrade Serenity, blanket `npm audit fix --force`, suppress findings, or force glob 14/minimatch 11 beneath Cucumber 12 without parent-level support evidence.

**Exposure limitation.** These are development/reporting dependencies. The audit establishes affected versions, not that this project's inputs reach the vulnerable collection-validation path. Reporter input reachability has not been traced; lack of an exploit demonstration is not grounds to mark the finding resolved or accept risk automatically.

## Steps

1. After approval, recheck main, open PRs, advisory ranges and npm metadata. Create `codex/sgr-maint-02-dependency-remediation` from refreshed main. Preserve this plan and all unrelated work. Record a baseline audit and the existing full gate before changes; keep their outcomes distinct.
2. Specification first: update SGR-MAINT-02 in `docs/backlog.md` with the approved stage, exact acceptance criteria and residual findings. Reconcile SGR-MAINT-01's stale pending-publication wording using merged PR #24 evidence, without rewriting its immutable log/handover. Record the accepted override rationale/removal trigger in the new implementation log.
3. For Stage A, change only `package.json` by adding `overrides: { "@serenity-js/html-reporter": { "zod": "4.6.6" } }`. Regenerate `package-lock.json` through npm using Node 24 and existing lockfile as the starting point; no manual integrity edits. Review the diff to keep direct resolved versions fixed and avoid refreshing all caret-ranged Serenity dependencies. Reject unexplained changes. If npm cannot resolve the scoped override or reporter tests fail, stop and reassess rather than broaden the patch silently.
4. Perform clean `npm ci`, inspect `npm ls zod @serenity-js/html-reporter @serenity-js/core @serenity-js/web`, and run the verification matrix below. Trace report input parsing and exercise representative existing smoke/API output through the reporter. Preserve negative report-completeness checks; do not run an unbounded memory-exhaustion exploit.
5. If separately approved, Stage B uses its own commit/PR after Stage A acceptance: change `@cucumber/cucumber` from `^12.9.0` to `13.3.0`, regenerate the lock, review official migration notes and verify messages/formatter integration. Inspect `npm ls @cucumber/cucumber @cucumber/messages glob minimatch` and the resulting audit. No automatic Serenity upgrade, new glob override or weakening of smoke safety is included.
6. Update `docs/backlog.md` with exact before/after audit package counts and actual verification results. If Stage A alone clears HIGH but leaves three MODERATE package entries, record the residual open scope instead of calling SGR-MAINT-02 fully resolved. The owner may authorise Stage B or explicitly accept a bounded residual risk; neither follows implicitly from this plan.
7. Append `docs/implementation-logs/YYYY-MM-DD_sgr-maint-02-dependency-remediation.md` using the existing project template; update the plan Outcome and index after execution. Write the next numerical Saleor handover (currently expected v8) as Markdown/generated HTML under portfolio-root `session-notes/`, regenerate its ignored manifest and publish through a separate support-repository branch/PR. Preserve prior records.

## Verification

| Check | Required result/evidence |
|---|---|
| Baseline/negative security control | Original lock audit contains the known Zod HIGH finding and `npm audit --audit-level=high` fails; retain actual result. If advisory state changes, explain rather than manufacture a failure |
| Candidate graph | Stage A resolves Zod 4.6.6 or newly approved patched version only under the intended parent; existing direct resolved versions remain unchanged; clean install succeeds |
| Audit | Stage A zero HIGH/CRITICAL; full JSON reports remaining severities separately. Stage B aims to remove the three current MODERATE package findings; investigate any new or remaining findings |
| Required project gate | `npm run verify` passes: typecheck, unit, smoke-safety, schema contract, smoke, API, report completeness; record actual counts and durations, not inherited v7 counts |
| Reports | Fresh smoke/API Serenity output is non-empty, complete and renderable; inspect generated HTML and no Zod parsing regression. Existing contract/report negative cases continue to fail for deliberately broken/missing evidence |
| Runtime support | Run on CI Node 24 baseline; verify clean install and project gate on an available declared Node 22 runtime or explicitly record that support check as pending |
| Regression scope | Preserve smoke read-only filtering, embedded-SUT selection and schema breaking-change negative tests. No live production mutations |
| Publication | Green PR CI at exact head, owner merge, exact-main CI, safe main fast-forward and only merged task-branch cleanup; separate handover PR |

Do not add artificial tests merely asserting lockfile text. Existing meaningful report/schema tests plus an unchanged negative audit baseline and clean dependency graph provide evidence. If a reporter compatibility defect is found, reproduce it with a focused fixture before changing code and obtain approval for that extra scope.

**Uncertainty.** No candidate graph has been installed, no Zod override has been exercised, and no Cucumber 13 regression suite has run. A zero-HIGH audit is a proposed acceptance condition, not a result from this investigation. Current CI lacks an audit step; adding a persistent audit gate may be useful but is a separate owner decision, outside this bounded repair.

## Delivery

**Publication authorisation (2026-11-03).** The owner authorised committing, pushing and merging these planning documents through PRs. This authorises documentation publication only; the implementation plan remains proposed and its execution still awaits approval. Earlier statements about no commits or PRs describe the investigation stage.

Planning only: no implementation, dependency edits, branch changes, commits, pushes or PR creation. Owner approval precedes Stage A, and Stage B needs its own explicit scope decision. Gary retains merge authority. Use a draft project PR and separate support handover PR; no automatic merge. Preserve the approved plan body and append outcome evidence.

**Non-goals:** Saleor application/schema/image upgrades; live Docker acceptance; notification/automation changes; renewed braces watch; framework-wide refresh; permanent audit suppression; automatically accepting remaining risk. No Docker operation is required for the embedded gate. If a later authorised live validation needs Docker, first verify storage at `E:\_DockerData` and preserve existing services/volumes.

## Decisions put to the owner

| Decision | Options | Recommended | Owner's answer |
|---|---|---|---|
| HIGH remediation | Scoped Zod override / wait for upstream / broader upgrade | Approve Stage A scoped exact 4.6.6 override, conditional on reporter compatibility gates | Approved Stage A (`2026-11-03`) |
| MODERATE chain | Separate Cucumber 13 stage / defer with open record / accept residual risk | Separate Stage B after Stage A evidence; no forced glob override | Retained as separate Stage B decision after Stage A evidence |
| Persistent CI audit gate | Add now / separate follow-up | Separate follow-up; retain manual audit acceptance here | Separate follow-up; manual audit acceptance retained |
| Publication | Owner-reviewed draft PRs / direct main | Separate project and handover PRs; owner merges | Approved — separate draft project and handover PRs |

## Outcome

Assessment and proposed plan completed on 3 November 2026. The current audit reproduces five affected packages and identifies a bounded candidate for the HIGH chain plus a distinct parent-major option for the MODERATE chain. No implementation or compatibility success is claimed.

**Stage A execution outcome (2026-11-03):** Following owner approval on 3 November 2026, Stage A was implemented on `codex/sgr-maint-02-dependency-remediation` from `main` (`ba76ef626a51685597fb05e6fa18fb59d744c631`):

- **Baseline verification:** Pre-change `npm audit --audit-level=high --package-lock-only --ignore-scripts` exited `1` with `5` affected packages (`2 HIGH, 3 MODERATE, 0 LOW/CRITICAL`). Pre-change `npm run verify` exited `0` in `37.14 s`.
- **Candidate graph & clean install:** Added `"overrides": { "@serenity-js/html-reporter": { "zod": "4.6.6" } }` in `package.json` and regenerated `package-lock.json` on Node `v24.18.0`. The lockfile diff modifies only `node_modules/zod` (`4.4.3` → `4.6.6`) and the root `"overrides"` entry; all six `@serenity-js/*` packages remain at `3.46.0` and `@cucumber/cucumber` remains at `12.9.0`. Clean `npm ci` and `npm ls zod @serenity-js/html-reporter @serenity-js/core @serenity-js/web` confirmed `@serenity-js/html-reporter@3.46.0` → `zod@4.6.6 overridden`.
- **Post-change audit & verification gate:** `npm audit --audit-level=high --package-lock-only --ignore-scripts` exited `0` (`0 HIGH, 0 CRITICAL, 0 LOW, 3 MODERATE`). Full `npm run verify` exited `0` in `39.04 s` (`typecheck` clean, `56/56` unit tests across 14 suites in `5,148.72 ms`, `check:smoke-safety` 0 violations across 9 scenarios, `35/35` contract tests across 6 suites in `3,819.57 ms`, `3/3` smoke scenarios, `9/9` API scenarios, and `check:reports` `Complete reports: smoke=3, api=9; landing page generated.`). Traced `@serenity-js/html-reporter` Zod v4 schemas (`RunDataSchema.js`, `validation.js`, `ReportSummaryJson.js`) and inspected rendered artefacts under `target/site/serenity/`. Node 22 runtime check remains pending on this single-Node (`v24.18.0`) workstation.
- **Residual MODERATE scope:** The 3 MODERATE package findings (`glob`, `minimatch`, `@cucumber/cucumber`) remain recorded openly under `SGR-MAINT-02` (`MEDIUM` priority in `docs/backlog.md` v11) pending a separate Stage B decision. Evidence recorded in [2026-11-03_sgr-maint-02-dependency-remediation.md](../implementation-logs/2026-11-03_sgr-maint-02-dependency-remediation.md).

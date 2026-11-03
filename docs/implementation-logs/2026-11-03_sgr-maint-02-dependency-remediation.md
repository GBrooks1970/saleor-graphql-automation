<!--
  AUDIENCE: Engineers and AI agents reviewing development session history.
  PURPOSE:  Record what was built, what was decided, what broke, and what was learned
            during a development session. Immutable once written — append only.
  LOCATION: docs/implementation-logs/YYYY-MM-DD_[topic].md
  TEMPLATE: docs/templates/implementation-log.template.md
-->

# SGR-MAINT-02 Stage A: Scoped Zod Override & Dependency Compatibility Remediation — 2026-11-03

## Session Summary

Implemented Stage A of the approved [SGR-MAINT-02 implementation plan](../implementation-plans/2026-11-03_sgr-maint-02-dependency-compatibility.md) to eliminate the two HIGH-severity `npm audit` findings (`zod` advisory [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) and its dependent `@serenity-js/html-reporter@3.46.0`) using a parent-scoped npm override (`"@serenity-js/html-reporter": { "zod": "4.6.6" }`). All six `@serenity-js/*` packages remain locked at `3.46.0` and `@cucumber/cucumber` remains at `12.9.0`; `npm audit --audit-level=high --package-lock-only --ignore-scripts` now exits `0` (`0 HIGH`, `0 CRITICAL`, `0 LOW`, `3 MODERATE`), and the full embedded-SUT verification gate (`npm run verify`) passed in **39.04 s**. The three residual MODERATE findings (`glob`, `minimatch`, `@cucumber/cucumber`) remain openly recorded under `SGR-MAINT-02` (`MEDIUM` priority in `docs/backlog.md` v11) for a separate Stage B decision, and `SGR-MAINT-01`'s stale pending-publication status was reconciled with merged PR #24 (`2449d7df6420d2561444fcab3dcb1e2b3137a452`).

---

## Objectives

1. ✅ Recheck `main` (`ba76ef626a51685597fb05e6fa18fb59d744c631`), open PRs (`0`), and live npm registry metadata (`@serenity-js/html-reporter@3.49.0` still pins `zod: "4.6.5"`; `zod` patched in `4.6.6`); create branch `codex/sgr-maint-02-dependency-remediation` and capture baseline `npm audit` and `npm run verify` results.
2. ✅ Apply Stage A parent-scoped override (`"@serenity-js/html-reporter": { "zod": "4.6.6" }`) in `package.json` and regenerate `package-lock.json` on Node `v24.18.0`, confirming only `node_modules/zod` (`4.4.3` → `4.6.6`) changes in the resolved dependency graph.
3. ✅ Run clean `npm ci`, verify `npm ls zod @serenity-js/html-reporter @serenity-js/core @serenity-js/web`, confirm `npm audit --audit-level=high` exits `0`, and run the full `npm run verify` gate (`typecheck`, `test:unit`, `check:smoke-safety`, `test:contract`, `test:smoke`, `test:api`, `check:reports`).
4. ✅ Trace `@serenity-js/html-reporter` Zod v4 schema usage (`RunDataSchema.js`, `validation.js`, `ReportSummaryJson.js`) and inspect generated Serenity HTML/JSON report artefacts under `target/site/serenity/`.
5. ✅ Reconcile `docs/backlog.md` (v11), `docs/implementation-plans/_index.md`, `WORKLIST_saleor-graphql-automation.md`, and author companion walkthrough and Handover v8 records.
6. ⏸️ Stage B (`@cucumber/cucumber` `12.9.0` → `13.3.0` major upgrade to clear the 3 MODERATE `glob`/`minimatch`/`@cucumber/cucumber` findings) — deferred as a separate owner decision per the approved plan.

---

## Test Results

| Stack | Suite / Check | Before (`ba76ef6`) | After (Stage A) | Status |
|---|---|---|---|---|
| Security Audit | `npm audit --audit-level=high --package-lock-only --ignore-scripts` | Exit `1`: `5` vulnerabilities (`2 HIGH, 3 MODERATE, 0 LOW/CRITICAL`) | Exit `0`: `3` vulnerabilities (`0 HIGH, 3 MODERATE, 0 LOW/CRITICAL`) | ✅ PASS |
| TypeScript | `npm run typecheck` (`tsc --noEmit`) | 0 errors | 0 errors | ✅ PASS |
| Node Test Runner | `npm run test:unit` | `56/56` across 14 suites (`6,365.77 ms`) | `56/56` across 14 suites (`5,148.72 ms`) | ✅ PASS |
| Smoke Guard | `npm run check:smoke-safety` | 9 scenarios inspected (`3 @smoke`), 0 violations | 9 scenarios inspected (`3 @smoke`), 0 violations | ✅ PASS |
| Schema Contract | `npm run test:contract` | `35/35` across 6 suites (`3,872.22 ms`) | `35/35` across 6 suites (`3,819.57 ms`) | ✅ PASS |
| Serenity / Cucumber | `npm run test:smoke` (`@smoke and not @mutating`) | `3/3` scenarios (`11/11` steps) | `3/3` scenarios (`11/11` steps, `2,300 ms` real) | ✅ PASS |
| Serenity / Cucumber | `npm run test:api` (`@api`) | `9/9` scenarios (`49/49` steps, `2,643 ms` real) | `9/9` scenarios (`49/49` steps, `2,879 ms` real; Order `#21` created in embedded SUT) | ✅ PASS |
| Report Gate | `npm run check:reports` | `Complete reports: smoke=3, api=9; landing page generated.` | `Complete reports: smoke=3, api=9; landing page generated.` | ✅ PASS |
| Full Gate | `npm run verify` | Exit `0` in **37.14 s** (`37.1375759 s`) | Exit `0` in **39.04 s** (`39.0403702 s`) | ✅ PASS |

**Runtime note:** All local installs, audits, and verification runs executed on Windows 11 with Node `v24.18.0` and npm `11.11.0`, matching the CI Node 24 baseline and the project's `^22.22.2 || ^24.15.0` engine declaration. Because this workstation has only Node `v24.18.0` installed, the optional local Node 22 runtime check is explicitly recorded as pending per the plan's Verification matrix.

---

## Changes Implemented

### 1. Parent-Scoped `zod` Override in `package.json` and `package-lock.json`

**Files changed:**
- `package.json` — added `"overrides": { "@serenity-js/html-reporter": { "zod": "4.6.6" } }` so that `@serenity-js/html-reporter@3.46.0` resolves `zod@4.6.6` (the minimum version patching [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)) without modifying any direct dependency range.
- `package-lock.json` — regenerated via `npm install --package-lock-only --ignore-scripts` and verified with `npm ci`. Only `packages[""].overrides` and `packages["node_modules/zod"]` (`4.4.3` → `4.6.6`) changed; all six `@serenity-js/*` packages remain at `3.46.0` and `@cucumber/cucumber` remains at `12.9.0`.

```json
  "overrides": {
    "@serenity-js/html-reporter": {
      "zod": "4.6.6"
    }
  },
```

**Resolved dependency tree (`npm ls zod @serenity-js/html-reporter @serenity-js/core @serenity-js/web`):**

```text
saleor-graphql-automation@0.1.0
├─┬ @serenity-js/assertions@3.46.0
│ └── @serenity-js/core@3.46.0 deduped
├─┬ @serenity-js/console-reporter@3.46.0
│ └── @serenity-js/core@3.46.0 deduped
├── @serenity-js/core@3.46.0
├─┬ @serenity-js/cucumber@3.46.0
│ └── @serenity-js/core@3.46.0 deduped
├─┬ @serenity-js/html-reporter@3.46.0
│ └── zod@4.6.6 overridden
└─┬ @serenity-js/web@3.46.0
  ├── @serenity-js/assertions@3.46.0 deduped
  └── @serenity-js/core@3.46.0 deduped
```

**Override removal trigger:** Remove `overrides["@serenity-js/html-reporter"].zod` when `@serenity-js/html-reporter` is upgraded to an upstream release that declares `zod >= 4.6.6` natively (as of 3 November 2026, `@serenity-js/html-reporter@3.49.0` still pins `zod: "4.6.5"`).

### 2. Reporter Zod Schema Compatibility Trace & Artefact Inspection

Inspected `@serenity-js/html-reporter@3.46.0` under `node_modules/@serenity-js/html-reporter/lib/report/` to trace how Zod is invoked during report generation:
- `RunDataSchema.js` — defines `OutcomeCountsSchema`, `TagRecordSchema`, `TestRunnerSchema`, `ModuleRecordSchema`, and `RunDataSchema` using `z.object()`, `z.string()`, `z.number()`, `z.array()`, and `z.record()`.
- `ReportSummaryJson.js` — defines `SummaryTotalsSchema`, `SummaryRunInfoSchema` (using Zod v4 `z.iso.datetime()`), and `ReportSummaryJsonSchema`.
- `validation.js` — formats `ZodError` issues via `error.issues`.

After running `npm run verify` with `zod@4.6.6`, verified that all generated report artefacts in `target/site/serenity/` were non-empty, schema-valid, and passed `npm run check:reports`:
- `target/site/serenity/index.html` (`1,355` bytes)
- `target/site/serenity/smoke/index.html` (`558,879` bytes), `smoke/data.js` (`31,870` bytes), `smoke/summary.json` (`1,276` bytes), `smoke/test-runs/current/smoke-1/db.json` (`19,005` bytes)
- `target/site/serenity/api/index.html` (`558,879` bytes), `api/data.js` (`127,197` bytes), `api/summary.json` (`1,597` bytes), `api/test-runs/current/api-1/db.json` (`73,765` bytes)

### 3. Backlog & Status Reconciliation (`SGR-MAINT-01` and `SGR-MAINT-02`)

**Files changed:**
- `docs/backlog.md` — bumped to `v11` (`2026-11-03`). Updated `SGR-MAINT-01` from `"documentation publication awaiting owner review"` to `"Done 2026-11-01; merged in PR #24 (2449d7d, 2026-11-02); exact-main CI passed"`. Updated `SGR-MAINT-02` to record Stage A HIGH remediation (`2 HIGH → 0 HIGH`), the override removal trigger, and the residual open MODERATE scope (`3 MODERATE` packages: `glob`, `minimatch`, `@cucumber/cucumber`, tracked at `MEDIUM` priority pending a separate Stage B decision).
- `docs/implementation-plans/2026-11-03_sgr-maint-02-dependency-compatibility.md` and `docs/implementation-plans/_index.md` — recorded owner approval of Stage A, appended the empirical Stage A outcome, and updated index statuses for `SGR-MAINT-01` and `SGR-MAINT-02`.

---

## Technical Decisions

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Scope the `zod: "4.6.6"` override under `@serenity-js/html-reporter` | Replaces only the vulnerable `zod@4.4.3` transitive pin with the minimum patched Zod v4 release (`4.6.6`) while leaving all six `@serenity-js/*` packages at `3.46.0` | Upgrading `@serenity-js/html-reporter` to `3.49.0` (which still pins `zod@4.6.5` and leaves the HIGH advisory open) or applying an unscoped global override |
| Keep `@cucumber/cucumber` at `12.9.0` in Stage A and record the 3 MODERATE findings openly | Clearing `glob` (`GHSA-3g3m-2fjr-6pw4`) and `minimatch` (`GHSA-g3hv-75wg-m249`) requires a major upgrade to `@cucumber/cucumber@13.3.0` (`Stage B`), which the plan separates from Stage A | Forcing `glob@14` / `minimatch@11` under `@cucumber/cucumber@12.9.0` or claiming `SGR-MAINT-02` is fully closed when 3 MODERATE findings remain |
| Document explicit override removal trigger | Ensures the temporary override is retired once `@serenity-js/html-reporter` adopts `zod >= 4.6.6` upstream | Leaving an undocumented permanent override in `package.json` |

---

## Documentation Updates

- `docs/backlog.md` — updated to `v11` with `SGR-MAINT-01` merge evidence (`PR #24`, `2449d7d`) and `SGR-MAINT-02` Stage A delivery (`HIGH: 0`, `MEDIUM: 1`).
- `docs/implementation-plans/2026-11-03_sgr-maint-02-dependency-compatibility.md` — updated frontmatter, owner decision table, and `## Outcome`.
- `docs/implementation-plans/_index.md` — updated `SGR-MAINT-02` and `SGR-MAINT-01` status rows.
- `docs/implementation-logs/2026-11-03_sgr-maint-02-dependency-remediation.md` — this implementation log.
- `docs/walkthroughs/2026-11-03_sgr-maint-02-dependency-remediation.md` — durable repository walkthrough archive.
- Portfolio root `WORKLIST_saleor-graphql-automation.md` and `session-notes/saleor-graphql-automation_session-notes_v8_*.md` / `.html` — published via a separate portfolio support PR.

---

## Lessons Learned

- Checking upstream registry metadata (`npm view @serenity-js/html-reporter@3.49.0 dependencies.zod`) before upgrading saves unnecessary churn: the latest upstream reporter still pinned `zod@4.6.5`, making a parent-scoped `zod@4.6.6` override the only surgical way to clear `GHSA-mrhx-c7xc-m3w5` without waiting for another upstream release.
- Separating `npm audit --audit-level=high` (the Stage A gate) from full `npm audit` output keeps security reporting honest: Stage A eliminates all HIGH/CRITICAL findings (`2 HIGH → 0 HIGH`) while preserving visibility into the 3 MODERATE findings tied to `@cucumber/cucumber@12.9.0`.

---

## Recommendations / Next Steps

- [ ] Review and merge the Stage A draft PR on `GBrooks1970/saleor-graphql-automation` and the companion Handover v8 draft PR on `GBrooks1970/test-automation-portfolio` — **Owner**
- [ ] Decide whether to authorise **Stage B** (`@cucumber/cucumber` `12.9.0` → `13.3.0` migration in a separate branch/PR) or accept the bounded residual MODERATE risk for `glob`/`minimatch`/`@cucumber/cucumber` under [SGR-MAINT-02](../backlog.md#sgr-maint-02-current-dependency-compatibility-review-and-stage-a-high-remediation) — **Owner / MEDIUM**
- [ ] Remove `overrides["@serenity-js/html-reporter"].zod` once `@serenity-js/html-reporter` publishes a release depending on `zod >= 4.6.6` natively — **Maintenance**

---

*Session logged: 2026-11-03. Author: Antigravity.*

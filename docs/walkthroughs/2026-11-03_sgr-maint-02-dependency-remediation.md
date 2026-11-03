# Walkthrough — SGR-MAINT-02 (Stage A): Scoped Zod Override & Dependency Compatibility Remediation

Addresses Stage A of `SGR-MAINT-02` in `saleor-graphql-automation` ([2026-11-03_sgr-maint-02-dependency-compatibility.md](../implementation-plans/2026-11-03_sgr-maint-02-dependency-compatibility.md)).

---

## 1. Executive Summary

- **Objective:** Clear the two HIGH-severity `npm audit` findings (`zod` advisory [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), affecting `<4.6.6`, and its dependent `@serenity-js/html-reporter@3.46.0`) with the smallest bounded dependency change while keeping all six `@serenity-js/*` packages at `3.46.0` and `@cucumber/cucumber` at `12.9.0`, preserving the full embedded-SUT verification and Serenity HTML report pipeline, and recording the residual 3 MODERATE findings (`glob`, `minimatch`, `@cucumber/cucumber`) for a separate Stage B decision.
- **Branch:** `codex/sgr-maint-02-dependency-remediation` (based on `main` @ `ba76ef626a51685597fb05e6fa18fb59d744c631`).
- **Audit Gate (`npm audit --audit-level=high`):** Reduced HIGH findings from **2 to 0** (exit code `1` → `0`; `0 HIGH, 0 CRITICAL, 0 LOW, 3 MODERATE` remaining).
- **Verification Gate (`npm run verify`):** 100% green in **39.04 s** (`typecheck` clean, `56/56` unit tests across 14 suites, `check:smoke-safety` 0 violations across 9 scenarios, `35/35` contract tests across 6 suites, `3/3` smoke scenarios, `9/9` API scenarios, and `check:reports` `Complete reports: smoke=3, api=9; landing page generated.`).

---

## 2. Key Changes Implemented

### 2.1 Parent-Scoped `zod` Override (`package.json` & `package-lock.json`)
- **Files:**
  - `package.json`
  - `package-lock.json`
- Added a parent-scoped npm override under `@serenity-js/html-reporter`:
  ```json
  "overrides": {
    "@serenity-js/html-reporter": {
      "zod": "4.6.6"
    }
  }
  ```
- Regenerated `package-lock.json` on Node `v24.18.0` (`npm 11.11.0`) and verified clean installation via `npm ci`.
- Confirmed via `git diff package-lock.json` and `npm ls zod @serenity-js/html-reporter @serenity-js/core @serenity-js/web` that **only** `node_modules/zod` (`4.4.3` → `4.6.6`) changed in the resolved dependency graph; all six `@serenity-js/*` packages remain locked at `3.46.0` and `@cucumber/cucumber` remains at `12.9.0`.
- **Override Removal Trigger:** Remove `overrides["@serenity-js/html-reporter"].zod` once `@serenity-js/html-reporter` is upgraded to an upstream release that declares `zod >= 4.6.6` natively (at execution time on 3 November 2026, latest `@serenity-js/html-reporter@3.49.0` still pinned `zod: "4.6.5"`).

### 2.2 Serenity HTML Reporter Zod v4 Compatibility Verification
- Traced `@serenity-js/html-reporter@3.46.0` Zod schema usage in `node_modules/@serenity-js/html-reporter/lib/report/`:
  - `RunDataSchema.js` (`OutcomeCountsSchema`, `TagRecordSchema`, `TestRunnerSchema`, `ModuleRecordSchema`, `RunDataSchema`)
  - `ReportSummaryJson.js` (`SummaryTotalsSchema`, `SummaryRunInfoSchema` using Zod v4 `z.iso.datetime()`, `ReportSummaryJsonSchema`)
  - `validation.js` (`formatZodError`)
- Verified generated report files under `target/site/serenity/` after running `npm run verify`:
  - `target/site/serenity/index.html` (`1,355` bytes)
  - `target/site/serenity/smoke/index.html` (`558,879` bytes), `smoke/data.js` (`31,870` bytes), `smoke/summary.json` (`1,276` bytes), `smoke/test-runs/current/smoke-1/db.json` (`19,005` bytes)
  - `target/site/serenity/api/index.html` (`558,879` bytes), `api/data.js` (`127,197` bytes), `api/summary.json` (`1,597` bytes), `api/test-runs/current/api-1/db.json` (`73,765` bytes)

### 2.3 Documentation & Backlog Reconciliation (`SGR-MAINT-01` & `SGR-MAINT-02`)
- **Files:**
  - `docs/backlog.md` (bumped to `v11`)
  - `docs/implementation-plans/2026-11-03_sgr-maint-02-dependency-compatibility.md`
  - `docs/implementation-plans/_index.md`
  - `docs/implementation-logs/2026-11-03_sgr-maint-02-dependency-remediation.md`
- Reconciled `SGR-MAINT-01` with merged PR #24 (`2449d7df6420d2561444fcab3dcb1e2b3137a452`, merged `2026-11-02T18:27:41Z`).
- Updated `SGR-MAINT-02` to record Stage A HIGH remediation (`2 HIGH → 0 HIGH`) and retain the 3 MODERATE findings (`glob`, `minimatch`, `@cucumber/cucumber`) at `MEDIUM` priority pending a separate Stage B decision (`HIGH: 0, MEDIUM: 1, LOW: 0, Total: 1`).

---

## 3. Verification & Validation Evidence

### 3.1 Dependency Graph & Security Audit (`npm ls` & `npm audit`)
```text
$ npm ls zod @serenity-js/html-reporter @serenity-js/core @serenity-js/web
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

$ npm audit --audit-level=high --package-lock-only --ignore-scripts
# exit code: 0 (0 high, 0 critical, 0 low, 3 moderate)
```

### 3.2 Full Verification Gate (`npm run verify`)
```text
> saleor-graphql-automation@0.1.0 verify
> npm run typecheck && npm run test:unit && npm run check:smoke-safety && npm run test:contract && npm run test:smoke && npm run test:api && npm run check:reports

ℹ tests 56 | suites 14 | pass 56 | fail 0 | duration_ms 5148.7209
[check-smoke-safety] Inspected 9 scenarios (3 @smoke).
[check-smoke-safety] Safety check passed: zero @smoke scenarios are tagged with @mutating or execute mutations.
ℹ tests 35 | suites 6 | pass 35 | fail 0 | duration_ms 3819.5698
Smoke: 3 scenarios (3 passed), 11 steps (11 passed)
API:   9 scenarios (9 passed), 49 steps (49 passed) [Order #21 created in embedded SUT]
Complete reports: smoke=3, api=9; landing page generated.
```
Total wrapper duration: **39.04 s** (`39.0403702 s`), exit code `0`.

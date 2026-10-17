# Dependency maintenance - 2026-10-18

The owner instructed merge and continue. SGR-P3-02 is merged through PR #20 at `c799d0710e7e70fcceb12492ce49e9020126b298`. Exact-main CI `39078903688` and manual monitor run `39078905171` passed. The monitor retained JSON/Markdown evidence: compatible, zero domain breaks, 117 other differences. This starts the next outstanding maintenance item from a clean verified main.

## Scope

Refresh the transitive `brace-expansion` dependency from 5.0.9 to patched 5.0.12 within `minimatch`'s existing `^5.0.8` range. Retain Serenity versions and avoid npm audit's proposed downgrade to Serenity 2.x. Update monitor completion evidence and record remaining audit exposure. Publication of this new maintenance branch is separate from the preceding monitor merge.

## Evidence and checks

The initial audit reports 10 high affected packages. `brace-expansion` has patched releases; `braces` remains at latest 3.0.3 with no patched version for GHSA-vfj7-8cjw-p6xm. References: https://github.com/advisories/GHSA-q2hr-2g5m-vwhr and https://github.com/advisories/GHSA-vfj7-8cjw-p6xm.

Run a targeted transitive update, inspect the lockfile diff, rerun `npm audit`, `npm run verify` and `git diff --check`. No new behaviour tests are needed for a dependency patch covered by the existing gate. Record residual findings explicitly; do not describe a partial audit improvement as a clean audit.

## Verification outcome

`npm update brace-expansion --ignore-scripts` changed exactly one installed package. The lockfile diff changes only its version, resolved URL and integrity from 5.0.9 to 5.0.12. `package.json` and the Serenity versions are unchanged.

The audit no longer lists `brace-expansion`; high affected-package count fell from 10 to 9, all residual findings trace to the unpatched `braces` chain. `npm run verify` exited 0: 56 unit tests in 14 suites (8319.9712 ms), 35 contract tests in 6 suites (3022.301 ms), 3 smoke scenarios and 9 API scenarios; report validation passed. `git diff --check` passed.

Project monitor-completion records and the separately owned portfolio worklist were reconciled locally. The dependency patch and documentation remain uncommitted; no maintenance PR or portfolio-root publication was performed in this batch.

## Publication authorisation

The owner subsequently instructed: "Commit push create PR and merge, then continue". Publish this verified patch through its own PR, require successful PR checks before merging, and verify CI against the resulting exact main SHA. Continue the portfolio worklist and handover reconciliation in a separate root-repository PR.

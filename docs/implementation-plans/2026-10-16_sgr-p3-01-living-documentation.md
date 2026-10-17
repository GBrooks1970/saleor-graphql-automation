---
version: 1
created: 2026-10-16
project: saleor-graphql-automation
type: implementation-plan
item: SGR-P3-01
status: complete
approved: 2026-10-16, owner instructed proceeding to the next item after merging TRIAGE-07; implementation authorised
delivered: PR 19 merged 2026-10-16; exact-main CI and hosted acceptance passed
language: en-GB
---

# Implementation plan: SGR-P3-01 living documentation

**Goal.** Generate inspectable Serenity HTML reports from actual Cucumber execution, retain them in CI and prepare deployment through GitHub Pages.

## Evidence gathered before planning

Read-only inspection of the repository, installed packages, official Serenity documentation and GitHub state established:

| Finding | Consequence |
|---|---|
| TRIAGE-07 merged via PR #18 at `4ca143309ffc74faf957d913434f91a680a94fd1`; exact-main CI run `38898150194` passed. | Start reporting from that verified baseline. |
| Canonical backlog v4 leaves SGR-P3-01 and SGR-P3-02 open; the portfolio worklist still lists delivered TRIAGE-06/07 as open. | Reporting is next; preserve the historical handover and flag separate portfolio reconciliation. |
| Cucumber profiles use only the summary formatter; installed Serenity packages resolve to 3.46.0. | Register the existing Cucumber adapter and console reporter; add the matching HTML reporter and its web peer at 3.46.0. |
| The native HTML reporter generates static files without Java. | Use the native reporter rather than introduce the Java-based Serenity BDD CLI. |
| Smoke contains 3 scenarios, API contains all 9, with overlap. | Separate suite directories and a simple landing page; clear each suite's previous output before execution. |
| Pages API returns HTTP 404: no Pages site configured. | Prepare the workflow and document the Actions-source setting; do not claim a deployed site before deployment evidence exists. |

## Steps

1. Record this plan and index entry before code changes. Append TRIAGE-07 merge evidence to its existing plan.
2. Add exact `@serenity-js/html-reporter@3.46.0` and `@serenity-js/web@3.46.0` dependencies in `package.json` and `package-lock.json`; retain the installed framework versions.
3. Configure the Serenity adapter in `cucumber.json` and console/HTML crew in `features/support/hooks.ts`. Add a portable `scripts/run-cucumber.mjs` wrapper that selects a suite output directory and removes only that directory's previous generated output before running Cucumber. Preserve scenario exit status.
4. Add report completeness validation and tests under `scripts/` and `tests/unit/`, plus a generated landing page linking separate smoke/API reports. Wire report checks into `npm run verify` without suppressing failures. Reports remain under ignored `target/`.
5. Extend `.github/workflows/ci.yml` to retain reports even when tests fail, upload a Pages artefact only after successful main verification, and deploy from a separate job with narrowly scoped permissions and deployment concurrency. Use current official actions: upload-artifact v7, upload-pages-artifact v5, deploy-pages v5; preserve checkout/setup-node v7 and Node 24.
6. Add `features/README.md` for report capability context and `docs/reporting.md` for generation, evidence boundaries, CI artefacts and Pages setup. Update current README/design claims and add explicit SGR-P3-01 acceptance details to `docs/backlog.md` without marking deployment complete prematurely.
7. Validate actual reports, negative report checks and all existing verification; visually inspect generated HTML; append empirical outcomes.

## Verification

- Full `npm run verify`: typecheck, unit and contract suites, smoke/API Cucumber execution and generated-report completeness checks.
- Assert expected suite coverage and passing outcomes; reject missing, empty or failed report data with non-zero exit. Confirm a failed Cucumber invocation still generates diagnostic output and returns non-zero.
- Check rendered scenario details and capability documentation in a browser; no claim of HTTP exchange capture by the custom GraphQL ability.
- Validate workflow YAML, action manifests, main-only deployment conditions and `git diff --check`.
- Hosted artefact retention and Pages URL checks require publication and an actual deployment; local generation alone does not complete hosted acceptance.

## Delivery

Branch: `codex/saleor-sgr-p3-01-living-docs`. Prepare and validate implementation locally. Owner approval on 2026-10-16 now authorises publication, merge and CI verification of this item, including the documented Pages activation prerequisite. Prior approval covered merging PR #18. No portfolio-root commit is included in the project repository.

## Decisions put to the owner

| Decision | Options | Recommended | Owner's answer |
|---|---|---|---|
| Reporting engine | Native Serenity HTML or Java-backed Serenity BDD | Native HTML matching installed 3.46.0 | Routine implementation choice within the instruction to proceed to the next backlog item. |
| Suite representation | Combine overlapping runs or retain separate suite reports | Separate smoke/API reports | Resolved within scope to preserve truthful counts. |
| Publication | Local preparation followed by PR and main deployment | Review validated implementation before publication | Owner approved merge and CI verification on 2026-10-16. |

## Implementation and empirical verification outcome — 2026-10-16

- Added native HTML reporting and its web peer at exact version 3.46.0, retaining the installed Serenity framework version. Updated declared Node support to the installed framework engines (`^22.22.2 || ^24.15.0`); CI remains Node 24.
- The initial reporting probe passed Cucumber but emitted no report. Root cause: Cucumber keeps only one stdout formatter; adding `summary` after the Serenity adapter replaces the adapter. Using the adapter alone and configuring `ConsoleReporter` restored report generation. Missing output is now a failing gate condition.
- Full `npm --prefix saleor-graphql-automation run verify` exited 0: typecheck passed; **56/56 unit tests in 14 suites** (3935.5376 ms), **23/23 contract tests in 5 suites** (1393.609 ms), **3/3 smoke scenarios** (213 ms scenario time, 916 ms reporter real time), **9/9 API scenarios** (1080 ms scenario time, 1735 ms reporter real time). Smoke policy inspected all 9 scenarios with zero violations. Final check reported `Complete reports: smoke=3, api=9; landing page generated.`
- Eight report-integrity tests cover success, missing/empty output, omitted/substituted/duplicated scenarios, failure and skipped states, absent activities, inconsistent summaries, unsupported schemas, non-JSON executable payload rejection, inherited outline tags and stale landing-page removal.
- A temporary assertion mismatch in the shop-name scenario produced **Cucumber exit 1** and a report with **1 failed scenario** (131 ms). The report validator also exited 1 with `Unsuccessful scenario`. The original feature was restored byte-for-byte in a finally block. Probe diagnostics are ignored under `target/`; they are not source changes.
- Browser inspection through a loopback HTTP server verified the landing page, the API dashboard (9 passing), the fulfilment scenario, expandable nested `Admin authenticates` activity and the capability narrative from `features/README.md`. The smoke dashboard also rendered 3/3 passing scenarios, zero failed, and its three catalogue scenario links. Browser presentation and navigation checks passed.
- Workflow YAML parsed successfully. Official action manifests were checked for Node 24 compatibility: upload-artifact v7, upload-pages-artifact v5, deploy-pages v5. PR jobs have read-only contents permission; deployment is restricted to successful main pushes and receives Pages/OIDC permissions separately. `git diff --check` passed.
- Dependency install reports **10 high-severity affected packages**. The two added reporter packages inherit existing vulnerable dependency chains; no new root advisory was introduced. The suggested Serenity audit fix would downgrade framework packages and was not applied. Dependency remediation remains a separate follow-up.
- **Not yet evidenced:** a CI run on this new branch, retained GitHub artifacts, Pages activation or a hosted deployment. The prior exact-main success is for TRIAGE-07 at `4ca143309ffc74faf957d913434f91a680a94fd1`, not for these uncommitted reporting changes.

## Publication authority update — 2026-10-16

The owner approved merge and CI verification, followed by the next item. Commit, push, PR creation, Pages activation and merge are the required steps for this reviewed implementation. Hosted completion will be recorded only after exact-main CI and browser evidence.

Pages activation succeeded through the repository API on 2026-10-16 (`build_type: workflow`, HTTPS enforced). The generated `github-pages` environment has a single deployment branch policy for `main`.

## Publication and hosted acceptance — 2026-10-16

- PR #19 head `009705bc6305d9fe3a4851d1c8777378b15517ae`; PR CI `38906564811` passed and retained the report artifact for its synthetic PR merge revision.
- Squash merge `7524176cc19921c1bbc5f9ca8959aa3aca9c2ffd`; exact-main CI `38906680249` passed both Verify and Publish living documentation. Local main fast-forwarded cleanly to that revision before SGR-P3-02 began.
- Main artifacts: `serenity-reports-7524176cc19921c1bbc5f9ca8959aa3aca9c2ffd` (357660 bytes) and `github-pages` (354768 bytes), neither expired at inspection.
- Browser inspection of https://gbrooks1970.github.io/saleor-graphql-automation/ confirmed the exact merge revision, API dashboard 9/9 and smoke dashboard 3/3, zero failures. SGR-P3-01 acceptance is complete.

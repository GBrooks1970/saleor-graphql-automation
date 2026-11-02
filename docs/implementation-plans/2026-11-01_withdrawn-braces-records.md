---
version: 1
created: 2026-11-01T11:51Z
project: saleor-graphql-automation
type: implementation-plan
item: SGR-MAINT-01
status: implemented
approved: "2026-11-01, owner instructed Action 2; implementation, validation and separate records authorised; owner retains merge authority"
delivered: "2026-11-01, locally implemented and validated; publication awaits owner review"
language: en-GB
---

# Implementation plan: reconcile withdrawn braces advisory records

**Goal.** Close the obsolete GHSA-vfj7-8cjw-p6xm risk in the authoritative backlog and portfolio worklist, with an explicit current risk summary, while retaining unrelated dependency concerns and the untested failure-alert-delivery boundary.

## Evidence gathered before planning

Read-only checks on 1 November 2026 inspected backlog v9, worklist and handover v6. Before branching, fetch confirmed project HEAD and origin/main both at `abd506e38c0c3f1f7c56d0e17155545d1959069a`; portfolio support starts at `fb4b0f2c68fa6811debd78ad3d4e7057ceed9c98`.

| Finding | Consequence for the plan |
|---|---|
| [GitHub's advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) records withdrawal on 23 October 2026 because it is not practically exploitable | Close only this advisory-based risk with dated source evidence |
| Backlog and worklist still describe the advisory as unpatched/open and its watch as active | Replace current claims with a dated reconciliation; preserve historical plans/logs/handovers |
| All 14 roadmap and seven TRIAGE items are delivered | Preserve their statuses |
| Prior monitoring identified a separate dependency-review topic | Obtain a fresh lockfile-only audit snapshot before claiming any overall risk count; record separate findings without changing dependencies |
| Notification settings and successful scheduled execution do not prove failure-alert receipt | Keep actual delivery explicitly untested |

## Steps

1. File this plan and add its row to `docs/implementation-plans/_index.md` before reconciliation.
2. Recheck the advisory with a read-only official-source query. Audit copies of `package.json` and `package-lock.json` in a temporary directory using `npm audit --package-lock-only --ignore-scripts --json`; hash the repository files before/after. Inspect current automation metadata read-only to avoid repeating a stale watch claim.
3. Update `docs/backlog.md` to v10: close SGR-MAINT-01, add an explicit priority/count summary and separately record any current dependency-review finding. Update only the corresponding current section of root `WORKLIST_saleor-graphql-automation.md`.
4. Run the existing `npm run verify` project gate. Append `docs/implementation-logs/2026-11-01_withdrawn-braces-records.md`, preserving every historical log.
5. Write root handover v7 as Markdown plus generated HTML using v6 styling; rebuild/check the manifest, verify generated-body/metadata parity and links, and record the plan outcome.

## Verification

- Negative baseline: an assertion that the braces risk is already closed must fail against backlog v9/worklist; after reconciliation it must pass.
- The official advisory's withdrawal date must be populated. No ongoing vulnerability claim may be based on that withdrawn advisory.
- Package and lockfile hashes must remain unchanged; audit findings outside braces remain visible and separately prioritised.
- Existing `npm run verify` must pass; record measured counts and duration. It exercises the embedded SUT and does not prove live Docker readiness.
- All 14 roadmap items remain Done. Worklist and backlog must agree about SGR-MAINT-01 and any separate open maintenance item.
- Handover v7 pair, manifest, relative links and `git diff --check` must pass.

## Delivery

Project branch: `codex/withdrawn-braces-records`; root records branch: `codex/status-quick-wins-records`. Keep project documents in the project commit and root worklist/handovers in the support commit. Create draft PRs after validation; owner authorises each merge. No dependency patch, framework downgrade, notification change, deliberate failed workflow, automation creation or deletion is included.

## Decisions put to the owner

| Decision | Options | Recommended | Owner's answer |
|---|---|---|---|
| Execute the stale-risk reconciliation | Close withdrawn advisory with evidence / retain stale claim | Close the specific record | Action 2 authorised, 2026-11-01 |
| Other dependency findings | Preserve separately / claim all dependencies healthy | Preserve separately | Included in the authorised Action 2 recommendation |
| Merge authority | Owner review after implementation / automatic merge | Owner review | No automatic merge authority requested or inferred |

## Outcome

Local implementation complete. Official withdrawal confirmed at 2026-10-23T12:53:02Z; fresh isolated audit has no braces finding. Five other affected packages remain grouped as SGR-MAINT-02 (one HIGH item); both package-manifest hashes are unchanged. The full verification gate passed in 48.598 s: 56 unit tests, 35 contract tests, 3 smoke and 9 API scenarios, complete reports. No braces watch is present; no automation or notification mutation was needed. Separate log and v7 Markdown/HTML handover are provided. Publication uses the approved project and support branches and awaits owner review; no dependency fix or live Docker acceptance is claimed.

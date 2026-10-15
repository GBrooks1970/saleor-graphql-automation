---
version: 1
created: 2026-10-15T14:33Z
project: saleor-graphql-automation
type: implementation-plan
item: TRIAGE-07
status: approved
approved: 2026-10-15, owner authorised implementation and subsequently commit, push and PR review; merge not yet authorised
delivered: not yet
language: en-GB
---

# Implementation plan: TRIAGE-07 typed Cucumber World and Task boundaries

**Goal.** Remove untyped project-owned step state and Task actor parameters while preserving scenario isolation and the deterministic verification gate.

## Evidence gathered before planning

Read-only inspection of the Saleor working copy, handover v3, canonical backlog v4, portfolio worklist and GitHub PR state established:

| Finding | Consequence for the plan |
|---|---|
| PR #17 is merged at `3ae08cc71af195571dde481f3a1c562b939700eb`; no open PRs; clean local main matches fetched origin/main. | TRIAGE-06 is delivered despite the stale handover/worklist entry; TRIAGE-07 is next. |
| Authentication and checkout steps cast scenario state with `this as any`. | Introduce a registered, explicitly typed World with optional state and prerequisite checks. |
| All 14 Task implementations accept `actor: any`. | Change every Task implementation to accept Serenity/JS `Actor`. |
| The Before hook already replaces actor abilities and shares a fresh checkout Notepad per scenario. | Preserve that behaviour in a directly testable helper and prove cross-actor sharing and cross-scenario isolation. |
| Cucumber's installed World class supports typed parameters; the strict TypeScript gate includes features and tests. | Use `World<Record<string, unknown>>` and compile-time negative checks without adding dependencies. |

## Steps

1. Add this plan, `docs/implementation-plans/_index.md`, and the shared template copy in `docs/templates/implementation-plan.template.md` before implementation.
2. Add `features/support/SaleorWorld.ts`, register it in `features/support/hooks.ts`, and type state-bearing callbacks in `features/step_definitions/auth_steps.ts` and `checkout_steps.ts`. Group credentials into one optional typed value; reject authentication without credentials.
3. Extract the existing Before-hook actor setup into `src/screenplay/actors/prepareScenarioActors.ts`. Preserve fresh GraphQL abilities and a shared checkout Notepad for Customer, Admin and Staff on each invocation.
4. Replace `any` actor parameters with `Actor` in all 14 files in `src/screenplay/tasks/`: Authenticate, BrowseCatalogue, CompleteCheckout, CreateCheckout, FulfillOrder, LocateOrder, QueryCurrentUser, QueryShopInfo, RecordCheckoutTransaction, RefreshToken, SelectCheckoutDeliveryMethod, SelectCheckoutVariant, SetCheckoutBillingAddress and SetCheckoutShippingAddress.
5. Add `tests/unit/scenario-state.spec.ts` for World isolation, missing prerequisites, within-scenario note sharing and fresh actor state. Add `tests/types/screenplay-boundaries.ts` to require rejection of invalid World values and non-Actor Task arguments.
6. Run targeted checks and `npm run verify`, inspect the final diff, then append observed results to this plan's Outcome section.

## Verification

- Strict typecheck must reject incorrect credentials, refresh token/channel types, undeclared World state and non-Actor arguments for every Task. Negative checks use `@ts-expect-error`, so weakening these boundaries makes the gate fail.
- Missing credentials must throw before authentication; a second World must not inherit the first World's credentials, refresh token or checkout channel.
- Customer, Admin and Staff must share checkout notes within a scenario. Preparing another scenario must reset notes, authentication and response state.
- Full `npm run verify`: typecheck, unit tests, smoke-safety, contract tests, smoke and API scenarios, using the embedded SUT.
- `git diff --check`; no explicit `any` remains in project-owned step definitions or Task signatures. No live Docker claim follows from this gate.

## Delivery

Work on `codex/saleor-triage-07-typed-world`. Prepare a locally validated change for review. The owner's request to merge the previous PR is already satisfied by PR #17; it does not authorise merging a future TRIAGE-07 PR. Publish this item only with explicit authority. Portfolio worklist reconciliation belongs to its separate repository.

## Decisions put to the owner

| Decision | Options | Recommended | Owner's answer |
|---|---|---|---|
| Next TRIAGE item | Repeat delivered TRIAGE-06 or implement TRIAGE-07 | TRIAGE-07 with typed World and Actor boundaries | Start next TRIAGE item, 2026-10-15; routine implementation choices resolved within that scope. |
| Reporting and dependencies | Expand to living documentation/dependency remediation or keep the typing scope | Keep TRIAGE-07 bounded | Existing approved worklist separates SGR-P3-01 and SGR-P3-02. |

## Outcome — local implementation, 2026-10-15

Implemented the planned World, state-bearing step annotations, actor setup helper and all 14 typed Task boundaries. Five runtime regression tests and 18 compile-time negative checks cover scenario isolation and invalid inputs. No feature scenarios or dependency versions changed.

Validation captured on branch `codex/saleor-triage-07-typed-world`, based on `3ae08cc71af195571dde481f3a1c562b939700eb`:

| Check | Observed result |
|---|---|
| Focused scenario-state tests | 5 passed, 0 failed; 8883.5955 ms runner duration |
| Negative type probe | Temporarily changing Authenticate's Actor parameter back to `any` made typecheck exit 2 with TS2578 at the corresponding negative assertion; original typed source restored in a finally block. |
| Full `npm run verify` | Exit 0 after restoring the typed implementation |
| Unit tests | 48 passed across 13 suites; 2852.8885 ms |
| Contract tests | 23 passed across 5 suites; 1649.8799 ms |
| Smoke safety | 9 scenarios inspected, 3 smoke; zero violations |
| Smoke scenarios | 3 passed, 11 steps passed; 0m00.222s |
| API scenarios | 9 passed, 49 steps passed; 0m01.040s |

An initial test-only attachment callback did not satisfy Cucumber's asynchronous attachment overload. The stub was corrected to return a Promise before the successful checks above. No other plan changes were required.

The World design follows [Cucumber's documented custom World and TypeScript callback pattern](https://github.com/cucumber/cucumber-js/blob/main/docs/support_files/world.md), cross-checked against installed declarations. Runtime scenarios used the embedded SUT; no live Docker verification was performed. Changes remain local and uncommitted; PR/default-branch CI and portfolio tracking updates remain pending publication.

## Publication authorisation — 2026-10-15

The owner subsequently instructed: "Action Recommended next step", referring to publishing TRIAGE-07 through PR review. Commit, push and PR creation are now authorised. The preceding local Outcome records the state before that instruction. The planned implementation is unchanged; hosted PR validation will be recorded on the pull request. Merge and exact-default-branch verification remain a subsequent approval step.

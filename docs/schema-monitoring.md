# Upstream schema monitoring (SGR-P3-02)

## Configuration and execution

The `Upstream schema monitor` workflow runs daily at **07:17 UTC** (08:17 BST / 07:17 GMT) and supports manual dispatch. GitHub may delay scheduled runs. It is independent of PR verification and Pages deployment.

The default source is the [official Saleor 3.23 schema file](https://raw.githubusercontent.com/saleor/saleor/3.23/saleor/graphql/schema.graphql), identified in [Saleor documentation](https://docs.saleor.io/developer/ai). No cloud instance, credentials or repository variable is needed. The 3.23 branch is tracked intentionally to detect updates; the baseline stays committed and reviewed.

```powershell
npm run monitor:schema
```

Settings are repository Actions variables in CI and environment variables locally:

| Setting | Default | Meaning |
|---|---|---|
| `SALEOR_SCHEMA_MONITOR_SOURCE` | `sdl` | `sdl` downloads text with GET; `introspection` queries a running API with POST. Other values fail. |
| `SALEOR_SCHEMA_MONITOR_URL` | Official 3.23 schema in SDL mode | Overrides the source URL. Required in introspection mode; no localhost fallback. |

Optional live mode:

```powershell
$env:SALEOR_SCHEMA_MONITOR_SOURCE = 'introspection'
$env:SALEOR_SCHEMA_MONITOR_URL = 'https://YOUR-INSTANCE.saleor.cloud/graphql/'
npm run monitor:schema
```

Replace the placeholder with a target that permits anonymous introspection. The monitor ignores `SALEOR_GRAPHQL_URL`, which controls other commands. URLs with credentials, query parameters or fragments are rejected. Authentication support is outside this implementation. Explicit loopback HTTP URLs are permitted for local tests; GitHub-hosted runners cannot reach a workstation's loopback service.

Both modes share the existing comparison engine and ADR-010 rules. Requests have a 15-second timeout; decoded SDL is limited to 10 MiB and must parse as a valid GraphQL schema. The job has a ten-minute timeout. Failures never fall back to another mode or offline self-comparison. Neither mode runs business mutations or changes the baseline. SDL results establish upstream source compatibility, not deployed API health or live business-journey acceptance.

## Outcomes and alerts

| Outcome | Exit | Meaning |
|---|---:|---|
| `compatible` | 0 | No domain breaks. Other changes remain visible for review. |
| `breaking` | 1 | Domain-breaking changes require investigation before promotion. |
| `unavailable` | 2 | Download, introspection or comparison failed; compatibility is unknown. |
| `configuration-error` | 2 | Invalid source mode/URL, missing live target or unreadable baseline. |

`target/schema-drift/report.json` records timestamp, source type, URL (`endpoint` field), baseline SHA-256, upstream SDL SHA-256, workflow revision, outcome and classified changes. The upstream hash identifies the downloaded bytes even if the branch advances; it is null in introspection mode. `summary.md` presents the result in Actions. Both files overwrite prior local reports, including on failure; generated reports are ignored by Git. Evidence-write failure returns exit 2.

CI retains reports for 30 days as `schema-drift-<run ID>-<attempt>`, including failed checks. Setup failures may leave no report; the job summary then explicitly states that compatibility is unknown. Failing exit codes are not suppressed.

**GitHub Actions is the alert destination.** Failed runs appear in Actions. Email/web delivery depends on GitHub notification settings. Scheduled notifications go to the workflow creator, or the user who last changed its cron schedule or re-enabled it. Confirm the intended recipient during operational acceptance. No email integration, Slack messages or issue creation is added. Compatible runs with other differences retain evidence but do not trigger failure alerts. ADR-010 specification differences remain visible without being treated as domain breaks.

## Reviewed baseline promotion

1. Retain the run URL, JSON report, source revision and hashes. Confirm the intended Saleor branch/release or deployed environment; distinguish domain changes from source unavailability.
2. Review every domain, additive/dangerous and specification difference against release notes and affected operations, Tasks and mock behaviour. Do not automatically replace the baseline.
3. Obtain candidate SDL from the approved upstream release, or capture introspection with `getIntrospectionQuery`, `buildClientSchema` and `printSchema`. Introspection does not preserve all applied directives; review domain directive definitions and applications against release SDL. Use a dedicated branch and record the exact source/capture method.
4. Adapt operations and tests as needed. Run bidirectional contract tests and the full `npm run verify` gate; perform separate pinned Docker acceptance when behaviour changes require it.
5. Obtain review and explicit merge approval. After merge, run the monitor and verify the exact main revision and expected baseline hash. Preserve previous run evidence.

## Acceptance boundary

Local HTTP tests cover SDL success, additions, domain breaks, invalid/empty/oversized responses and timeout; introspection tests cover ADR-010, unavailable HTTP, GraphQL/JSON/schema errors, invalid configuration and baseline preservation. Publication and a real Actions run are required for operational acceptance. A manual run does not prove that the daily schedule has fired or notifications were delivered.

## References

- [Scheduled workflow behaviour](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
- [Workflow notifications](https://docs.github.com/en/actions/concepts/workflows-and-actions/notifications-for-workflow-runs)
- [Saleor GraphQL conventions](https://docs.saleor.io/api-usage/overview)

## Published acceptance - 2026-10-18

PR #20 merged as `c799d0710e7e70fcceb12492ce49e9020126b298`. Exact-main CI [39078903688](https://github.com/GBrooks1970/saleor-graphql-automation/actions/runs/39078903688) and manual monitor [39078905171](https://github.com/GBrooks1970/saleor-graphql-automation/actions/runs/39078905171) passed. The downloaded artifact confirms that revision, SDL mode, zero domain breaks and 117 other differences.

### First scheduled execution verified

[Run 39107672846](https://github.com/GBrooks1970/saleor-graphql-automation/actions/runs/39107672846) has event `schedule` and succeeded on `4660ce06dc2c0a234fc3f62678c1d9ff0b653665`. GitHub created it at 2026-10-18T07:26:35Z (08:26:35 BST), after the configured 07:17 UTC slot. This is automatic execution, distinct from the preceding manual run.

Downloaded artifact `schema-drift-39107672846-1` (ID `12129560327`, 5205 bytes) contains `report.json` and `summary.md`. Both identify the same run revision and SDL source `https://raw.githubusercontent.com/saleor/saleor/3.23/saleor/graphql/schema.graphql`. Observation time: `2026-10-18T07:26:52.734Z`. Result: **compatible**, zero domain breaks, zero directive-spec differences and 117 other changes (the other-changes category can include dangerous changes).

- Baseline SHA-256: `36a111ba8f822b25a62fa82df0d7e4477e1aebc611d70adb83f5006a5cf76624`.
- Upstream SDL SHA-256: `bf37d116a6e04354cbb9c35a4ee1343ab0602269b2b4ee0f8872adaa03abec6d`.

The verification watch was paused after assessing the run and artifacts. Notification settings and delivery remain **unverified**: the repository-subscription API returned HTTP 404 and the CLI identified the missing `notifications` scope. This does not establish that notifications are disabled. The owner must confirm their GitHub Actions notification preferences and destination separately; a successful scheduled run does not demonstrate failure-alert delivery. No notification settings, schema baseline or workflow were changed during this verification.

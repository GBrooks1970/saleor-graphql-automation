# Living documentation (SGR-P3-01)

## Generate and inspect

Use Node 24.15+ and run from the project root:

```powershell
npm ci
npm run verify
python -m http.server 8080 --bind 127.0.0.1 --directory target/site/serenity
```

Open `http://127.0.0.1:8080`. The landing page links `api/index.html` (all journeys) and `smoke/index.html` (the read-only subset). Each report provides feature narratives, scenario outcomes, timings and nested Screenplay activities. The generated files are ignored by Git.

The native `@serenity-js/html-reporter` needs no Java or separate BDD CLI. Its version and required `@serenity-js/web` peer are pinned to 3.46.0, matching the installed framework. The Cucumber formatter is the sole stdout formatter: adding another formatter such as `summary` on the same output replaces the adapter and suppresses Serenity events. Console output comes from `ConsoleReporter` instead.

`preverify` clears only `target/site/serenity`. Each individual `test:smoke`, `test:api` or `test:checkout` invocation clears its own suite folder. Cucumber's exit status is preserved; a failed run keeps available failure reports and fails verification. `check:reports` requires complete passing smoke and API results before generating the landing page. It compares scenario identities against compiled Gherkin, checks totals and activities, and rejects missing, empty, partial, skipped or failed reports. Partial runs selected with extra Cucumber arguments are useful for diagnosis but do not satisfy this gate.

The API suite includes the smoke scenarios. Separate suite runs are not additional unique coverage. The landing page identifies the target as the embedded mock by default; configuring `SALEOR_GRAPHQL_URL` changes the label. Neither label alone proves pinned Docker acceptance. The CI workflow supplies no live endpoint or credentials and publishes only deterministic mock results. Do not upload locally generated live reports without reviewing their contents for sensitive test data.

## CI artifacts and Pages

Every PR and main push runs the verification gate. Available reports are retained for 14 days in `serenity-reports-<commit SHA>`, including diagnostics on test failure. Download and extract the entire artifact, then serve its root with an HTTP server. A failure before report generation can leave no artifact; the original gate still fails.

Only successful pushes to `main` package the verified site and enter the Pages deployment job. PRs cannot deploy. The verification job has read-only repository access; only deployment receives `pages:write` and `id-token:write`. Pages deployments are serialised without cancelling an active deployment. All JavaScript actions use Node 24-compatible majors.

**Activation is pending.** Before merging this item, an authorised maintainer must select **Settings → Pages → Build and deployment → Source: GitHub Actions**, and check that the `github-pages` environment allows `main`. This change prepares the workflow; it does not enable repository Pages settings. Merging without that configuration can make the deployment job fail even when verification succeeds.

After approval and publication, record the PR head checks, merge commit and CI run whose `headSha` exactly matches current `main`. Confirm the deployment job succeeds, open its returned URL, and inspect the landing page and both suites. SGR-P3-01 remains in progress until that hosted evidence exists.

## References

- [Native Serenity/JS HTML reporter](https://serenity-js.org/handbook/reporting/html-reporter/)
- [HTML reporter configuration](https://serenity-js.org/api/html-reporter/interface/HtmlReporterConfig/)
- [GitHub Pages deployment action](https://github.com/actions/deploy-pages)

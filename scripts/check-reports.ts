import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFeatureTags } from './check-smoke-safety.js';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));

function record(value: unknown): Record<string, unknown> {
  assert(value !== null && typeof value === 'object' && !Array.isArray(value), 'Expected report object');
  return value as Record<string, unknown>;
}

export function expectedScenarios(featuresDirectory: string, suite: 'smoke' | 'api'): string[] {
  function visit(directory: string): string[] {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) return visit(file);
      if (!entry.name.endsWith('.feature')) return [];
      return parseFeatureTags(fs.readFileSync(file, 'utf8'), file)
        .filter(scenario => suite === 'api' || (scenario.tags.includes('@smoke') && !scenario.tags.includes('@mutating')))
        .map(scenario => `${path.relative(featuresDirectory, file).replaceAll('\\', '/')}::${scenario.scenarioName}`);
    });
  }
  return visit(featuresDirectory).sort();
}

/** Parse JSON only; never execute the generated JavaScript. */
export function validateReport(directory: string, featuresDirectory: string, expected: string[]): number {
  assert(expected.length > 0, 'Expected at least one scenario');
  const html = fs.readFileSync(path.join(directory, 'index.html'), 'utf8');
  assert(html.includes('data.js'), 'Report HTML must load scenario data');
  const script = fs.readFileSync(path.join(directory, 'data.js'), 'utf8');
  const match = /^\s*window\.__SERENITY_REPORT_DATA__\s*=\s*([\s\S]*?);?\s*$/.exec(script);
  assert(match, 'Unrecognised report data format');
  const data = record(JSON.parse(match[1]!));
  assert.equal(data.schemaVersion, 1, 'Unsupported report schema');
  assert(Array.isArray(data.scenarios), 'Missing scenarios');
  const keys = data.scenarios.map((value: unknown) => {
    const scenario = record(value);
    const source = record(scenario.source);
    assert.equal(typeof source.path, 'string', 'Missing feature path');
    assert.equal(typeof scenario.name, 'string', 'Missing scenario name');
    assert.equal(scenario.outcome, 'SUCCESS', `Unsuccessful scenario: ${scenario.name}`);
    assert(Array.isArray(scenario.activities) && scenario.activities.length > 0, 'Missing Screenplay activities');
    return `${path.relative(featuresDirectory, source.path as string).replaceAll('\\', '/')}::${scenario.name}`;
  }).sort();
  assert.deepEqual(keys, [...expected].sort(), 'Report scenarios do not match the selected feature suite');
  const summary = record(data.summary);
  assert.equal(summary.totalScenarios, expected.length, 'Incorrect summary total');
  const outcomes = record(summary.outcomes);
  assert.equal(outcomes.passed, expected.length, 'Incorrect passed total');
  for (const outcome of ['failed', 'pending', 'skipped', 'compromised', 'error']) {
    assert.equal(outcomes[outcome], 0, `Non-zero or missing ${outcome} total`);
  }
  return expected.length;
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

export function buildReportSite(reportRoot: string, featuresDirectory: string): void {
  // A failed validation must never leave a previous successful landing page behind.
  fs.rmSync(path.join(reportRoot, 'index.html'), { force: true });
  const smoke = validateReport(path.join(reportRoot, 'smoke'), featuresDirectory, expectedScenarios(featuresDirectory, 'smoke'));
  const api = validateReport(path.join(reportRoot, 'api'), featuresDirectory, expectedScenarios(featuresDirectory, 'api'));
  const target = process.env.SALEOR_GRAPHQL_URL ? 'Explicitly configured Saleor endpoint' : 'Deterministic embedded mock SUT';
  const revision = escapeHtml(process.env.GITHUB_SHA ?? 'Local working tree (may contain uncommitted changes)');
  fs.writeFileSync(path.join(reportRoot, 'index.html'), `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Saleor GraphQL — Living documentation</title>
<style>body{font:18px/1.6 system-ui,sans-serif;max-width:850px;margin:60px auto;padding:0 24px;color:#172b4d;background:#f5f7fb}h1{line-height:1.2}a{color:#174ea6}.suite{display:block;margin:20px 0;padding:24px;background:white;border:1px solid #c9d2e0;border-radius:8px}code{overflow-wrap:anywhere}small{color:#42526e}</style></head>
<body><h1>Saleor GraphQL<br>Living documentation</h1><p>Executable requirements and Screenplay results for catalogue, authentication, checkout and fulfilment.</p>
<p><strong>Target:</strong> ${target}. These results do not establish pinned Docker readiness or separate live acceptance.</p>
<a class="suite" href="api/index.html"><strong>Full API suite</strong><br>${api} scenarios passed — all implemented journeys</a>
<a class="suite" href="smoke/index.html"><strong>Read-only smoke suite</strong><br>${smoke} scenarios passed — a subset of the API suite</a>
<p>The suites are separate executions. Their counts must not be added as unique scenario coverage.</p>
<p><small>Revision: <code>${revision}</code><br>Site validated: ${new Date().toISOString()}</small></p></body></html>\n`);
  console.log(`[check-reports] Complete reports: smoke=${smoke}, api=${api}; landing page generated.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildReportSite(path.join(projectRoot, 'target/site/serenity'), path.join(projectRoot, 'features'));
}

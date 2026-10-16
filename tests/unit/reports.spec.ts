import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildReportSite, expectedScenarios, validateReport } from '../../scripts/check-reports.js';

describe('Living documentation integrity', () => {
  function fixture(test: (root: string, data: ReturnType<typeof sample>) => void) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'saleor-reports-'));
    try { test(root, sample(root)); } finally { fs.rmSync(root, { recursive: true, force: true }); }
  }
  function sample(root: string) {
    return { schemaVersion: 1, summary: { totalScenarios: 1, outcomes: { passed: 1, failed: 0, pending: 0, skipped: 0, compromised: 0, error: 0 } },
      scenarios: [{ name: 'Read shop', source: { path: path.join(root, 'catalogue.feature') }, outcome: 'SUCCESS', activities: [{ name: 'Guest queries shop' }] }] };
  }
  function write(root: string, data: unknown) {
    fs.writeFileSync(path.join(root, 'index.html'), '<script src="data.js"></script>');
    fs.writeFileSync(path.join(root, 'data.js'), `window.__SERENITY_REPORT_DATA__ = ${JSON.stringify(data)};`);
  }
  const expected = ['catalogue.feature::Read shop'];
  it('accepts a complete successful report', () => fixture((root, data) => {
    write(root, data); assert.equal(validateReport(root, root, expected), 1);
  }));
  it('rejects missing output and empty expected coverage', () => fixture((root, data) => {
    assert.throws(() => validateReport(root, root, expected), /ENOENT/);
    write(root, data); assert.throws(() => validateReport(root, root, []), /at least one/);
    fs.unlinkSync(path.join(root, 'data.js'));
    assert.throws(() => validateReport(root, root, expected), /ENOENT/);
  }));
  it('rejects missing, substituted and duplicated scenarios', () => fixture((root, data) => {
    write(root, { ...data, scenarios: [] }); assert.throws(() => validateReport(root, root, expected), /do not match/);
    write(root, { ...data, scenarios: [data.scenarios[0], data.scenarios[0]] }); assert.throws(() => validateReport(root, root, expected), /do not match/);
    data.scenarios[0]!.name = 'Different scenario'; write(root, data);
    assert.throws(() => validateReport(root, root, expected), /do not match/);
  }));
  it('rejects failures, skipped results and absent Screenplay detail', () => fixture((root, data) => {
    for (const outcome of ['FAILURE', 'ERROR', 'SKIPPED', 'PENDING']) {
      data.scenarios[0]!.outcome = outcome; write(root, data);
      assert.throws(() => validateReport(root, root, expected), /Unsuccessful/);
    }
    data.scenarios[0]!.outcome = 'SUCCESS'; data.scenarios[0]!.activities = []; write(root, data);
    assert.throws(() => validateReport(root, root, expected), /Missing Screenplay/);
  }));
  it('rejects inconsistent summaries and unsupported schemas', () => fixture((root, data) => {
    data.summary.totalScenarios = 2; write(root, data);
    assert.throws(() => validateReport(root, root, expected), /summary total/);
    data.summary.totalScenarios = 1; data.summary.outcomes.failed = 1; write(root, data);
    assert.throws(() => validateReport(root, root, expected), /failed total/);
    data.schemaVersion = 2; write(root, data); assert.throws(() => validateReport(root, root, expected), /schema/);
  }));
  it('does not execute arbitrary JavaScript in report data', () => fixture((root, data) => {
    write(root, data); fs.appendFileSync(path.join(root, 'data.js'), 'throw new Error("executed")');
    assert.throws(() => validateReport(root, root, expected), SyntaxError);
  }));
  it('derives coverage from inherited tags and scenario outline examples', () => fixture((root) => {
    fs.writeFileSync(path.join(root, 'catalogue.feature'), `@api\nFeature: Catalogue\n  @smoke\n  Scenario Outline: Read <item>\n    Given <item>\n    Examples:\n      | item |\n      | shop |\n      | product |\n  @mutating\n  Scenario: Create order\n    Given a checkout\n`);
    assert.deepEqual(expectedScenarios(root, 'smoke'), ['catalogue.feature::Read product', 'catalogue.feature::Read shop']);
    assert.equal(expectedScenarios(root, 'api').length, 3);
  }));
  it('removes a previous landing page when validation fails', () => fixture((root) => {
    fs.writeFileSync(path.join(root, 'index.html'), 'previous success');
    assert.throws(() => buildReportSite(root, root));
    assert.equal(fs.existsSync(path.join(root, 'index.html')), false);
  }));
});

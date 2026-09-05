import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseFeatureTags, validateSmokeSafety } from '../../scripts/check-smoke-safety.js';

describe('Smoke Safety Policy Guard (NFR-6)', () => {
  it('identifies @smoke and @mutating tags on individual scenarios', () => {
    const gherkin = `
      @api
      Feature: Sample Feature

        @smoke
        Scenario: Read products
          Given a guest actor
          When they browse the catalogue
          Then products are returned

        @mutating
        Scenario: Create an order
          Given a customer actor
          When they checkout
          Then order is placed

        @smoke @mutating
        Scenario: Invalid mutating smoke scenario
          Given an actor
          When they modify data
          Then data is changed
    `;

    const scenarios = parseFeatureTags(gherkin, 'sample.feature');
    assert.strictEqual(scenarios.length, 3);

    assert.strictEqual(scenarios[0].scenarioName, 'Read products');
    assert.ok(scenarios[0].tags.includes('@smoke'));
    assert.ok(!scenarios[0].tags.includes('@mutating'));

    assert.strictEqual(scenarios[1].scenarioName, 'Create an order');
    assert.ok(!scenarios[1].tags.includes('@smoke'));
    assert.ok(scenarios[1].tags.includes('@mutating'));

    assert.strictEqual(scenarios[2].scenarioName, 'Invalid mutating smoke scenario');
    assert.ok(scenarios[2].tags.includes('@smoke'));
    assert.ok(scenarios[2].tags.includes('@mutating'));
  });

  it('validates that current workspace feature files have zero smoke-safety violations', () => {
    const result = validateSmokeSafety();
    assert.strictEqual(result.violations.length, 0, 'No violations permitted in active feature files');
  });
});

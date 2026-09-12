import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  parseFeatureTags,
  validateSmokeSafety,
  findMutatingStep,
  KNOWN_STEP_OPERATIONS,
} from '../../scripts/check-smoke-safety.js';

describe('Smoke Safety Policy Guard (NFR-6 & TRIAGE-01)', () => {
  describe('Layer 1: Tag Inheritance & Scenario Tag Parsing', () => {
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

    it('inherits @mutating tag from Feature level down to all scenarios', () => {
      const gherkin = `
        @api @mutating
        Feature: Feature-level Mutating Operations

          @smoke
          Scenario: Smoke scenario inside mutating feature
            Given the guest actor is browsing the storefront
            When they query the shop information
            Then the shop name should be "Saleor e-commerce"

          Scenario: Untagged scenario inside mutating feature
            Given a customer actor
            When they do something
            Then something happens
      `;

      const scenarios = parseFeatureTags(gherkin, 'feature-level-mutating.feature');
      assert.strictEqual(scenarios.length, 2);

      // Scenario 1 inherits @api, @mutating from Feature, plus its own @smoke
      assert.strictEqual(scenarios[0].scenarioName, 'Smoke scenario inside mutating feature');
      assert.ok(scenarios[0].tags.includes('@api'));
      assert.ok(scenarios[0].tags.includes('@mutating'), 'Must inherit @mutating from Feature level');
      assert.ok(scenarios[0].tags.includes('@smoke'));

      // Scenario 2 inherits @api, @mutating from Feature
      assert.strictEqual(scenarios[1].scenarioName, 'Untagged scenario inside mutating feature');
      assert.ok(scenarios[1].tags.includes('@api'));
      assert.ok(scenarios[1].tags.includes('@mutating'));
      assert.ok(!scenarios[1].tags.includes('@smoke'));
    });

    it('inherits @mutating tag from Rule level down to scenarios within the Rule', () => {
      const gherkin = `
        @api
        Feature: Rule Level Feature

          @mutating
          Rule: Mutating Business Rule
            @smoke
            Scenario: Smoke scenario inside mutating rule
              Given a guest actor
              When they query the shop information
              Then the shop name should be "Saleor e-commerce"

          Rule: Readonly Business Rule
            @smoke
            Scenario: Smoke scenario inside readonly rule
              Given a guest actor
              When they query the shop information
              Then the shop name should be "Saleor e-commerce"
      `;

      const scenarios = parseFeatureTags(gherkin, 'rule-level.feature');
      assert.strictEqual(scenarios.length, 2);

      // Rule 1 scenario inherits @mutating from Rule
      assert.strictEqual(scenarios[0].scenarioName, 'Smoke scenario inside mutating rule');
      assert.ok(scenarios[0].tags.includes('@api'));
      assert.ok(scenarios[0].tags.includes('@mutating'), 'Must inherit @mutating from Rule level');
      assert.ok(scenarios[0].tags.includes('@smoke'));

      // Rule 2 scenario does NOT inherit @mutating
      assert.strictEqual(scenarios[1].scenarioName, 'Smoke scenario inside readonly rule');
      assert.ok(scenarios[1].tags.includes('@api'));
      assert.ok(!scenarios[1].tags.includes('@mutating'), 'Readonly rule scenario must not have @mutating');
      assert.ok(scenarios[1].tags.includes('@smoke'));
    });

    it('inherits tags from Scenario Outline and Examples tables down to generated pickles', () => {
      const gherkin = `
        @api
        Feature: Outline Feature

          @smoke
          Scenario Outline: Outline with examples
            Given an actor
            When they query <channel>
            Then products exist

            @mutating
            Examples: Mutating channels
              | channel |
              | channel-1 |

            @readonly
            Examples: Readonly channels
              | channel |
              | default-channel |
      `;

      const scenarios = parseFeatureTags(gherkin, 'outline-level.feature');
      assert.strictEqual(scenarios.length, 2);

      // Pickle 1 from Examples @mutating
      assert.ok(scenarios[0].tags.includes('@api'));
      assert.ok(scenarios[0].tags.includes('@smoke'), 'Inherited from Scenario Outline');
      assert.ok(scenarios[0].tags.includes('@mutating'), 'Inherited from Examples table');

      // Pickle 2 from Examples @readonly
      assert.ok(scenarios[1].tags.includes('@api'));
      assert.ok(scenarios[1].tags.includes('@smoke'), 'Inherited from Scenario Outline');
      assert.ok(!scenarios[1].tags.includes('@mutating'), 'Should not have @mutating');
      assert.ok(scenarios[1].tags.includes('@readonly'));
    });
  });

  describe('Layer 2: Step Mutation Detection (findMutatingStep)', () => {
    it('detects known GraphQL mutation steps', () => {
      const authMutation = findMutatingStep('they authenticate with their credentials');
      assert.ok(authMutation, 'Should identify tokenCreate mutation');
      assert.strictEqual(authMutation?.operationName, 'tokenCreate');

      const checkoutMutation = findMutatingStep('creates a checkout containing 1 item');
      assert.ok(checkoutMutation, 'Should identify checkoutCreate mutation');
      assert.strictEqual(checkoutMutation?.operationName, 'checkoutCreate');

      const addressMutation = findMutatingStep('attaches valid shipping and billing addresses');
      assert.ok(addressMutation, 'Should identify checkoutShippingAddressUpdate mutation');
      assert.strictEqual(addressMutation?.operationName, 'checkoutShippingAddressUpdate');

      const transactionMutation = findMutatingStep('the administrator records the checkout total as charged');
      assert.ok(transactionMutation, 'Should identify transactionCreate mutation');
      assert.strictEqual(transactionMutation?.operationName, 'transactionCreate');

      const completeMutation = findMutatingStep('the customer completes the checkout');
      assert.ok(completeMutation, 'Should identify checkoutComplete mutation');
      assert.strictEqual(completeMutation?.operationName, 'checkoutComplete');
    });

    it('permits known read-only queries and assertion steps', () => {
      assert.strictEqual(findMutatingStep('they query the shop information'), null);
      assert.strictEqual(findMutatingStep('they browse the catalogue in channel "default-channel"'), null);
      assert.strictEqual(findMutatingStep('they query their current user profile'), null);
      assert.strictEqual(findMutatingStep('the guest actor is browsing the storefront'), null);
      assert.strictEqual(findMutatingStep('the shop name should be "Saleor e-commerce"'), null);
      assert.strictEqual(findMutatingStep('at least 1 product should be available in the catalogue'), null);
      assert.strictEqual(findMutatingStep('all returned products should have valid pricing'), null);
    });

    it('identifies mutation keywords via fallback heuristic', () => {
      const heuristicMatch = findMutatingStep('they execute a custom mutation to modify items');
      assert.ok(heuristicMatch, 'Should catch mutation keyword via heuristic');
      assert.strictEqual(heuristicMatch?.operationName, 'heuristic-mutation-detected');
    });

    it('has step operations configured for all critical domain workflows', () => {
      assert.ok(KNOWN_STEP_OPERATIONS.length >= 15, 'Should have comprehensive step mappings');
      const mutationOperations = KNOWN_STEP_OPERATIONS.filter((o) => o.operationType === 'mutation');
      assert.ok(mutationOperations.length >= 7, 'Should cover auth and checkout mutations');
    });
  });

  describe('Dual-Control Safety Validation (validateSmokeSafety)', () => {
    it('detects violations when a scenario inherits @mutating from Feature level', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-safety-test-'));
      try {
        const featureContent = `
          @mutating
          Feature: Dangerous Feature
            @smoke
            Scenario: Inherits mutating tag
              Given the guest actor is browsing the storefront
              When they query the shop information
              Then the shop name should be "Saleor e-commerce"
        `;
        fs.writeFileSync(path.join(tmpDir, 'dangerous.feature'), featureContent, 'utf8');

        const result = validateSmokeSafety(tmpDir);
        assert.strictEqual(result.totalScenarios, 1);
        assert.strictEqual(result.smokeScenarios, 1);
        assert.strictEqual(result.violations.length, 1);
        assert.ok(result.violations[0].includes('Tag Violation'));
        assert.ok(result.violations[0].includes('tagged with both @smoke and @mutating'));
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('detects violations when a smoke scenario invokes a mutating step', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-safety-test-'));
      try {
        const featureContent = `
          Feature: Safe Tagging But Mutating Step
            @smoke
            Scenario: Executes checkout mutation
              Given the guest actor is browsing the storefront
              When creates a checkout containing 1 item
              Then the shop name should be "Saleor e-commerce"
        `;
        fs.writeFileSync(path.join(tmpDir, 'mutating-step.feature'), featureContent, 'utf8');

        const result = validateSmokeSafety(tmpDir);
        assert.strictEqual(result.totalScenarios, 1);
        assert.strictEqual(result.smokeScenarios, 1);
        assert.strictEqual(result.violations.length, 1);
        assert.ok(result.violations[0].includes('Operation Violation'));
        assert.ok(result.violations[0].includes('checkoutCreate'));
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('passes when scenarios are strictly read-only and free of mutating tags/operations', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-safety-test-'));
      try {
        const featureContent = `
          @api
          Feature: Clean Readonly Feature
            @smoke
            Scenario: Safe read
              Given the guest actor is browsing the storefront
              When they query the shop information
              Then the shop name should be "Saleor e-commerce"

            @mutating
            Scenario: Mutating non-smoke scenario
              Given a customer with credentials "test@example.com" and "pass"
              When creates a checkout containing 1 item
              Then a confirmed order should be created
        `;
        fs.writeFileSync(path.join(tmpDir, 'clean.feature'), featureContent, 'utf8');

        const result = validateSmokeSafety(tmpDir);
        assert.strictEqual(result.totalScenarios, 2);
        assert.strictEqual(result.smokeScenarios, 1);
        assert.strictEqual(result.violations.length, 0);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('validates that current workspace feature files have zero smoke-safety violations', () => {
      const result = validateSmokeSafety();
      assert.strictEqual(result.violations.length, 0, 'No violations permitted in active feature files');
      assert.strictEqual(result.totalScenarios, 8, 'Expected 8 scenarios across active feature files');
      assert.strictEqual(result.smokeScenarios, 3, 'Expected 3 @smoke scenarios across active feature files');
    });
  });
});


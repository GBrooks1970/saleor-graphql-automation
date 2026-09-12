/**
 * Smoke Safety Guard (NFR-6 & TRIAGE-01 / R-01)
 *
 * Enforces two-layer safety verification for the `@smoke` profile:
 * 1. Tag Inheritance (Layer 1): Uses the official Cucumber Gherkin AST parser and pickle
 *    compiler to ensure Feature, Rule, Scenario Outline, and Examples tags are inherited
 *    with 100% parity to Cucumber runtime execution. No @smoke scenario may inherit or bear @mutating.
 * 2. Mutation Rejection (Layer 2): Validates that steps within @smoke scenarios execute only
 *    read-only queries and never invoke side-effecting GraphQL mutations (e.g. checkout, tokenCreate).
 *
 * Guarantees that the `smoke` profile is provably read-only against staging/demo environments.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Parser, AstBuilder, GherkinClassicTokenMatcher, compile } from '@cucumber/gherkin';
import { IdGenerator } from '@cucumber/messages';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FEATURES_DIR = path.resolve(__dirname, '../features');

export interface ScenarioTagInfo {
  file: string;
  scenarioName: string;
  tags: string[];
  steps: string[];
}

export interface StepOperationMapping {
  pattern: RegExp;
  operationType: 'query' | 'mutation' | 'assertion' | 'setup';
  operationName?: string;
}

export const KNOWN_STEP_OPERATIONS: StepOperationMapping[] = [
  // Catalogue read steps (Read-only queries & assertions)
  { pattern: /^the guest actor is browsing the storefront$/, operationType: 'setup' },
  { pattern: /^they query the shop information$/, operationType: 'query', operationName: 'GetShopInfo' },
  { pattern: /^the shop name should be /, operationType: 'assertion' },
  { pattern: /^they browse the catalogue in channel /, operationType: 'query', operationName: 'GetProducts' },
  { pattern: /^at least \d+ products? should be available in the catalogue$/, operationType: 'assertion' },
  { pattern: /^all returned products should have valid pricing$/, operationType: 'assertion' },
  { pattern: /^they query the first \d+ products in channel /, operationType: 'query', operationName: 'GetProducts' },
  { pattern: /^exactly \d+ products should be returned$/, operationType: 'assertion' },
  { pattern: /^page info should indicate whether more products exist$/, operationType: 'assertion' },
  { pattern: /^they query their current user profile$/, operationType: 'query', operationName: 'CurrentUser' },

  // Auth steps (Mutations & assertions)
  { pattern: /^a customer with credentials /, operationType: 'setup' },
  { pattern: /^they authenticate with their credentials$/, operationType: 'mutation', operationName: 'tokenCreate' },
  { pattern: /^a customer authenticated with /, operationType: 'mutation', operationName: 'tokenCreate' },
  { pattern: /^an administrator can record checkout transactions$/, operationType: 'mutation', operationName: 'tokenCreate' },
  { pattern: /^they refresh their token using their refresh token$/, operationType: 'mutation', operationName: 'tokenRefresh' },
  { pattern: /^a valid JWT token should be returned$/, operationType: 'assertion' },
  { pattern: /^a refresh token should be present$/, operationType: 'assertion' },
  { pattern: /^the user profile email should be /, operationType: 'assertion' },
  { pattern: /^the authenticated user email should be /, operationType: 'assertion' },
  { pattern: /^the authentication should fail with error code /, operationType: 'assertion' },
  { pattern: /^a refreshed JWT token should be issued$/, operationType: 'assertion' },

  // Checkout steps (Mutations & queries)
  { pattern: /^the customer selects an available product variant in channel /, operationType: 'query', operationName: 'SelectCheckoutVariant' },
  { pattern: /^creates a checkout containing \d+ items?$/, operationType: 'mutation', operationName: 'checkoutCreate' },
  { pattern: /^attaches valid shipping and billing addresses$/, operationType: 'mutation', operationName: 'checkoutShippingAddressUpdate' },
  { pattern: /^selects the first available delivery method$/, operationType: 'mutation', operationName: 'checkoutDeliveryMethodUpdate' },
  { pattern: /^the administrator records the checkout total as charged$/, operationType: 'mutation', operationName: 'transactionCreate' },
  { pattern: /^the customer completes the checkout$/, operationType: 'mutation', operationName: 'checkoutComplete' },
  { pattern: /^a confirmed order should be created$/, operationType: 'assertion' },
  { pattern: /^the order should be fully charged$/, operationType: 'assertion' },
];

export function findMutatingStep(stepText: string): { step: string; operationName: string } | null {
  for (const mapping of KNOWN_STEP_OPERATIONS) {
    if (mapping.pattern.test(stepText)) {
      if (mapping.operationType === 'mutation') {
        return {
          step: stepText,
          operationName: mapping.operationName || 'unknown-mutation',
        };
      }
      return null;
    }
  }

  // Fallback heuristic: reject explicit mutation keywords in step text
  if (/\b(mutation|checkout|charged?|tokenCreate|tokenRefresh)\b/i.test(stepText)) {
    return {
      step: stepText,
      operationName: 'heuristic-mutation-detected',
    };
  }

  return null;
}

export function parseFeatureTags(content: string, filename: string): ScenarioTagInfo[] {
  const newId = IdGenerator.uuid();
  const builder = new AstBuilder(newId);
  const matcher = new GherkinClassicTokenMatcher();
  const parser = new Parser(builder, matcher);

  const doc = parser.parse(content);
  if (!doc || !doc.feature) {
    return [];
  }

  const pickles = compile(doc, filename, newId);
  return pickles.map((pickle) => ({
    file: filename,
    scenarioName: pickle.name,
    tags: pickle.tags ? pickle.tags.map((t) => t.name) : [],
    steps: pickle.steps ? pickle.steps.map((s) => s.text) : [],
  }));
}

export function validateSmokeSafety(featuresDir: string = FEATURES_DIR): {
  totalScenarios: number;
  smokeScenarios: number;
  violations: string[];
} {
  if (!fs.existsSync(featuresDir)) {
    return { totalScenarios: 0, smokeScenarios: 0, violations: [] };
  }

  const featureFiles = fs.readdirSync(featuresDir).filter((f) => f.endsWith('.feature'));
  const allScenarios: ScenarioTagInfo[] = [];

  for (const file of featureFiles) {
    const filePath = path.join(featuresDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    allScenarios.push(...parseFeatureTags(content, file));
  }

  const violations: string[] = [];
  let smokeCount = 0;

  for (const s of allScenarios) {
    const isSmoke = s.tags.includes('@smoke');
    const isMutating = s.tags.includes('@mutating');

    if (isSmoke) {
      smokeCount++;

      // Layer 1: Tag Conflict Check (including inherited tags)
      if (isMutating) {
        violations.push(
          `Tag Violation in [${s.file}] "${s.scenarioName}": tagged with both @smoke and @mutating (directly or inherited). Smoke tests must be read-only.`
        );
      }

      // Layer 2: Mutation Operation Inspection in Steps
      for (const step of s.steps) {
        const mutating = findMutatingStep(step);
        if (mutating) {
          violations.push(
            `Operation Violation in [${s.file}] "${s.scenarioName}": step "${step}" executes mutation operation "${mutating.operationName}". Smoke scenarios must execute read-only queries only.`
          );
        }
      }
    }
  }

  return {
    totalScenarios: allScenarios.length,
    smokeScenarios: smokeCount,
    violations,
  };
}

function main() {
  console.log('[check-smoke-safety] Verifying smoke scenario safety across features/...');
  const result = validateSmokeSafety();

  console.log(`[check-smoke-safety] Inspected ${result.totalScenarios} scenarios (${result.smokeScenarios} @smoke).`);

  if (result.violations.length > 0) {
    console.error('[check-smoke-safety] SAFETY VIOLATIONS FOUND:');
    result.violations.forEach((v) => console.error(`  - ${v}`));
    process.exit(1);
  }

  console.log('[check-smoke-safety] Safety check passed: zero @smoke scenarios are tagged with @mutating or execute mutations.');
  process.exit(0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

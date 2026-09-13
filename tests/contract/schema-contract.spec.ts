import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildSchema } from 'graphql';
import { diff, CriticalityLevel } from '@graphql-inspector/core';
import {
  loadBaselineSchema,
  validateContract,
  isBuiltInDirectiveSpecDifference,
  fetchLiveSchema,
  runContractCheck,
  BUILTIN_SPEC_DIRECTIVES,
} from '../../scripts/check-schema-contract.js';

describe('Schema Contract & Breaking Change Diff Gate (FR-4 & TRIAGE-02)', () => {
  it('validates that the baseline schema is self-consistent with zero breaking changes', async () => {
    const baseline = await loadBaselineSchema();
    assert.ok(baseline, 'Baseline schema must load');
    assert.strictEqual(Object.keys(baseline.getTypeMap()).length, 1482, 'Saleor 3.23 schema has 1482 types');

    const result = await validateContract(baseline, baseline);
    assert.strictEqual(result.domainBreaking.length, 0, 'Baseline diff against itself must yield zero domain breaking changes');
    assert.strictEqual(result.breaking.length, 0, 'Alias result.breaking must be zero');
    assert.strictEqual(result.directiveSpecDifferences.length, 0, 'Baseline diff against itself must yield zero spec differences');
    assert.strictEqual(result.nonBreaking.length, 0, 'Baseline diff against itself must yield zero non-breaking changes');
    assert.strictEqual(result.allChangesCount, 0, 'Baseline diff against itself must yield zero total changes');
  });

  describe('ADR-010: Built-in Specification Directive Classification vs Domain Directives', () => {
    it('correctly identifies built-in specification directives', () => {
      assert.ok(BUILTIN_SPEC_DIRECTIVES.has('specifiedBy'));
      assert.ok(BUILTIN_SPEC_DIRECTIVES.has('oneOf'));
      assert.ok(BUILTIN_SPEC_DIRECTIVES.has('deprecated'));
      assert.ok(BUILTIN_SPEC_DIRECTIVES.has('include'));
      assert.ok(BUILTIN_SPEC_DIRECTIVES.has('skip'));

      // Domain directives must NOT be in built-in set
      assert.ok(!BUILTIN_SPEC_DIRECTIVES.has('doc'));
      assert.ok(!BUILTIN_SPEC_DIRECTIVES.has('webhookEventsInfo'));
    });

    it('classifies @specifiedBy removal as a specification difference, not domain breaking', () => {
      const change = {
        type: 'DIRECTIVE_REMOVED',
        path: '@specifiedBy',
        message: "Directive 'specifiedBy' was removed",
      };
      assert.strictEqual(isBuiltInDirectiveSpecDifference(change), true);
    });

    it('classifies @oneOf removal as a specification difference, not domain breaking', () => {
      const change = {
        type: 'DIRECTIVE_REMOVED',
        path: '@oneOf',
        message: "Directive 'oneOf' was removed",
      };
      assert.strictEqual(isBuiltInDirectiveSpecDifference(change), true);
    });

    it('classifies @deprecated location removals as specification differences, not domain breaking', () => {
      const locationChange1 = {
        type: 'DIRECTIVE_LOCATION_REMOVED',
        path: '@deprecated',
        message: "Location 'ARGUMENT_DEFINITION' was removed from directive 'deprecated'",
      };
      const locationChange2 = {
        type: 'DIRECTIVE_LOCATION_REMOVED',
        path: '@deprecated',
        message: "Location 'INPUT_FIELD_DEFINITION' was removed from directive 'deprecated'",
      };
      const locationChange3 = {
        type: 'DIRECTIVE_LOCATION_REMOVED',
        path: '@deprecated',
        message: "Location 'DIRECTIVE_DEFINITION' was removed from directive 'deprecated'",
      };

      assert.strictEqual(isBuiltInDirectiveSpecDifference(locationChange1), true);
      assert.strictEqual(isBuiltInDirectiveSpecDifference(locationChange2), true);
      assert.strictEqual(isBuiltInDirectiveSpecDifference(locationChange3), true);
    });

    it('STRICTLY treats removal of domain directives (@doc, @webhookEventsInfo) as domain breaking', () => {
      const docChange = {
        type: 'DIRECTIVE_REMOVED',
        path: '@doc',
        message: "Directive 'doc' was removed",
      };
      const webhookChange = {
        type: 'DIRECTIVE_REMOVED',
        path: '@webhookEventsInfo',
        message: "Directive 'webhookEventsInfo' was removed",
      };

      assert.strictEqual(isBuiltInDirectiveSpecDifference(docChange), false, 'Removing @doc must NOT be classified as a spec difference');
      assert.strictEqual(isBuiltInDirectiveSpecDifference(webhookChange), false, 'Removing @webhookEventsInfo must NOT be classified as a spec difference');
    });

    it('validates contract when domain directive @doc is removed by flagging domainBreaking', async () => {
      const baselineWithDoc = buildSchema(`
        directive @doc(category: String!) on OBJECT | FIELD_DEFINITION
        type Query {
          shop: Shop @doc(category: "Shop")
        }
        type Shop {
          name: String!
        }
      `);

      const targetWithoutDoc = buildSchema(`
        type Query {
          shop: Shop
        }
        type Shop {
          name: String!
        }
      `);

      const result = await validateContract(baselineWithDoc, targetWithoutDoc);
      assert.ok(result.domainBreaking.length >= 1, 'Removal of domain directive @doc must produce a domain breaking change');
      assert.ok(
        result.domainBreaking.some((b) => b.includes("Directive 'doc' was removed")),
        'Must flag Directive doc was removed'
      );
      assert.strictEqual(result.directiveSpecDifferences.length, 0, 'No spec differences expected for custom directive');
    });
  });

  describe('Fail-Closed Live Probing & Offline Self-Consistency', () => {
    it('returns null when fetchLiveSchema probes an unreachable or invalid endpoint', async () => {
      const result = await fetchLiveSchema('http://127.0.0.1:1/graphql/');
      assert.strictEqual(result, null, 'Unreachable endpoint must return null');
    });

    it('fails closed (exit code 1) when runContractCheck targets an unreachable live endpoint', async () => {
      const exitCode = await runContractCheck(['--endpoint', 'http://127.0.0.1:1/graphql/']);
      assert.strictEqual(exitCode, 1, 'runContractCheck must exit 1 when live endpoint is unreachable');
    });

    it('succeeds (exit code 0) when runContractCheck runs in default offline mode', async () => {
      const exitCode = await runContractCheck([]);
      assert.strictEqual(exitCode, 0, 'Default runContractCheck must succeed offline with code 0');
    });
  });

  describe('Bidirectional Proof Tests (Simulated Breaking Changes)', () => {
    it('detects breaking change when an existing field is removed', async () => {
      const original = buildSchema(`
        type Query {
          shop: Shop!
        }
        type Shop {
          name: String!
          description: String
        }
      `);

      const broken = buildSchema(`
        type Query {
          shop: Shop!
        }
        type Shop {
          description: String
        }
      `);

      const changes = await diff(original, broken);
      const breaking = changes.filter((c) => c.criticality.level === CriticalityLevel.Breaking);

      assert.strictEqual(breaking.length, 1, 'Should detect exactly 1 breaking change');
      assert.ok(
        breaking[0].message.includes("Field 'name' was removed from object type 'Shop'"),
        `Unexpected error message: ${breaking[0].message}`
      );

      const contractResult = await validateContract(original, broken);
      assert.strictEqual(contractResult.domainBreaking.length, 1);
      assert.ok(contractResult.domainBreaking[0].includes("Field 'name' was removed from object type 'Shop'"));
    });

    it('detects breaking change when a field return type changes incompatibly', async () => {
      const original = buildSchema(`
        type Query {
          product(id: ID!): Product
        }
        type Product {
          id: ID!
          name: String!
        }
      `);

      const broken = buildSchema(`
        type Query {
          product(id: ID!): Product
        }
        type Product {
          id: ID!
          name: Int!
        }
      `);

      const changes = await diff(original, broken);
      const breaking = changes.filter((c) => c.criticality.level === CriticalityLevel.Breaking);

      assert.strictEqual(breaking.length, 1, 'Should detect type change as breaking');
      assert.ok(
        breaking[0].message.includes("changed type from 'String!' to 'Int!'"),
        `Unexpected error message: ${breaking[0].message}`
      );

      const contractResult = await validateContract(original, broken);
      assert.strictEqual(contractResult.domainBreaking.length, 1);
      assert.ok(contractResult.domainBreaking[0].includes("changed type from 'String!' to 'Int!'"));
    });

    it('detects breaking change when a non-nullable argument is added to an existing field', async () => {
      const original = buildSchema(`
        type Query {
          products(first: Int): [String]
        }
      `);

      const broken = buildSchema(`
        type Query {
          products(first: Int, channel: String!): [String]
        }
      `);

      const changes = await diff(original, broken);
      const breaking = changes.filter((c) => c.criticality.level === CriticalityLevel.Breaking);

      assert.strictEqual(breaking.length, 1, 'Should detect mandatory argument addition as breaking');
      assert.ok(
        breaking[0].message.includes("Argument 'channel: String!' added to field 'Query.products'"),
        `Unexpected error message: ${breaking[0].message}`
      );

      const contractResult = await validateContract(original, broken);
      assert.strictEqual(contractResult.domainBreaking.length, 1);
      assert.ok(contractResult.domainBreaking[0].includes("Argument 'channel: String!' added to field 'Query.products'"));
    });

    it('permits non-breaking changes such as adding a nullable field or optional argument', async () => {
      const original = buildSchema(`
        type Query {
          shop: Shop!
        }
        type Shop {
          name: String!
        }
      `);

      const enhanced = buildSchema(`
        type Query {
          shop: Shop!
        }
        type Shop {
          name: String!
          version: String
        }
      `);

      const changes = await diff(original, enhanced);
      const breaking = changes.filter((c) => c.criticality.level === CriticalityLevel.Breaking);
      const nonBreaking = changes.filter((c) => c.criticality.level !== CriticalityLevel.Breaking);

      assert.strictEqual(breaking.length, 0, 'Adding a nullable field must not be breaking');
      assert.strictEqual(nonBreaking.length, 1, 'Adding a field should be recorded as non-breaking change');
      assert.ok(nonBreaking[0].message.includes("Field 'version' was added to object type 'Shop'"));

      const contractResult = await validateContract(original, enhanced);
      assert.strictEqual(contractResult.domainBreaking.length, 0);
      assert.strictEqual(contractResult.nonBreaking.length, 1);
    });
  });
});


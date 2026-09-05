import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildSchema } from 'graphql';
import { diff, CriticalityLevel } from '@graphql-inspector/core';
import { loadBaselineSchema, validateContract } from '../../scripts/check-schema-contract.js';

describe('Schema Contract & Breaking Change Diff Gate (FR-4)', () => {
  it('validates that the baseline schema is self-consistent with zero breaking changes', async () => {
    const baseline = await loadBaselineSchema();
    assert.ok(baseline, 'Baseline schema must load');
    assert.strictEqual(Object.keys(baseline.getTypeMap()).length, 1482, 'Saleor 3.23 schema has 1482 types');

    const result = await validateContract(baseline, baseline);
    assert.strictEqual(result.breaking.length, 0, 'Baseline diff against itself must yield zero breaking changes');
    assert.strictEqual(result.nonBreaking.length, 0, 'Baseline diff against itself must yield zero non-breaking changes');
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
    });
  });
});

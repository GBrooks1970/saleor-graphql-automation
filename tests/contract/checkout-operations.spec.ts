import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { buildSchema, parse, validate } from 'graphql';
import { CHECKOUT_OPERATIONS } from '../../src/screenplay/checkout/operations.js';

describe('Stateful checkout operation contracts (FR-2)', () => {
  const schemaText = readFileSync(new URL('../../schema/saleor-3.23.graphql', import.meta.url), 'utf8');
  const saleorSchema = buildSchema(schemaText);

  for (const [name, document] of CHECKOUT_OPERATIONS) {
    it(`${name} matches the pinned Saleor 3.23 schema`, () => {
      const errors = validate(saleorSchema, parse(document));
      assert.deepStrictEqual(
        errors.map((error) => error.message),
        []
      );
    });
  }
});

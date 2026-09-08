import { after, before, describe, it } from 'node:test';
import assert from 'node:assert';
import { startMockServer } from '../../src/mock/server.js';
import {
  COMPLETE_CHECKOUT_MUTATION,
  CREATE_CHECKOUT_MUTATION,
  UPDATE_CHECKOUT_SHIPPING_ADDRESS_MUTATION,
} from '../../src/screenplay/checkout/operations.js';

describe('Stateful checkout mock', () => {
  let server: Awaited<ReturnType<typeof startMockServer>>;

  before(async () => {
    server = await startMockServer(0);
  });

  after(async () => {
    await server.close();
  });

  const execute = async (query: string, variables: Record<string, unknown>) => {
    const response = await fetch(server.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    return response.json() as Promise<any>;
  };

  it('returns the Saleor billing-address error before checkout completion', async () => {
    const created = await execute(CREATE_CHECKOUT_MUTATION, {
      input: {
        channel: 'default-channel',
        email: 'checkout@example.test',
        lines: [{ variantId: 'UHJvZHVjdFZhcmlhbnQ6Mzg0', quantity: 1 }],
      },
    });
    const checkoutId = created.data.checkoutCreate.checkout.id;

    await execute(UPDATE_CHECKOUT_SHIPPING_ADDRESS_MUTATION, {
      id: checkoutId,
      address: {
        firstName: 'Portfolio',
        lastName: 'Customer',
        streetAddress1: '1 Test Street',
        city: 'London',
        postalCode: 'SW1A 1AA',
        country: 'GB',
      },
    });

    const completed = await execute(COMPLETE_CHECKOUT_MUTATION, { id: checkoutId });
    assert.strictEqual(completed.data.checkoutComplete.order, null);
    assert.strictEqual(completed.data.checkoutComplete.errors[0].code, 'BILLING_ADDRESS_NOT_SET');
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { actorCalled } from '@serenity-js/core';
import { SaleorWorld } from '../../features/support/SaleorWorld.js';
import { CallGraphQL } from '../../src/screenplay/abilities/CallGraphQL.js';
import { prepareScenarioActors } from '../../src/screenplay/actors/prepareScenarioActors.js';
import { checkoutNotepadFor, requiredCheckoutNote } from '../../src/screenplay/checkout/CheckoutNotes.js';
import { startMockServer } from '../../src/mock/server.js';

function newWorld(): SaleorWorld {
  return new SaleorWorld({
    attach: async () => {},
    log: () => {},
    link: () => {},
    parameters: {},
  });
}

describe('Typed scenario state (TRIAGE-07)', () => {
  it('retains credentials for later steps in the same World', () => {
    const world = newWorld();
    world.credentials = { email: 'customer@example.com', password: 'fixture-password' };

    assert.deepEqual(world.requireCredentials(), {
      email: 'customer@example.com',
      password: 'fixture-password',
    });
  });

  it('rejects missing credentials instead of passing undefined to authentication', () => {
    assert.throws(() => newWorld().requireCredentials(), /credentials must be recorded/);
  });

  it('does not carry credentials, refresh tokens or checkout channels to another World', () => {
    const previous = newWorld();
    previous.credentials = { email: 'previous@example.com', password: 'fixture-password' };
    previous.savedRefreshToken = 'previous-refresh-token';
    previous.checkoutChannel = 'previous-channel';

    const next = newWorld();
    assert.equal(next.credentials, undefined);
    assert.equal(next.savedRefreshToken, undefined);
    assert.equal(next.checkoutChannel, undefined);
    assert.throws(() => next.requireCredentials(), /credentials must be recorded/);

    next.credentials = { email: 'next@example.com', password: 'different-password' };
    assert.equal(previous.requireCredentials().email, 'previous@example.com');
  });

  it('shares checkout state between Customer, Admin and Staff within one scenario', () => {
    prepareScenarioActors('http://unused.invalid/graphql/');
    const customerNotes = checkoutNotepadFor(actorCalled('Customer'));
    customerNotes.set('variant', {
      id: 'variant-1', name: 'Variant', productName: 'Product',
      unitPrice: { amount: 10, currency: 'USD' },
    });

    for (const name of ['Admin', 'Staff']) {
      const actor = actorCalled(name);
      assert.equal(checkoutNotepadFor(actor), customerNotes);
      assert.equal(requiredCheckoutNote(actor, 'variant').id, 'variant-1');
    }
  });

  it('resets every actor response and token, and all shared notes, for the next scenario', async () => {
    const server = await startMockServer(0);
    try {
      prepareScenarioActors(server.url);
      const names = ['Guest', 'Customer', 'Admin', 'Staff'];
      const previousAbilities = names.map(name => CallGraphQL.as(actorCalled(name)));
      for (const ability of previousAbilities) {
        ability.setAuthToken('previous-access-token');
        const response = await ability.execute('{ shop { name } }');
        assert.equal(response.status, 200);
        assert.ok(ability.getLastResponse());
      }

      const previousNotes = checkoutNotepadFor(actorCalled('Customer'));
      previousNotes.set('checkout', {
        id: 'checkout-1', token: 'checkout-token', quantity: 1,
        total: { amount: 10, currency: 'USD' },
      });

      prepareScenarioActors(server.url);

      names.forEach((name, index) => {
        const ability = CallGraphQL.as(actorCalled(name));
        assert.notEqual(ability, previousAbilities[index]);
        assert.equal(ability.getAuthToken(), undefined);
        assert.equal(ability.getLastResponse(), undefined);
      });
      for (const name of ['Customer', 'Admin', 'Staff']) {
        const actor = actorCalled(name);
        assert.notEqual(checkoutNotepadFor(actor), previousNotes);
        assert.throws(() => requiredCheckoutNote(actor, 'checkout'), /has not been recorded/);
      }
      assert.equal(previousNotes.get('checkout')?.id, 'checkout-1');
    } finally {
      await server.close();
    }
  });
});

import { Given, When, Then } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import assert from 'node:assert';
import { CallGraphQL } from '../../src/screenplay/abilities/CallGraphQL.js';
import { Authenticate } from '../../src/screenplay/tasks/Authenticate.js';
import { LocateOrder } from '../../src/screenplay/tasks/LocateOrder.js';
import { FulfillOrder } from '../../src/screenplay/tasks/FulfillOrder.js';
import { TheOrder } from '../../src/screenplay/questions/TheOrder.js';
import { TheFulfillment } from '../../src/screenplay/questions/TheFulfillment.js';

Given('a staff member is authenticated to manage orders', async function () {
  const email = process.env.SALEOR_ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.SALEOR_ADMIN_PASSWORD || 'admin';
  await actorCalled('Staff').attemptsTo(Authenticate.withCredentials(email, password));

  const token = actorCalled('Staff').abilityTo(CallGraphQL).getAuthToken();
  assert.ok(token, `Staff authentication failed for ${email}`);
});

When('the staff member locates the placed order', async function () {
  await actorCalled('Staff').attemptsTo(LocateOrder.fromPlacedOrder());
});

Then('the order status should be {string}', async function (expectedStatus: string) {
  const status = await actorCalled('Staff').answer(TheOrder.status());
  assert.strictEqual(status, expectedStatus);
});

Then('the order should have {int} unfulfilled line', async function (expectedCount: number) {
  const lines = await actorCalled('Staff').answer(TheOrder.lines());
  const unfulfilledLines = lines.filter((l) => l.quantityFulfilled < l.quantity);
  assert.strictEqual(unfulfilledLines.length, expectedCount);
});

When('the staff member fulfills all order lines from available warehouse stock', async function () {
  await actorCalled('Staff').attemptsTo(FulfillOrder.allLinesFromAvailableStock());
});

Then('the order should record {int} successful fulfillment', async function (expectedCount: number) {
  const count = await actorCalled('Staff').answer(TheFulfillment.count());
  assert.strictEqual(count, expectedCount);

  const status = await actorCalled('Staff').answer(TheFulfillment.latestStatus());
  assert.strictEqual(status, 'FULFILLED');
});

Then('all order lines should be marked as fulfilled', async function () {
  const lines = await actorCalled('Staff').answer(TheOrder.lines());
  assert.ok(lines.length > 0, 'Expected at least one order line');
  for (const line of lines) {
    assert.strictEqual(
      line.quantityFulfilled,
      line.quantity,
      `Expected line ${line.id} to be fulfilled (${line.quantityFulfilled}/${line.quantity})`
    );
  }
});

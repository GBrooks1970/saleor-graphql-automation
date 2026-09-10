import { Given, When, Then } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import assert from 'node:assert';
import { CallGraphQL } from '../../src/screenplay/abilities/CallGraphQL.js';
import { Authenticate } from '../../src/screenplay/tasks/Authenticate.js';
import { CompleteCheckout } from '../../src/screenplay/tasks/CompleteCheckout.js';
import { CreateCheckout } from '../../src/screenplay/tasks/CreateCheckout.js';
import { RecordCheckoutTransaction } from '../../src/screenplay/tasks/RecordCheckoutTransaction.js';
import { SelectCheckoutDeliveryMethod } from '../../src/screenplay/tasks/SelectCheckoutDeliveryMethod.js';
import { SelectCheckoutVariant } from '../../src/screenplay/tasks/SelectCheckoutVariant.js';
import { SetCheckoutBillingAddress } from '../../src/screenplay/tasks/SetCheckoutBillingAddress.js';
import { SetCheckoutShippingAddress } from '../../src/screenplay/tasks/SetCheckoutShippingAddress.js';
import { TheCheckout } from '../../src/screenplay/questions/TheCheckout.js';
import { TheOrder } from '../../src/screenplay/questions/TheOrder.js';

Given('an administrator can record checkout transactions', async function () {
  const email = process.env.SALEOR_ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.SALEOR_ADMIN_PASSWORD || 'admin';
  await actorCalled('Admin').attemptsTo(Authenticate.withCredentials(email, password));

  const token = actorCalled('Admin').abilityTo(CallGraphQL).getAuthToken();
  assert.ok(token, `Admin authentication failed for ${email}`);
});

When(
  'the customer selects an available product variant in channel {string}',
  async function (channel: string) {
    (this as any).checkoutChannel = channel;
    await actorCalled('Customer').attemptsTo(SelectCheckoutVariant.inChannel(channel));
  }
);

When('creates a checkout containing {int} item', async function (quantity: number) {
  const channel = (this as any).checkoutChannel;
  assert.ok(channel, 'Checkout channel must be recorded');
  await actorCalled('Customer').attemptsTo(CreateCheckout.withSelectedVariant(channel, quantity));
});

When('attaches valid shipping and billing addresses', async function () {
  await actorCalled('Customer').attemptsTo(
    SetCheckoutShippingAddress.to(),
    SetCheckoutBillingAddress.to()
  );
});

When('selects the first available delivery method', async function () {
  await actorCalled('Customer').attemptsTo(SelectCheckoutDeliveryMethod.firstAvailable());
});

When('the administrator records the checkout total as charged', async function () {
  await actorCalled('Admin').attemptsTo(RecordCheckoutTransaction.asFullyCharged());
});

When('the customer completes the checkout', async function () {
  await actorCalled('Customer').attemptsTo(CompleteCheckout.andPlaceOrder());
});

Then('a confirmed order should be created', async function () {
  const checkout = await actorCalled('Customer').answer(TheCheckout.state());
  const order = await actorCalled('Customer').answer(TheOrder.placed());

  assert.ok(order.id, 'Completed checkout must return an order ID');
  assert.ok(order.number, 'Completed checkout must return an order number');
  assert.strictEqual(order.status, 'UNFULFILLED');
  assert.strictEqual(order.total.currency, checkout.total.currency);
  assert.strictEqual(order.total.amount, checkout.total.amount);
  console.log(
    `[Checkout Evidence] Order #${order.number}: status=${order.status}, `
      + `paymentStatus=${order.paymentStatus}, chargeStatus=${order.chargeStatus}, `
      + `total=${order.total.amount} ${order.total.currency}`
  );
});

Then('the order should be fully charged', async function () {
  const paymentStatus = await actorCalled('Customer').answer(TheOrder.paymentStatus());
  const chargeStatus = await actorCalled('Customer').answer(TheOrder.chargeStatus());

  assert.strictEqual(paymentStatus, 'FULLY_CHARGED');
  assert.strictEqual(chargeStatus, 'FULL');
});

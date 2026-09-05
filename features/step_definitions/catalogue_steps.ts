import { Given, When, Then } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import assert from 'node:assert';
import { QueryShopInfo } from '../../src/screenplay/tasks/QueryShopInfo.js';
import { BrowseCatalogue } from '../../src/screenplay/tasks/BrowseCatalogue.js';
import { TheShopInfo } from '../../src/screenplay/questions/TheShopInfo.js';
import { TheProducts } from '../../src/screenplay/questions/TheProducts.js';

Given('the guest actor is browsing the storefront', function () {
  actorCalled('Guest');
});

When('they query the shop information', async function () {
  await actorCalled('Guest').attemptsTo(QueryShopInfo.toVerifyHealth());
});

Then('the shop name should be {string}', async function (expectedName: string) {
  const actualName = await actorCalled('Guest').answer(TheShopInfo.name());
  assert.strictEqual(actualName, expectedName);
});

When('they browse the catalogue in channel {string}', async function (channel: string) {
  await actorCalled('Guest').attemptsTo(BrowseCatalogue.inChannel(channel, 10));
});

Then('at least {int} product should be available in the catalogue', async function (minCount: number) {
  const count = await actorCalled('Guest').answer(TheProducts.totalCount());
  assert.ok(count >= minCount, `Expected at least ${minCount} products, got ${count}`);
});

Then('all returned products should have valid pricing', async function () {
  const edges = await actorCalled('Guest').answer(TheProducts.edges());
  assert.ok(edges.length > 0, 'Edges must not be empty');

  for (const edge of edges) {
    const amount = edge.node.pricing?.priceRange?.start?.gross?.amount;
    assert.ok(typeof amount === 'number' && amount > 0, `Product ${edge.node.name} must have a valid price > 0`);
  }
});

When('they query the first {int} products in channel {string}', async function (first: number, channel: string) {
  await actorCalled('Guest').attemptsTo(BrowseCatalogue.inChannel(channel, first));
});

Then('exactly {int} products should be returned', async function (expectedCount: number) {
  const edges = await actorCalled('Guest').answer(TheProducts.edges());
  assert.strictEqual(edges.length, expectedCount);
});

Then('page info should indicate whether more products exist', async function () {
  const pageInfo = await actorCalled('Guest').answer(TheProducts.pageInfo());
  assert.ok(pageInfo !== undefined, 'pageInfo must be present');
  assert.ok(typeof pageInfo?.hasNextPage === 'boolean', 'hasNextPage must be boolean');
});

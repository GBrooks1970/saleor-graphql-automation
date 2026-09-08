import { BeforeAll, AfterAll, Before, setDefaultTimeout } from '@cucumber/cucumber';
import { actorCalled, Notepad, TakeNotes } from '@serenity-js/core';
import { CallGraphQL } from '../../src/screenplay/abilities/CallGraphQL.js';
import { CheckoutNotes } from '../../src/screenplay/checkout/CheckoutNotes.js';
import { startMockServer } from '../../src/mock/server.js';

setDefaultTimeout(30000);

let mockServerHandle: { url: string; close: () => Promise<void> } | undefined;

BeforeAll({ timeout: 30000 }, async function () {
  const explicitTargetUrl = process.env.SALEOR_GRAPHQL_URL;
  const targetUrl = explicitTargetUrl || 'http://localhost:8000/graphql/';

  let liveOk = false;
  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ shop { name } }' }),
    });
    if (res.ok) {
      const json = (await res.json()) as { data?: { shop?: { name?: string } } };
      if (json?.data?.shop?.name) {
        liveOk = true;
        console.log(`[Cucumber Hooks] Connected to live Saleor SUT at ${targetUrl}`);
      }
    }
  } catch {
    liveOk = false;
  }

  if (!liveOk) {
    if (explicitTargetUrl) {
      throw new Error(`Explicit Saleor SUT is unavailable or unhealthy: ${explicitTargetUrl}`);
    }
    mockServerHandle = await startMockServer(0);
    process.env.SALEOR_GRAPHQL_URL = mockServerHandle.url;
    console.log(`[Cucumber Hooks] Started local test SUT at ${mockServerHandle.url}`);
  }
});

AfterAll({ timeout: 15000 }, async function () {
  if (mockServerHandle) {
    await mockServerHandle.close();
    console.log('[Cucumber Hooks] Closed local test SUT.');
  }
});

Before(function () {
  const endpoint = process.env.SALEOR_GRAPHQL_URL || 'http://localhost:8000/graphql/';
  const sharedCheckoutNotes = Notepad.empty<CheckoutNotes>();
  actorCalled('Guest').whoCan(CallGraphQL.using(endpoint));
  actorCalled('Customer').whoCan(
    CallGraphQL.using(endpoint),
    TakeNotes.using(sharedCheckoutNotes)
  );
  actorCalled('Admin').whoCan(
    CallGraphQL.using(endpoint),
    TakeNotes.using(sharedCheckoutNotes)
  );
});

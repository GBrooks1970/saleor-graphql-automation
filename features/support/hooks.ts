import { BeforeAll, AfterAll, Before, setDefaultTimeout, setWorldConstructor } from '@cucumber/cucumber';
import { configure } from '@serenity-js/core';
import { ConsoleReporter } from '@serenity-js/console-reporter';
import { HtmlReporter } from '@serenity-js/html-reporter';
import { prepareScenarioActors } from '../../src/screenplay/actors/prepareScenarioActors.js';
import { startMockServer } from '../../src/mock/server.js';
import { SaleorWorld } from './SaleorWorld.js';

setDefaultTimeout(30000);
setWorldConstructor(SaleorWorld);

let mockServerHandle: { url: string; close: () => Promise<void> } | undefined;

BeforeAll({ timeout: 30000 }, async function () {
  const suite = process.env.SERENITY_REPORT_SUITE ?? 'default';
  if (!['default', 'smoke', 'api', 'checkout'].includes(suite)) {
    throw new Error(`Unknown Serenity report suite: ${suite}`);
  }
  configure({
    crew: [
      ConsoleReporter.fromJSON({ theme: 'auto' }),
      HtmlReporter.fromJSON({
        outputDirectory: `target/site/serenity/${suite}`,
        specDirectory: './features',
        title: `Saleor GraphQL Automation — ${suite}`,
        projectName: 'Saleor GraphQL Automation',
        testRunId: 'current',
        moduleId: suite,
        maxHistory: 1,
      }),
    ],
  });
  const explicitTargetUrl = process.env.SALEOR_GRAPHQL_URL;

  if (!explicitTargetUrl) {
    mockServerHandle = await startMockServer(0);
    process.env.SALEOR_GRAPHQL_URL = mockServerHandle.url;
    console.log(`[Cucumber Hooks] Started local test SUT at ${mockServerHandle.url}`);
    return;
  }

  let liveOk = false;
  try {
    const res = await fetch(explicitTargetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ shop { name } }' }),
    });
    if (res.ok) {
      const json = (await res.json()) as { data?: { shop?: { name?: string } } };
      if (json?.data?.shop?.name) {
        liveOk = true;
        console.log(`[Cucumber Hooks] Connected to live Saleor SUT at ${explicitTargetUrl}`);
      }
    }
  } catch {
    liveOk = false;
  }

  if (!liveOk) {
    throw new Error(`Explicit Saleor SUT is unavailable or unhealthy: ${explicitTargetUrl}`);
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
  prepareScenarioActors(endpoint);
});

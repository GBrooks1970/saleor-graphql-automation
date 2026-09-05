/**
 * SUT Readiness Probe (R1-01)
 *
 * Polls the Saleor GraphQL HTTP endpoint until `{ shop { name } }` returns HTTP 200.
 * A pure TCP socket check is insufficient because Uvicorn and Django need time to initialise.
 */

const ENDPOINT = process.env.SALEOR_GRAPHQL_URL || 'http://localhost:8000/graphql/';
const TIMEOUT_MS = parseInt(process.env.SUT_TIMEOUT_MS || '60000', 10);
const INTERVAL_MS = 2000;

async function checkReadiness(): Promise<boolean> {
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ shop { name } }' }),
    });

    if (!res.ok) {
      return false;
    }

    const body = (await res.json()) as { data?: { shop?: { name?: string } } };
    return Boolean(body?.data?.shop?.name);
  } catch {
    return false;
  }
}

async function main() {
  console.log(`[wait-for-sut] Waiting for Saleor SUT at ${ENDPOINT}...`);
  const startTime = Date.now();

  while (Date.now() - startTime < TIMEOUT_MS) {
    const ready = await checkReadiness();
    if (ready) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[wait-for-sut] SUT is healthy and responding to GraphQL queries (${elapsed}s).`);
      process.exit(0);
    }
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }

  console.error(`[wait-for-sut] Timed out after ${TIMEOUT_MS / 1000}s waiting for ${ENDPOINT}.`);
  process.exit(1);
}

main();

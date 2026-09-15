import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { CallGraphQL } from '../../src/screenplay/abilities/CallGraphQL.js';
import { GraphQLLatencyError } from '../../src/screenplay/errors/index.js';

describe('CallGraphQL Ability (Unit Tests)', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('initialises with default endpoint and headers', () => {
    const ability = CallGraphQL.using('http://test-server/graphql', { 'X-Custom-Header': 'CustomValue' });
    assert.ok(ability);
    assert.strictEqual(ability.getAuthToken(), undefined);
    assert.strictEqual(ability.getEffectiveTimeoutMs(), 15000);
    assert.strictEqual(ability.getEffectiveMaxLatencyMs(), 2000);
  });

  it('allows custom timeout and latency thresholds via constructor options', () => {
    const ability = CallGraphQL.using(
      'http://test-server/graphql',
      {},
      { timeoutMs: 5000, maxLatencyMs: 1000 }
    );
    assert.strictEqual(ability.getEffectiveTimeoutMs(), 5000);
    assert.strictEqual(ability.getEffectiveMaxLatencyMs(), 1000);

    ability.setDefaultTimeoutMs(8000);
    ability.setDefaultMaxLatencyMs(1500);
    assert.strictEqual(ability.getEffectiveTimeoutMs(), 8000);
    assert.strictEqual(ability.getEffectiveMaxLatencyMs(), 1500);
  });

  it('manages auth tokens correctly', () => {
    const ability = CallGraphQL.using('http://test-server/graphql');
    ability.setAuthToken('jwt-sample-token-xyz');
    assert.strictEqual(ability.getAuthToken(), 'jwt-sample-token-xyz');

    ability.clearAuthToken();
    assert.strictEqual(ability.getAuthToken(), undefined);
  });

  it('executes GraphQL query and captures data & latency', async () => {
    globalThis.fetch = async (input, init) => {
      const body = JSON.parse(init?.body as string);
      assert.strictEqual(body.query, '{ shop { name } }');

      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          data: {
            shop: {
              name: 'Saleor e-commerce',
            },
          },
        }),
      } as Response;
    };

    const ability = CallGraphQL.using('http://test-server/graphql');
    const result = await ability.execute<{ shop: { name: string } }>('{ shop { name } }');

    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.data?.shop?.name, 'Saleor e-commerce');
    assert.strictEqual(result.errors, undefined);
    assert.strictEqual(result.errorCategory, undefined);
    assert.ok(result.latencyMs >= 0);

    const last = ability.getLastResponse();
    assert.strictEqual(last?.data?.shop?.name, 'Saleor e-commerce');
  });

  it('injects Bearer token into headers when auth token is present', async () => {
    let capturedAuthHeader: string | undefined;

    globalThis.fetch = async (input, init) => {
      const headers = init?.headers as Record<string, string>;
      capturedAuthHeader = headers?.['Authorization'];

      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: async () => ({ data: { me: { id: 'usr-1' } } }),
      } as Response;
    };

    const ability = CallGraphQL.using('http://test-server/graphql');
    ability.setAuthToken('valid-bearer-jwt');
    await ability.execute('{ me { id } }');

    assert.strictEqual(capturedAuthHeader, 'Bearer valid-bearer-jwt');
  });

  it('captures GraphQL errors and classifies errorCategory as GRAPHQL_ERROR', async () => {
    globalThis.fetch = async () => {
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: async () => ({
          data: null,
          errors: [
            {
              message: 'Invalid credentials',
              extensions: { code: 'INVALID_CREDENTIALS' },
            },
          ],
        }),
      } as Response;
    };

    const ability = CallGraphQL.using('http://test-server/graphql');
    const result = await ability.execute('mutation { tokenCreate }');

    assert.strictEqual(result.data, null);
    assert.strictEqual(result.errors?.length, 1);
    assert.strictEqual(result.errorCategory, 'GRAPHQL_ERROR');
    assert.strictEqual(ability.getLastError()?.message, 'Invalid credentials');
    assert.strictEqual(ability.getLastError()?.extensions?.code, 'INVALID_CREDENTIALS');
  });

  it('handles network transport failure gracefully and classifies as NETWORK', async () => {
    globalThis.fetch = async () => {
      throw new Error('Connection refused');
    };

    const ability = CallGraphQL.using('http://test-server/graphql');
    const result = await ability.execute('{ shop { name } }');

    assert.strictEqual(result.status, 0);
    assert.strictEqual(result.data, null);
    assert.strictEqual(result.errorCategory, 'NETWORK');
    assert.strictEqual(result.errors?.[0]?.message, 'Connection refused');
  });

  it('handles request timeout abort and classifies errorCategory as TIMEOUT', async () => {
    globalThis.fetch = async (input, init) => {
      const error = new Error('The operation was aborted due to timeout');
      error.name = 'TimeoutError';
      throw error;
    };

    const ability = CallGraphQL.using('http://test-server/graphql', {}, { timeoutMs: 250 });
    const result = await ability.execute('{ shop { name } }');

    assert.strictEqual(result.status, 0);
    assert.strictEqual(result.data, null);
    assert.strictEqual(result.errorCategory, 'TIMEOUT');
    assert.ok(result.errors?.[0]?.message.includes('timed out after 250ms'));
  });

  it('handles HTTP non-2xx status and classifies errorCategory as HTTP_ERROR', async () => {
    globalThis.fetch = async () => {
      return {
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ errors: [{ message: 'Bad Gateway' }] }),
      } as Response;
    };

    const ability = CallGraphQL.using('http://test-server/graphql');
    const result = await ability.execute('{ shop { name } }');

    assert.strictEqual(result.status, 502);
    assert.strictEqual(result.errorCategory, 'HTTP_ERROR');
  });

  it('handles invalid non-JSON responses and classifies errorCategory as INVALID_JSON', async () => {
    globalThis.fetch = async () => {
      return {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers({ 'content-type': 'text/html' }),
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON at position 0');
        },
      } as unknown as Response;
    };

    const ability = CallGraphQL.using('http://test-server/graphql');
    const result = await ability.execute('{ shop { name } }');

    assert.strictEqual(result.status, 500);
    assert.strictEqual(result.errorCategory, 'INVALID_JSON');
    assert.ok(result.errors?.[0]?.message.includes('Invalid JSON response'));
  });

  it('enforces latency thresholds via assertLatencyWithin()', async () => {
    globalThis.fetch = async () => {
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: async () => ({ data: { shop: { name: 'Saleor' } } }),
      } as Response;
    };

    const ability = CallGraphQL.using('http://test-server/graphql', {}, { maxLatencyMs: 5000 });
    await ability.execute('{ shop { name } }');

    // Should not throw when latency is well within threshold
    assert.doesNotThrow(() => {
      ability.assertLatencyWithin(5000);
    });

    // Should throw GraphQLLatencyError when threshold is exceeded (threshold: -1ms forces failure)
    assert.throws(
      () => {
        ability.assertLatencyWithin(-1, 'ShopQuery');
      },
      (err: unknown) => {
        assert.ok(err instanceof GraphQLLatencyError);
        assert.strictEqual(err.operation, 'ShopQuery');
        assert.ok(err.message.includes('ShopQuery exceeded latency threshold'));
        return true;
      }
    );
  });
});

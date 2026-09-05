import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { CallGraphQL } from '../../src/screenplay/abilities/CallGraphQL.js';

describe('CallGraphQL Ability (Unit Tests)', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('initialises with default endpoint and headers', () => {
    const ability = CallGraphQL.using('http://test-server/graphql', { 'X-Custom-Header': 'CustomValue' });
    assert.ok(ability);
    assert.strictEqual(ability.getAuthToken(), undefined);
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

  it('captures GraphQL errors and exposes error helpers', async () => {
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
    assert.strictEqual(ability.getLastError()?.message, 'Invalid credentials');
    assert.strictEqual(ability.getLastError()?.extensions?.code, 'INVALID_CREDENTIALS');
  });

  it('handles network transport failure gracefully without unhandled rejection', async () => {
    globalThis.fetch = async () => {
      throw new Error('Connection refused');
    };

    const ability = CallGraphQL.using('http://test-server/graphql');
    const result = await ability.execute('{ shop { name } }');

    assert.strictEqual(result.status, 0);
    assert.strictEqual(result.data, null);
    assert.strictEqual(result.errors?.[0]?.message, 'Connection refused');
  });
});

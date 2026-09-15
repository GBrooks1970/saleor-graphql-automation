import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert';
import { actorCalled } from '@serenity-js/core';
import { CallGraphQL, type GraphQLResponse } from '../../src/screenplay/abilities/CallGraphQL.js';
import {
  GraphQLOperationError,
  GraphQLTimeoutError,
  GraphQLNetworkError,
  GraphQLHttpError,
  GraphQLInvalidJsonError,
  GraphQLSyntaxError,
  GraphQLDomainError,
  GraphQLLatencyError,
  requireTransportSuccess,
  requireOperationSuccess,
  requireOperationPayload,
} from '../../src/screenplay/errors/index.js';
import { Authenticate } from '../../src/screenplay/tasks/Authenticate.js';
import { RefreshToken } from '../../src/screenplay/tasks/RefreshToken.js';
import { QueryShopInfo } from '../../src/screenplay/tasks/QueryShopInfo.js';
import { BrowseCatalogue } from '../../src/screenplay/tasks/BrowseCatalogue.js';
import { QueryCurrentUser } from '../../src/screenplay/tasks/QueryCurrentUser.js';

describe('GraphQL Typed Error Model & Task Promotion (Unit Tests)', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('requireTransportSuccess', () => {
    it('passes valid 200 HTTP response', () => {
      const response: GraphQLResponse = {
        data: { ok: true },
        status: 200,
        latencyMs: 42,
        headers: {},
      };
      const result = requireTransportSuccess('TestOp', response);
      assert.strictEqual(result, response);
    });

    it('throws GraphQLTimeoutError on TIMEOUT errorCategory', () => {
      const response: GraphQLResponse = {
        data: null,
        status: 0,
        latencyMs: 15050,
        headers: {},
        errorCategory: 'TIMEOUT',
        timeoutMs: 15000,
        errors: [{ message: 'GraphQL request timed out after 15000ms' }],
      };

      assert.throws(
        () => requireTransportSuccess('TimeoutOp', response),
        (err: unknown) => {
          assert.ok(err instanceof GraphQLTimeoutError);
          assert.strictEqual(err.category, 'TIMEOUT');
          assert.strictEqual(err.timeoutMs, 15000);
          assert.strictEqual(err.latencyMs, 15050);
          assert.ok(err.message.includes('TimeoutOp timed out after 15000ms'));
          return true;
        }
      );
    });

    it('throws GraphQLNetworkError on NETWORK errorCategory', () => {
      const response: GraphQLResponse = {
        data: null,
        status: 0,
        latencyMs: 12,
        headers: {},
        errorCategory: 'NETWORK',
        errors: [{ message: 'ECONNREFUSED 127.0.0.1:8000' }],
      };

      assert.throws(
        () => requireTransportSuccess('NetworkOp', response),
        (err: unknown) => {
          assert.ok(err instanceof GraphQLNetworkError);
          assert.strictEqual(err.category, 'NETWORK');
          assert.ok(err.message.includes('ECONNREFUSED'));
          return true;
        }
      );
    });

    it('throws GraphQLInvalidJsonError on INVALID_JSON errorCategory', () => {
      const response: GraphQLResponse = {
        data: null,
        status: 502,
        latencyMs: 30,
        headers: {},
        errorCategory: 'INVALID_JSON',
        errors: [{ message: 'Invalid JSON response: Bad Gateway' }],
      };

      assert.throws(
        () => requireTransportSuccess('InvalidJsonOp', response),
        (err: unknown) => {
          assert.ok(err instanceof GraphQLInvalidJsonError);
          assert.strictEqual(err.category, 'INVALID_JSON');
          assert.strictEqual(err.status, 502);
          return true;
        }
      );
    });

    it('throws GraphQLHttpError on non-2xx HTTP status', () => {
      const response: GraphQLResponse = {
        data: null,
        status: 500,
        latencyMs: 25,
        headers: {},
        errorCategory: 'HTTP_ERROR',
        errors: [{ message: 'Internal Server Error' }],
      };

      assert.throws(
        () => requireTransportSuccess('HttpErrorOp', response),
        (err: unknown) => {
          assert.ok(err instanceof GraphQLHttpError);
          assert.strictEqual(err.category, 'HTTP_ERROR');
          assert.strictEqual(err.status, 500);
          return true;
        }
      );
    });
  });

  describe('requireOperationSuccess', () => {
    it('throws GraphQLSyntaxError when top-level errors are present', () => {
      const response: GraphQLResponse = {
        data: null,
        status: 200,
        latencyMs: 15,
        headers: {},
        errors: [
          {
            message: 'Cannot query field "unknown" on type "Query"',
            extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
          },
        ],
      };

      assert.throws(
        () => requireOperationSuccess('SyntaxOp', response),
        (err: unknown) => {
          assert.ok(err instanceof GraphQLSyntaxError);
          assert.strictEqual(err.category, 'GRAPHQL_ERROR');
          assert.strictEqual(err.graphQLErrors?.length, 1);
          assert.ok(err.message.includes('Cannot query field'));
          return true;
        }
      );
    });
  });

  describe('requireOperationPayload', () => {
    it('throws GraphQLOperationError when payload is missing', () => {
      const response: GraphQLResponse = {
        data: null,
        status: 200,
        latencyMs: 10,
        headers: {},
      };

      assert.throws(
        () => requireOperationPayload('NoPayloadOp', response, null),
        (err: unknown) => {
          assert.ok(err instanceof GraphQLOperationError);
          assert.ok(err.message.includes('NoPayloadOp returned no payload'));
          return true;
        }
      );
    });

    it('throws GraphQLDomainError when payload contains domain errors', () => {
      const response: GraphQLResponse = {
        data: {
          checkoutCreate: {
            checkout: null,
            errors: [{ field: 'lines', message: 'Insufficient stock', code: 'INSUFFICIENT_STOCK' }],
          },
        },
        status: 200,
        latencyMs: 20,
        headers: {},
      };

      assert.throws(
        () =>
          requireOperationPayload('CreateCheckout', response, {
            checkout: null,
            errors: [{ field: 'lines', message: 'Insufficient stock', code: 'INSUFFICIENT_STOCK' }],
          }),
        (err: unknown) => {
          assert.ok(err instanceof GraphQLDomainError);
          assert.strictEqual(err.category, 'DOMAIN_ERROR');
          assert.strictEqual(err.domainErrors?.length, 1);
          assert.ok(err.message.includes('Insufficient stock'));
          assert.ok(err.message.includes('[INSUFFICIENT_STOCK]'));
          return true;
        }
      );
    });

    it('returns unwrapped payload when clean', () => {
      const response: GraphQLResponse<{ shop: { name: string } }> = {
        data: {
          shop: { name: 'Saleor e-commerce' },
        },
        status: 200,
        latencyMs: 18,
        headers: {},
      };

      const payload = requireOperationPayload('GetShopInfo', response, response.data?.shop);
      assert.deepStrictEqual(payload, { name: 'Saleor e-commerce' });
    });
  });

  describe('Task-level authentication state clearing and error promotion', () => {
    it('clears stale authentication state before issuing credentials attempt', async () => {
      globalThis.fetch = async () => {
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          json: async () => ({
            data: {
              tokenCreate: {
                token: null,
                refreshToken: null,
                csrfToken: null,
                user: null,
                errors: [{ field: null, message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }],
              },
            },
          }),
        } as Response;
      };

      const ability = CallGraphQL.using('http://test-server/graphql');
      ability.setAuthToken('stale-expired-jwt');
      assert.strictEqual(ability.getAuthToken(), 'stale-expired-jwt');

      const actor = actorCalled('RotatingActor').whoCan(ability);
      await actor.attemptsTo(Authenticate.withCredentials('test@example.com', 'wrongpassword'));

      // Auth token must have been cleared and remain cleared after failed login
      assert.strictEqual(ability.getAuthToken(), undefined);
      assert.strictEqual(ability.getLastResponse()?.data?.tokenCreate?.errors[0].code, 'INVALID_CREDENTIALS');
    });

    it('sets new auth token when Authenticate succeeds', async () => {
      globalThis.fetch = async () => {
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          json: async () => ({
            data: {
              tokenCreate: {
                token: 'fresh-valid-jwt',
                refreshToken: 'fresh-refresh-jwt',
                csrfToken: 'csrf-123',
                user: { id: 'u1', email: 'user@example.test', isStaff: false },
                errors: [],
              },
            },
          }),
        } as Response;
      };

      const ability = CallGraphQL.using('http://test-server/graphql');
      ability.setAuthToken('old-token');

      const actor = actorCalled('SuccessActor').whoCan(ability);
      await actor.attemptsTo(Authenticate.withCredentials('user@example.test', 'correctpassword'));

      assert.strictEqual(ability.getAuthToken(), 'fresh-valid-jwt');
    });

    it('clears auth token when RefreshToken fails', async () => {
      globalThis.fetch = async () => {
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          json: async () => ({
            data: {
              tokenRefresh: {
                token: null,
                errors: [{ field: null, message: 'Invalid refresh token', code: 'JWT_INVALID_TOKEN' }],
              },
            },
          }),
        } as Response;
      };

      const ability = CallGraphQL.using('http://test-server/graphql');
      ability.setAuthToken('about-to-expire-jwt');

      const actor = actorCalled('RefreshFailActor').whoCan(ability);
      await actor.attemptsTo(RefreshToken.using('bad-refresh-token'));

      assert.strictEqual(ability.getAuthToken(), undefined);
    });

    it('propagates typed errors from QueryShopInfo on transport failure', async () => {
      globalThis.fetch = async () => {
        throw new Error('Connection refused');
      };

      const ability = CallGraphQL.using('http://test-server/graphql');
      const actor = actorCalled('ShopQueryActor').whoCan(ability);

      await assert.rejects(
        () => actor.attemptsTo(QueryShopInfo.toVerifyHealth()),
        (err: unknown) => {
          assert.ok(err instanceof GraphQLNetworkError);
          assert.strictEqual(err.category, 'NETWORK');
          return true;
        }
      );
    });

    it('propagates typed errors from BrowseCatalogue on HTTP error', async () => {
      globalThis.fetch = async () => {
        return {
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers(),
          json: async () => ({ errors: [{ message: 'Unavailable' }] }),
        } as Response;
      };

      const ability = CallGraphQL.using('http://test-server/graphql');
      const actor = actorCalled('CatalogueActor').whoCan(ability);

      await assert.rejects(
        () => actor.attemptsTo(BrowseCatalogue.inChannel('default-channel')),
        (err: unknown) => {
          assert.ok(err instanceof GraphQLHttpError);
          assert.strictEqual(err.category, 'HTTP_ERROR');
          assert.strictEqual(err.status, 503);
          return true;
        }
      );
    });

    it('propagates typed errors from QueryCurrentUser when payload is missing', async () => {
      globalThis.fetch = async () => {
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          json: async () => ({ data: { me: null } }),
        } as Response;
      };

      const ability = CallGraphQL.using('http://test-server/graphql');
      const actor = actorCalled('CurrentUserActor').whoCan(ability);

      await assert.rejects(
        () => actor.attemptsTo(QueryCurrentUser.profile()),
        (err: unknown) => {
          assert.ok(err instanceof GraphQLOperationError);
          assert.ok(err.message.includes('GetCurrentUser returned no payload'));
          return true;
        }
      );
    });
  });
});

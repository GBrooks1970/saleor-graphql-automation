import { Ability } from '@serenity-js/core';
import { GraphQLLatencyError, type GraphQLErrorCategory } from '../errors/GraphQLOperationError.js';

export interface GraphQLErrorLocation {
  line: number;
  column: number;
}

export interface GraphQLErrorExtension {
  code?: string;
  exception?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface GraphQLError {
  message: string;
  locations?: GraphQLErrorLocation[];
  path?: Array<string | number>;
  extensions?: GraphQLErrorExtension;
}

export interface GraphQLResponse<T = Record<string, unknown>> {
  data?: T | null;
  errors?: GraphQLError[];
  status: number;
  latencyMs: number;
  headers: Record<string, string>;
  errorCategory?: GraphQLErrorCategory;
  timeoutMs?: number;
}

export class CallGraphQL extends Ability {
  private lastResponse?: GraphQLResponse<any>;
  private authToken?: string;

  static using(
    endpoint: string = process.env.SALEOR_GRAPHQL_URL || 'http://localhost:8000/graphql/',
    defaultHeaders: Record<string, string> = {},
    options?: { timeoutMs?: number; maxLatencyMs?: number }
  ): CallGraphQL {
    return new CallGraphQL(endpoint, defaultHeaders, options?.timeoutMs, options?.maxLatencyMs);
  }

  constructor(
    private readonly endpoint: string,
    private readonly defaultHeaders: Record<string, string> = {},
    private defaultTimeoutMs: number = parseInt(process.env.SALEOR_GRAPHQL_TIMEOUT_MS || '15000', 10),
    private defaultMaxLatencyMs: number = parseInt(process.env.SALEOR_GRAPHQL_MAX_LATENCY_MS || '2000', 10)
  ) {
    super();
  }

  public setAuthToken(token: string): void {
    this.authToken = token;
  }

  public clearAuthToken(): void {
    this.authToken = undefined;
  }

  public getAuthToken(): string | undefined {
    return this.authToken;
  }

  public getLastResponse<T = any>(): GraphQLResponse<T> | undefined {
    return this.lastResponse;
  }

  public getLastError(): GraphQLError | undefined {
    return this.lastResponse?.errors?.[0];
  }

  public getLastErrors(): GraphQLError[] {
    return this.lastResponse?.errors || [];
  }

  public getLastLatencyMs(): number {
    return this.lastResponse?.latencyMs || 0;
  }

  public getEffectiveTimeoutMs(): number {
    return this.defaultTimeoutMs;
  }

  public setDefaultTimeoutMs(ms: number): void {
    this.defaultTimeoutMs = ms;
  }

  public getEffectiveMaxLatencyMs(): number {
    return this.defaultMaxLatencyMs;
  }

  public setDefaultMaxLatencyMs(ms: number): void {
    this.defaultMaxLatencyMs = ms;
  }

  public assertLatencyWithin(maxLatencyMs?: number, operation?: string): void {
    const threshold = maxLatencyMs ?? this.defaultMaxLatencyMs;
    const latency = this.getLastLatencyMs();
    if (latency > threshold) {
      throw new GraphQLLatencyError(operation || 'GraphQL operation', latency, threshold);
    }
  }

  public async execute<T = Record<string, unknown>>(
    query: string,
    variables?: Record<string, unknown>,
    headers: Record<string, string> = {},
    timeoutMs?: number
  ): Promise<GraphQLResponse<T>> {
    const effectiveTimeoutMs = timeoutMs ?? this.defaultTimeoutMs;
    const combinedHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...this.defaultHeaders,
      ...headers,
    };

    if (this.authToken && !combinedHeaders['Authorization']) {
      combinedHeaders['Authorization'] = `Bearer ${this.authToken}`;
    }

    const startTime = performance.now();
    let signal: AbortSignal | undefined;
    try {
      signal = AbortSignal.timeout(effectiveTimeoutMs);
    } catch {
      // Fallback if AbortSignal.timeout is not supported
    }

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: combinedHeaders,
        body: JSON.stringify({ query, variables }),
        signal,
      });

      const latencyMs = Math.round(performance.now() - startTime);
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let json: { data?: T; errors?: GraphQLError[] };
      let invalidJson = false;
      try {
        json = (await response.json()) as { data?: T; errors?: GraphQLError[] };
      } catch {
        invalidJson = true;
        json = { errors: [{ message: `Invalid JSON response: ${response.statusText || response.status}` }] };
      }

      let errorCategory: GraphQLErrorCategory | undefined;
      if (invalidJson) {
        errorCategory = 'INVALID_JSON';
      } else if (response.status < 200 || response.status >= 300) {
        errorCategory = 'HTTP_ERROR';
      } else if (json.errors?.length) {
        errorCategory = 'GRAPHQL_ERROR';
      }

      const result: GraphQLResponse<T> = {
        data: json.data,
        errors: json.errors,
        status: response.status,
        latencyMs,
        headers: responseHeaders,
        errorCategory,
        timeoutMs: effectiveTimeoutMs,
      };

      this.lastResponse = result;
      return result;
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      const isTimeout =
        err?.name === 'TimeoutError' ||
        (err?.name === 'AbortError' && signal?.aborted) ||
        (err?.cause && (err.cause as Error)?.name === 'TimeoutError');

      const errorCategory: GraphQLErrorCategory = isTimeout ? 'TIMEOUT' : 'NETWORK';
      const message = isTimeout
        ? `GraphQL request timed out after ${effectiveTimeoutMs}ms`
        : (err?.message || 'Network error executing GraphQL query');

      const result: GraphQLResponse<T> = {
        data: null,
        errors: [{ message }],
        status: 0,
        latencyMs,
        headers: {},
        errorCategory,
        timeoutMs: effectiveTimeoutMs,
      };

      this.lastResponse = result;
      return result;
    }
  }
}

import type { GraphQLError, GraphQLResponse } from '../abilities/CallGraphQL.js';

export type GraphQLErrorCategory =
  | 'TIMEOUT'
  | 'NETWORK'
  | 'HTTP_ERROR'
  | 'INVALID_JSON'
  | 'GRAPHQL_ERROR'
  | 'DOMAIN_ERROR';

export interface DomainError {
  field?: string | null;
  message?: string | null;
  code?: string | null;
}

export class GraphQLOperationError extends Error {
  public readonly category: GraphQLErrorCategory;
  public readonly operation: string;
  public readonly status?: number;
  public readonly latencyMs?: number;
  public readonly graphQLErrors?: GraphQLError[];
  public readonly domainErrors?: DomainError[];

  constructor(
    category: GraphQLErrorCategory,
    operation: string,
    message: string,
    options?: {
      status?: number;
      latencyMs?: number;
      graphQLErrors?: GraphQLError[];
      domainErrors?: DomainError[];
      cause?: unknown;
    }
  ) {
    super(message, options ? { cause: options.cause } : undefined);
    this.name = 'GraphQLOperationError';
    this.category = category;
    this.operation = operation;
    this.status = options?.status;
    this.latencyMs = options?.latencyMs;
    this.graphQLErrors = options?.graphQLErrors;
    this.domainErrors = options?.domainErrors;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class GraphQLTimeoutError extends GraphQLOperationError {
  public readonly timeoutMs: number;

  constructor(operation: string, latencyMs: number, timeoutMs: number, cause?: unknown) {
    super('TIMEOUT', operation, `${operation} timed out after ${timeoutMs}ms (observed latency: ${latencyMs}ms)`, {
      latencyMs,
      status: 0,
      cause,
    });
    this.name = 'GraphQLTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

export class GraphQLNetworkError extends GraphQLOperationError {
  constructor(operation: string, message: string, latencyMs: number, cause?: unknown) {
    super('NETWORK', operation, `${operation} network transport failure: ${message}`, {
      latencyMs,
      status: 0,
      cause,
    });
    this.name = 'GraphQLNetworkError';
  }
}

export class GraphQLHttpError extends GraphQLOperationError {
  constructor(operation: string, status: number, latencyMs: number, statusText?: string) {
    const text = statusText ? ` (${statusText})` : '';
    super('HTTP_ERROR', operation, `${operation} failed with HTTP status ${status}${text}`, {
      latencyMs,
      status,
    });
    this.name = 'GraphQLHttpError';
  }
}

export class GraphQLInvalidJsonError extends GraphQLOperationError {
  constructor(operation: string, status: number, latencyMs: number, rawMessage?: string) {
    super(
      'INVALID_JSON',
      operation,
      `${operation} returned unparseable JSON response (HTTP ${status}): ${rawMessage || 'unknown payload'}`,
      {
        latencyMs,
        status,
      }
    );
    this.name = 'GraphQLInvalidJsonError';
  }
}

export class GraphQLSyntaxError extends GraphQLOperationError {
  constructor(operation: string, errors: GraphQLError[], latencyMs?: number, status: number = 200) {
    super('GRAPHQL_ERROR', operation, `${operation} returned GraphQL errors: ${formatGraphQLErrors(errors)}`, {
      latencyMs,
      status,
      graphQLErrors: errors,
    });
    this.name = 'GraphQLSyntaxError';
  }
}

export class GraphQLDomainError extends GraphQLOperationError {
  constructor(operation: string, errors: DomainError[], latencyMs?: number, status: number = 200) {
    super('DOMAIN_ERROR', operation, `${operation} returned domain errors: ${formatDomainErrors(errors)}`, {
      latencyMs,
      status,
      domainErrors: errors,
    });
    this.name = 'GraphQLDomainError';
  }
}

export class GraphQLLatencyError extends Error {
  public readonly operation: string;
  public readonly latencyMs: number;
  public readonly maxLatencyMs: number;

  constructor(operation: string, latencyMs: number, maxLatencyMs: number) {
    super(`${operation} exceeded latency threshold: ${latencyMs}ms > ${maxLatencyMs}ms`);
    this.name = 'GraphQLLatencyError';
    this.operation = operation;
    this.latencyMs = latencyMs;
    this.maxLatencyMs = maxLatencyMs;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function formatGraphQLErrors(errors: GraphQLError[]): string {
  return errors
    .map((e) => {
      const code = e.extensions?.code ? ` [${e.extensions.code}]` : '';
      return `${e.message}${code}`;
    })
    .join('; ');
}

export function formatDomainErrors(errors: DomainError[]): string {
  return errors
    .map((error) => {
      const location = error.field ? `${error.field}: ` : '';
      const code = error.code ? ` [${error.code}]` : '';
      return `${location}${error.message ?? 'Unknown error'}${code}`;
    })
    .join('; ');
}

export function requireTransportSuccess<T>(
  operation: string,
  response: GraphQLResponse<T>
): GraphQLResponse<T> {
  if (response.errorCategory === 'TIMEOUT') {
    throw new GraphQLTimeoutError(
      operation,
      response.latencyMs,
      response.timeoutMs ?? 15000
    );
  }

  if (response.errorCategory === 'NETWORK') {
    throw new GraphQLNetworkError(
      operation,
      response.errors?.[0]?.message || 'Network transport failure',
      response.latencyMs
    );
  }

  if (response.errorCategory === 'INVALID_JSON') {
    throw new GraphQLInvalidJsonError(
      operation,
      response.status,
      response.latencyMs,
      response.errors?.[0]?.message
    );
  }

  if (response.status < 200 || response.status >= 300) {
    throw new GraphQLHttpError(
      operation,
      response.status,
      response.latencyMs
    );
  }

  return response;
}

export function requireOperationSuccess<T>(
  operation: string,
  response: GraphQLResponse<T>
): GraphQLResponse<T> {
  requireTransportSuccess(operation, response);

  if (response.errors?.length) {
    throw new GraphQLSyntaxError(operation, response.errors, response.latencyMs, response.status);
  }

  return response;
}

export function requireOperationPayload<T extends object>(
  operation: string,
  response: GraphQLResponse<unknown>,
  payload: T | null | undefined
): T {
  requireOperationSuccess(operation, response);

  if (!payload) {
    throw new GraphQLOperationError(
      'GRAPHQL_ERROR',
      operation,
      `${operation} returned no payload`,
      { status: response.status, latencyMs: response.latencyMs }
    );
  }

  const domainErrors = (payload as { errors?: DomainError[] }).errors;
  if (domainErrors?.length) {
    throw new GraphQLDomainError(operation, domainErrors, response.latencyMs, response.status);
  }

  return payload;
}

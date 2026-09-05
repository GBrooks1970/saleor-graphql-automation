import { Ability, UsesAbilities } from '@serenity-js/core';

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
}

export class CallGraphQL extends Ability {
  private lastResponse?: GraphQLResponse<any>;
  private authToken?: string;

  static using(
    endpoint: string = process.env.SALEOR_GRAPHQL_URL || 'http://localhost:8000/graphql/',
    defaultHeaders: Record<string, string> = {}
  ): CallGraphQL {
    return new CallGraphQL(endpoint, defaultHeaders);
  }

  constructor(
    private readonly endpoint: string,
    private readonly defaultHeaders: Record<string, string> = {}
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

  public async execute<T = Record<string, unknown>>(
    query: string,
    variables?: Record<string, unknown>,
    headers: Record<string, string> = {}
  ): Promise<GraphQLResponse<T>> {
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

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: combinedHeaders,
        body: JSON.stringify({ query, variables }),
      });

      const latencyMs = Math.round(performance.now() - startTime);
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let json: { data?: T; errors?: GraphQLError[] };
      try {
        json = (await response.json()) as { data?: T; errors?: GraphQLError[] };
      } catch {
        json = { errors: [{ message: `Invalid JSON response: ${response.statusText}` }] };
      }

      const result: GraphQLResponse<T> = {
        data: json.data,
        errors: json.errors,
        status: response.status,
        latencyMs,
        headers: responseHeaders,
      };

      this.lastResponse = result;
      return result;
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      const result: GraphQLResponse<T> = {
        data: null,
        errors: [{ message: err.message || 'Network error executing GraphQL query' }],
        status: 0,
        latencyMs,
        headers: {},
      };

      this.lastResponse = result;
      return result;
    }
  }
}

import { GraphQLResponse } from '../abilities/CallGraphQL.js';

export interface DomainError {
  field?: string | null;
  message?: string | null;
  code?: string | null;
}

export function requireOperationPayload<T extends object>(
  operation: string,
  response: GraphQLResponse<unknown>,
  payload: T | null | undefined
): T {
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`${operation} failed with HTTP status ${response.status}`);
  }

  if (response.errors?.length) {
    throw new Error(`${operation} returned GraphQL errors: ${formatErrors(response.errors)}`);
  }

  if (!payload) {
    throw new Error(`${operation} returned no payload`);
  }

  const domainErrors = (payload as { errors?: DomainError[] }).errors;
  if (domainErrors?.length) {
    throw new Error(`${operation} returned domain errors: ${formatErrors(domainErrors)}`);
  }

  return payload;
}

function formatErrors(errors: DomainError[]): string {
  return errors
    .map((error) => {
      const location = error.field ? `${error.field}: ` : '';
      const code = error.code ? ` [${error.code}]` : '';
      return `${location}${error.message ?? 'Unknown error'}${code}`;
    })
    .join('; ');
}

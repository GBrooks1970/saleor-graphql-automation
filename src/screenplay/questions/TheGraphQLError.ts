import { Question } from '@serenity-js/core';
import { CallGraphQL, GraphQLError } from '../abilities/CallGraphQL.js';

export class TheGraphQLError {
  static last(): Question<Promise<GraphQLError | undefined>> {
    return Question.about('the last GraphQL error', async (actor) => {
      return CallGraphQL.as(actor).getLastError();
    });
  }

  static all(): Question<Promise<GraphQLError[]>> {
    return Question.about('all GraphQL errors', async (actor) => {
      return CallGraphQL.as(actor).getLastErrors();
    });
  }

  static message(): Question<Promise<string | undefined>> {
    return Question.about('the GraphQL error message', async (actor) => {
      const error = await actor.answer(TheGraphQLError.last());
      return error?.message;
    });
  }

  static code(): Question<Promise<string | undefined>> {
    return Question.about('the GraphQL error code', async (actor) => {
      const error = await actor.answer(TheGraphQLError.last());
      return (error?.extensions?.code as string) || undefined;
    });
  }
}

import { Question } from '@serenity-js/core';
import { CallGraphQL } from '../abilities/CallGraphQL.js';

export class LastOperationLatency {
  static inMilliseconds(): Question<Promise<number>> {
    return Question.about('last GraphQL operation latency in milliseconds', async (actor) => {
      return CallGraphQL.as(actor).getLastLatencyMs();
    });
  }
}

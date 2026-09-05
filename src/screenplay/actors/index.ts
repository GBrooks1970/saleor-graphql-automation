import { actorCalled, Actor, Cast } from '@serenity-js/core';
import { CallGraphQL } from '../abilities/CallGraphQL.js';

export class SaleorActors implements Cast {
  constructor(private readonly endpoint: string = process.env.SALEOR_GRAPHQL_URL || 'http://localhost:8000/graphql/') {}

  prepare(actor: Actor): Actor {
    return actor.whoCan(CallGraphQL.using(this.endpoint));
  }
}

export const getActor = (name: string, endpoint?: string): Actor => {
  const actor = actorCalled(name);
  if (!actor.abilityTo(CallGraphQL)) {
    actor.whoCan(CallGraphQL.using(endpoint || process.env.SALEOR_GRAPHQL_URL || 'http://localhost:8000/graphql/'));
  }
  return actor;
};

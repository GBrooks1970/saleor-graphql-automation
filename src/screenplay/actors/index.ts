import { actorCalled, Actor, Cast, Notepad, TakeNotes } from '@serenity-js/core';
import { CallGraphQL } from '../abilities/CallGraphQL.js';
import { CheckoutNotes } from '../checkout/CheckoutNotes.js';

export class SaleorActors implements Cast {
  constructor(private readonly endpoint: string = process.env.SALEOR_GRAPHQL_URL || 'http://localhost:8000/graphql/') {}

  prepare(actor: Actor): Actor {
    return actor.whoCan(
      CallGraphQL.using(this.endpoint),
      TakeNotes.using(Notepad.empty<CheckoutNotes>())
    );
  }
}

export const getActor = (name: string, endpoint?: string): Actor => {
  const actor = actorCalled(name);
  if (!actor.abilityTo(CallGraphQL)) {
    actor.whoCan(
      CallGraphQL.using(endpoint || process.env.SALEOR_GRAPHQL_URL || 'http://localhost:8000/graphql/'),
      TakeNotes.using(Notepad.empty<CheckoutNotes>())
    );
  }
  return actor;
};

import { actorCalled, Notepad, TakeNotes } from '@serenity-js/core';
import { CallGraphQL } from '../abilities/CallGraphQL.js';
import { type CheckoutNotes } from '../checkout/CheckoutNotes.js';

/** Replace actor state per scenario while sharing checkout notes within it. */
export function prepareScenarioActors(endpoint: string): void {
  const sharedCheckoutNotes = Notepad.empty<CheckoutNotes>();
  actorCalled('Guest').whoCan(CallGraphQL.using(endpoint));

  for (const name of ['Customer', 'Admin', 'Staff']) {
    actorCalled(name).whoCan(
      CallGraphQL.using(endpoint),
      TakeNotes.using(sharedCheckoutNotes)
    );
  }
}

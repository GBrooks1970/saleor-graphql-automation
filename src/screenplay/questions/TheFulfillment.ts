import { Question } from '@serenity-js/core';
import { FulfillmentRecord, requiredCheckoutNote } from '../checkout/CheckoutNotes.js';

export class TheFulfillment {
  static record(): Question<Promise<FulfillmentRecord>> {
    return Question.about('the latest fulfillment record', async (actor) => requiredCheckoutNote(actor, 'fulfillment'));
  }

  static latestStatus(): Question<Promise<string>> {
    return Question.about('the latest fulfillment status', async (actor) => requiredCheckoutNote(actor, 'fulfillment').status);
  }

  static count(): Question<Promise<number>> {
    return Question.about('the total count of order fulfillments', async (actor) => {
      const detail = requiredCheckoutNote(actor, 'orderDetail');
      return detail.fulfillments.length;
    });
  }
}

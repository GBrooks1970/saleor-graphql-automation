import { Question } from '@serenity-js/core';
import { CheckoutOrder, requiredCheckoutNote } from '../checkout/CheckoutNotes.js';

export class TheOrder {
  static placed(): Question<Promise<CheckoutOrder>> {
    return Question.about('the order placed from the checkout', async (actor) => requiredCheckoutNote(actor, 'order'));
  }

  static status(): Question<Promise<string>> {
    return Question.about('the placed order status', async (actor) => requiredCheckoutNote(actor, 'order').status);
  }

  static paymentStatus(): Question<Promise<string>> {
    return Question.about('the placed order payment status', async (actor) => requiredCheckoutNote(actor, 'order').paymentStatus);
  }

  static chargeStatus(): Question<Promise<string>> {
    return Question.about('the placed order charge status', async (actor) => requiredCheckoutNote(actor, 'order').chargeStatus);
  }
}

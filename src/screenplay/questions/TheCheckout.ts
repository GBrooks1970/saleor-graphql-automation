import { Question } from '@serenity-js/core';
import { CheckoutState, CheckoutVariant, MoneyAmount, requiredCheckoutNote } from '../checkout/CheckoutNotes.js';

export class TheCheckout {
  static selectedVariant(): Question<Promise<CheckoutVariant>> {
    return Question.about('the selected checkout variant', async (actor) => requiredCheckoutNote(actor, 'variant'));
  }

  static state(): Question<Promise<CheckoutState>> {
    return Question.about('the current checkout state', async (actor) => requiredCheckoutNote(actor, 'checkout'));
  }

  static total(): Question<Promise<MoneyAmount>> {
    return Question.about('the current checkout total', async (actor) => requiredCheckoutNote(actor, 'checkout').total);
  }
}

import { Question } from '@serenity-js/core';
import { CheckoutOrder, FulfillmentRecord, OrderDetail, OrderLineDetail, requiredCheckoutNote } from '../checkout/CheckoutNotes.js';

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

  static isPaid(): Question<Promise<boolean>> {
    return Question.about('whether the order is fully paid', async (actor) => {
      const detail = requiredCheckoutNote(actor, 'orderDetail');
      return detail.isPaid;
    });
  }

  static detail(): Question<Promise<OrderDetail>> {
    return Question.about('the detailed order state', async (actor) => requiredCheckoutNote(actor, 'orderDetail'));
  }

  static lines(): Question<Promise<OrderLineDetail[]>> {
    return Question.about('the order lines', async (actor) => {
      const detail = requiredCheckoutNote(actor, 'orderDetail');
      return detail.lines;
    });
  }

  static fulfillments(): Question<Promise<FulfillmentRecord[]>> {
    return Question.about('the order fulfillments', async (actor) => {
      const detail = requiredCheckoutNote(actor, 'orderDetail');
      return detail.fulfillments;
    });
  }
}

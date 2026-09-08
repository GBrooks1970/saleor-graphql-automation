import { Task } from '@serenity-js/core';
import { CallGraphQL } from '../abilities/CallGraphQL.js';
import { checkoutNotepadFor, requiredCheckoutNote } from '../checkout/CheckoutNotes.js';
import { DomainError, requireOperationPayload } from '../checkout/GraphQLOperation.js';
import { COMPLETE_CHECKOUT_MUTATION } from '../checkout/operations.js';

interface CompleteCheckoutData {
  checkoutComplete: {
    order?: {
      id: string;
      number: string;
      status: string;
      paymentStatus: string;
      chargeStatus: string;
      total: { gross: { amount: number; currency: string } };
    } | null;
    confirmationNeeded: boolean;
    errors: DomainError[];
  };
}

export class CompleteCheckout extends Task {
  static andPlaceOrder(): CompleteCheckout {
    return new CompleteCheckout();
  }

  constructor() {
    super('#actor completes the checkout and places the order');
  }

  async performAs(actor: any): Promise<void> {
    const checkout = requiredCheckoutNote(actor, 'checkout');
    requiredCheckoutNote(actor, 'transaction');

    const response = await CallGraphQL.as(actor).execute<CompleteCheckoutData>(COMPLETE_CHECKOUT_MUTATION, {
      id: checkout.id,
    });
    const payload = requireOperationPayload('CompleteCheckout', response, response.data?.checkoutComplete);

    if (payload.confirmationNeeded) {
      throw new Error('CompleteCheckout requires an unsupported additional confirmation step');
    }
    if (!payload.order) {
      throw new Error('CompleteCheckout returned no order');
    }

    checkoutNotepadFor(actor).set('order', {
      ...payload.order,
      total: payload.order.total.gross,
    });
  }
}

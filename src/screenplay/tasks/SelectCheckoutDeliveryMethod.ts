import { Task } from '@serenity-js/core';
import { CallGraphQL } from '../abilities/CallGraphQL.js';
import { checkoutNotepadFor, requiredCheckoutNote } from '../checkout/CheckoutNotes.js';
import { DomainError, requireOperationPayload } from '../checkout/GraphQLOperation.js';
import { UPDATE_CHECKOUT_DELIVERY_METHOD_MUTATION } from '../checkout/operations.js';

interface DeliveryMethodData {
  checkoutDeliveryMethodUpdate: {
    checkout?: {
      id: string;
      totalPrice: { gross: { amount: number; currency: string } };
    } | null;
    errors: DomainError[];
  };
}

export class SelectCheckoutDeliveryMethod extends Task {
  static firstAvailable(): SelectCheckoutDeliveryMethod {
    return new SelectCheckoutDeliveryMethod();
  }

  constructor() {
    super('#actor selects the first available checkout delivery method');
  }

  async performAs(actor: any): Promise<void> {
    const checkout = requiredCheckoutNote(actor, 'checkout');
    if (!checkout.shippingMethodId) {
      throw new Error('No checkout shipping method has been recorded');
    }

    const response = await CallGraphQL.as(actor).execute<DeliveryMethodData>(
      UPDATE_CHECKOUT_DELIVERY_METHOD_MUTATION,
      { id: checkout.id, deliveryMethodId: checkout.shippingMethodId }
    );
    const payload = requireOperationPayload(
      'UpdateCheckoutDeliveryMethod',
      response,
      response.data?.checkoutDeliveryMethodUpdate
    );

    if (!payload.checkout) {
      throw new Error('UpdateCheckoutDeliveryMethod returned no checkout');
    }

    checkoutNotepadFor(actor).set('checkout', {
      ...checkout,
      total: payload.checkout.totalPrice.gross,
    });
  }
}

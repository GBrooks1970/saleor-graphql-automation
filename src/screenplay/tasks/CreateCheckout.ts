import { randomUUID } from 'node:crypto';
import { Task } from '@serenity-js/core';
import { CallGraphQL } from '../abilities/CallGraphQL.js';
import { CheckoutState, checkoutNotepadFor, requiredCheckoutNote } from '../checkout/CheckoutNotes.js';
import { DomainError, requireOperationPayload } from '../checkout/GraphQLOperation.js';
import { CREATE_CHECKOUT_MUTATION } from '../checkout/operations.js';

interface CreateCheckoutData {
  checkoutCreate: {
    checkout?: {
      id: string;
      token: string;
      quantity: number;
      totalPrice: { gross: { amount: number; currency: string } };
    } | null;
    errors: DomainError[];
  };
}

export class CreateCheckout extends Task {
  static withSelectedVariant(channel: string, quantity: number = 1): CreateCheckout {
    return new CreateCheckout(channel, quantity);
  }

  constructor(
    private readonly channel: string,
    private readonly quantity: number
  ) {
    super(`#actor creates a checkout containing ${quantity} selected item(s)`);
  }

  async performAs(actor: any): Promise<void> {
    const variant = requiredCheckoutNote(actor, 'variant');
    const response = await CallGraphQL.as(actor).execute<CreateCheckoutData>(CREATE_CHECKOUT_MUTATION, {
      input: {
        channel: this.channel,
        email: `checkout+${randomUUID()}@example.test`,
        lines: [{ variantId: variant.id, quantity: this.quantity }],
      },
    });
    const payload = requireOperationPayload('CreateCheckout', response, response.data?.checkoutCreate);

    if (!payload.checkout) {
      throw new Error('CreateCheckout returned no checkout');
    }

    const checkout: CheckoutState = {
      id: payload.checkout.id,
      token: payload.checkout.token,
      quantity: payload.checkout.quantity,
      total: payload.checkout.totalPrice.gross,
    };
    checkoutNotepadFor(actor).set('checkout', checkout);
  }
}

import { Task } from '@serenity-js/core';
import { CallGraphQL } from '../abilities/CallGraphQL.js';
import { CheckoutAddressInput, requiredCheckoutNote } from '../checkout/CheckoutNotes.js';
import { DomainError, requireOperationPayload } from '../checkout/GraphQLOperation.js';
import { UPDATE_CHECKOUT_BILLING_ADDRESS_MUTATION } from '../checkout/operations.js';
import { DEFAULT_CHECKOUT_ADDRESS } from './SetCheckoutShippingAddress.js';

interface BillingAddressData {
  checkoutBillingAddressUpdate: {
    checkout?: { id: string } | null;
    errors: DomainError[];
  };
}

export class SetCheckoutBillingAddress extends Task {
  static to(address: CheckoutAddressInput = DEFAULT_CHECKOUT_ADDRESS): SetCheckoutBillingAddress {
    return new SetCheckoutBillingAddress(address);
  }

  constructor(private readonly address: CheckoutAddressInput) {
    super('#actor attaches a valid billing address to the checkout');
  }

  async performAs(actor: any): Promise<void> {
    const checkout = requiredCheckoutNote(actor, 'checkout');
    const response = await CallGraphQL.as(actor).execute<BillingAddressData>(
      UPDATE_CHECKOUT_BILLING_ADDRESS_MUTATION,
      { id: checkout.id, address: this.address }
    );
    const payload = requireOperationPayload(
      'UpdateCheckoutBillingAddress',
      response,
      response.data?.checkoutBillingAddressUpdate
    );

    if (!payload.checkout) {
      throw new Error('UpdateCheckoutBillingAddress returned no checkout');
    }
  }
}

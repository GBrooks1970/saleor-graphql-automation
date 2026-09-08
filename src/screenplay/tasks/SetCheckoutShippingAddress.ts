import { Task } from '@serenity-js/core';
import { CallGraphQL } from '../abilities/CallGraphQL.js';
import {
  CheckoutAddressInput,
  checkoutNotepadFor,
  requiredCheckoutNote,
} from '../checkout/CheckoutNotes.js';
import { DomainError, requireOperationPayload } from '../checkout/GraphQLOperation.js';
import { UPDATE_CHECKOUT_SHIPPING_ADDRESS_MUTATION } from '../checkout/operations.js';

interface ShippingAddressData {
  checkoutShippingAddressUpdate: {
    checkout?: {
      id: string;
      shippingMethods: Array<{ id: string; name: string }>;
    } | null;
    errors: DomainError[];
  };
}

export const DEFAULT_CHECKOUT_ADDRESS: CheckoutAddressInput = {
  firstName: 'Portfolio',
  lastName: 'Customer',
  streetAddress1: '1 Test Street',
  city: 'London',
  postalCode: 'SW1A 1AA',
  country: 'GB',
  countryArea: 'London',
  phone: '+442079460000',
};

export class SetCheckoutShippingAddress extends Task {
  static to(address: CheckoutAddressInput = DEFAULT_CHECKOUT_ADDRESS): SetCheckoutShippingAddress {
    return new SetCheckoutShippingAddress(address);
  }

  constructor(private readonly address: CheckoutAddressInput) {
    super('#actor attaches a valid shipping address to the checkout');
  }

  async performAs(actor: any): Promise<void> {
    const checkout = requiredCheckoutNote(actor, 'checkout');
    const response = await CallGraphQL.as(actor).execute<ShippingAddressData>(
      UPDATE_CHECKOUT_SHIPPING_ADDRESS_MUTATION,
      { id: checkout.id, address: this.address }
    );
    const payload = requireOperationPayload(
      'UpdateCheckoutShippingAddress',
      response,
      response.data?.checkoutShippingAddressUpdate
    );

    const shippingMethod = payload.checkout?.shippingMethods?.[0];
    if (!shippingMethod) {
      throw new Error('UpdateCheckoutShippingAddress returned no available shipping method');
    }

    checkoutNotepadFor(actor).set('checkout', {
      ...checkout,
      shippingMethodId: shippingMethod.id,
      shippingMethodName: shippingMethod.name,
    });
  }
}

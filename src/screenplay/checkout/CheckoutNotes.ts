import { Notepad, TakeNotes, UsesAbilities } from '@serenity-js/core';

export interface MoneyAmount {
  amount: number;
  currency: string;
}

export interface CheckoutVariant {
  id: string;
  name: string;
  productName: string;
  unitPrice: MoneyAmount;
}

export interface CheckoutState {
  id: string;
  token: string;
  quantity: number;
  total: MoneyAmount;
  shippingMethodId?: string;
  shippingMethodName?: string;
}

export interface CheckoutTransaction {
  id: string;
  pspReference: string;
  chargedAmount: MoneyAmount;
}

export interface CheckoutOrder {
  id: string;
  number: string;
  status: string;
  paymentStatus: string;
  chargeStatus: string;
  total: MoneyAmount;
}

export interface CheckoutNotes {
  variant?: CheckoutVariant;
  checkout?: CheckoutState;
  transaction?: CheckoutTransaction;
  order?: CheckoutOrder;
}

export interface CheckoutAddressInput {
  firstName: string;
  lastName: string;
  streetAddress1: string;
  city: string;
  postalCode: string;
  country: string;
  countryArea?: string;
  phone?: string;
}

export const checkoutNotepadFor = (actor: UsesAbilities): Notepad<CheckoutNotes> =>
  (TakeNotes.as(actor) as TakeNotes<CheckoutNotes>).notepad;

export function requiredCheckoutNote<K extends keyof CheckoutNotes>(
  actor: UsesAbilities,
  subject: K
): NonNullable<CheckoutNotes[K]> {
  const notepad = checkoutNotepadFor(actor);
  if (!notepad.has(subject)) {
    throw new Error(`Checkout note '${String(subject)}' has not been recorded`);
  }

  const value = notepad.get(subject);
  if (value === undefined) {
    throw new Error(`Checkout note '${String(subject)}' is undefined`);
  }

  return value as NonNullable<CheckoutNotes[K]>;
}

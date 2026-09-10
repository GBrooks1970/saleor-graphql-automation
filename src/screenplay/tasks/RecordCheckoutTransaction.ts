import { randomUUID } from 'node:crypto';
import { Task } from '@serenity-js/core';
import { CallGraphQL } from '../abilities/CallGraphQL.js';
import { checkoutNotepadFor, requiredCheckoutNote } from '../checkout/CheckoutNotes.js';
import { DomainError, requireOperationPayload } from '../checkout/GraphQLOperation.js';
import { CREATE_CHECKOUT_TRANSACTION_MUTATION } from '../checkout/operations.js';

interface TransactionData {
  transactionCreate: {
    transaction?: {
      id: string;
      pspReference: string;
      chargedAmount: { amount: number; currency: string };
    } | null;
    errors: DomainError[];
  };
}

export class RecordCheckoutTransaction extends Task {
  static asFullyCharged(): RecordCheckoutTransaction {
    return new RecordCheckoutTransaction();
  }

  constructor() {
    super('#actor records the checkout total as fully charged');
  }

  async performAs(actor: any): Promise<void> {
    const checkout = requiredCheckoutNote(actor, 'checkout');
    const pspReference = `portfolio-${randomUUID()}`;
    const response = await CallGraphQL.as(actor).execute<TransactionData>(CREATE_CHECKOUT_TRANSACTION_MUTATION, {
      id: checkout.id,
      transaction: {
        name: 'Portfolio checkout verification',
        pspReference,
        availableActions: [],
        amountCharged: checkout.total,
      },
    });
    const payload = requireOperationPayload('CreateCheckoutTransaction', response, response.data?.transactionCreate);

    if (!payload.transaction) {
      throw new Error('CreateCheckoutTransaction returned no transaction');
    }

    checkoutNotepadFor(actor).set('transaction', payload.transaction);
  }
}

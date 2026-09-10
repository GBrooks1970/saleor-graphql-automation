import { Task } from '@serenity-js/core';
import { CallGraphQL } from '../abilities/CallGraphQL.js';
import { CheckoutVariant, checkoutNotepadFor } from '../checkout/CheckoutNotes.js';
import { requireOperationPayload } from '../checkout/GraphQLOperation.js';
import { SELECT_CHECKOUT_VARIANT_QUERY } from '../checkout/operations.js';

interface VariantQueryData {
  products: {
    edges: Array<{
      node: {
        name: string;
        productVariants?: {
          edges: Array<{
            node: {
              id: string;
              name: string;
              quantityAvailable?: number | null;
              pricing?: {
                price?: {
                  gross: { amount: number; currency: string };
                } | null;
              } | null;
            };
          }>;
        } | null;
      };
    }>;
  };
}

export class SelectCheckoutVariant extends Task {
  static inChannel(channel: string): SelectCheckoutVariant {
    return new SelectCheckoutVariant(channel);
  }

  constructor(private readonly channel: string) {
    super(`#actor selects an available product variant in channel ${channel}`);
  }

  async performAs(actor: any): Promise<void> {
    const response = await CallGraphQL.as(actor).execute<VariantQueryData>(SELECT_CHECKOUT_VARIANT_QUERY, {
      first: 20,
      channel: this.channel,
    });
    const data = requireOperationPayload('SelectCheckoutVariant', response, response.data);

    const candidates: CheckoutVariant[] = data.products.edges.flatMap((product) =>
      (product.node.productVariants?.edges ?? [])
        .filter((edge) => {
          const amount = edge.node.pricing?.price?.gross.amount;
          return (edge.node.quantityAvailable === null || (edge.node.quantityAvailable ?? 0) > 0)
            && typeof amount === 'number'
            && amount > 0;
        })
        .map((edge) => ({
          id: edge.node.id,
          name: edge.node.name,
          productName: product.node.name,
          unitPrice: edge.node.pricing!.price!.gross,
        }))
    );

    if (!candidates.length) {
      throw new Error(`No purchasable product variant was found in channel '${this.channel}'`);
    }

    checkoutNotepadFor(actor).set('variant', candidates[0]);
  }
}

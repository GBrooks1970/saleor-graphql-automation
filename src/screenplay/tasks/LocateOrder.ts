import { Task } from '@serenity-js/core';
import { CallGraphQL } from '../abilities/CallGraphQL.js';
import { checkoutNotepadFor, requiredCheckoutNote, OrderDetail } from '../checkout/CheckoutNotes.js';
import { requireOperationPayload } from '../checkout/GraphQLOperation.js';
import { GET_ORDER_DETAILS_QUERY } from '../checkout/operations.js';

interface GetOrderDetailsData {
  order?: {
    id: string;
    number: string;
    status: string;
    paymentStatus: string;
    chargeStatus: string;
    isPaid: boolean;
    total: { gross: { amount: number; currency: string } };
    lines: Array<{
      id: string;
      productName: string;
      variantName: string;
      quantity: number;
      quantityFulfilled: number;
      variant?: {
        id: string;
        stocks?: Array<{
          id: string;
          quantity: number;
          quantityAllocated: number;
          warehouse: {
            id: string;
            name: string;
          };
        }>;
      } | null;
    }>;
    fulfillments: Array<{
      id: string;
      status: string;
      lines?: Array<{
        id: string;
        quantity: number;
        orderLine?: {
          id: string;
          productName: string;
        } | null;
      }>;
    }>;
  } | null;
}

export class LocateOrder extends Task {
  static fromPlacedOrder(): LocateOrder {
    return new LocateOrder();
  }

  static byId(orderId: string): LocateOrder {
    return new LocateOrder(orderId);
  }

  constructor(private readonly explicitOrderId?: string) {
    super('#actor locates the confirmed order details');
  }

  async performAs(actor: any): Promise<void> {
    const orderId = this.explicitOrderId ?? requiredCheckoutNote(actor, 'order').id;

    const response = await CallGraphQL.as(actor).execute<GetOrderDetailsData>(GET_ORDER_DETAILS_QUERY, {
      id: orderId,
    });
    const order = requireOperationPayload('LocateOrder', response, response.data?.order);

    const orderDetail: OrderDetail = {
      id: order.id,
      number: order.number,
      status: order.status,
      paymentStatus: order.paymentStatus,
      chargeStatus: order.chargeStatus,
      isPaid: order.isPaid,
      total: order.total.gross,
      lines: order.lines,
      fulfillments: order.fulfillments,
    };

    checkoutNotepadFor(actor).set('orderDetail', orderDetail);
    checkoutNotepadFor(actor).set('order', {
      id: order.id,
      number: order.number,
      status: order.status,
      paymentStatus: order.paymentStatus,
      chargeStatus: order.chargeStatus,
      total: order.total.gross,
    });
  }
}

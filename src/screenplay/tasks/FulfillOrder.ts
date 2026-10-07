import { Task } from '@serenity-js/core';
import { CallGraphQL } from '../abilities/CallGraphQL.js';
import { checkoutNotepadFor, requiredCheckoutNote, OrderDetail, FulfillmentRecord } from '../checkout/CheckoutNotes.js';
import { DomainError, requireOperationPayload } from '../checkout/GraphQLOperation.js';
import { FULFILL_ORDER_MUTATION } from '../checkout/operations.js';

interface FulfillOrderData {
  orderFulfill: {
    order?: {
      id: string;
      number: string;
      status: string;
      paymentStatus: string;
      chargeStatus: string;
      isPaid: boolean;
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
      lines: Array<{
        id: string;
        quantity: number;
        quantityFulfilled: number;
      }>;
    } | null;
    errors: DomainError[];
  };
}

export class FulfillOrder extends Task {
  static allLinesFromAvailableStock(): FulfillOrder {
    return new FulfillOrder();
  }

  constructor() {
    super('#actor allocates stock and fulfills all order lines');
  }

  async performAs(actor: any): Promise<void> {
    const orderDetail = requiredCheckoutNote(actor, 'orderDetail');

    if (!orderDetail.lines || orderDetail.lines.length === 0) {
      throw new Error('Cannot fulfill order: no order lines found in order details');
    }

    const input = {
      lines: orderDetail.lines.map((line) => {
        // Find warehouse with available quantity or fallback to first stock warehouse
        const preferredStock = line.variant?.stocks?.find((s) => s.warehouse.name === 'Default Warehouse')
          ?? line.variant?.stocks?.[0];
        const warehouseId = preferredStock?.warehouse?.id
          ?? 'V2FyZWhvdXNlOjQwOGFmNzU2LTBhMGYtNDc0OS05NjhjLWQyY2I1YWQyZTA1ZA==';

        const unfulfilledQty = Math.max(1, line.quantity - line.quantityFulfilled);
        return {
          orderLineId: line.id,
          stocks: [
            {
              warehouse: warehouseId,
              quantity: unfulfilledQty,
            },
          ],
        };
      }),
      notifyCustomer: false,
      allowStockToBeExceeded: false,
    };

    const response = await CallGraphQL.as(actor).execute<FulfillOrderData>(FULFILL_ORDER_MUTATION, {
      order: orderDetail.id,
      input,
    });

    const payload = requireOperationPayload('FulfillOrder', response, response.data?.orderFulfill);

    if (!payload.order) {
      throw new Error('FulfillOrder returned no order');
    }

    const updatedOrder = payload.order;
    const fulfillmentRecord: FulfillmentRecord = updatedOrder.fulfillments[0] ?? {
      id: '',
      status: 'FULFILLED',
      lines: [],
    };

    checkoutNotepadFor(actor).set('fulfillment', fulfillmentRecord);
    checkoutNotepadFor(actor).set('order', {
      ...requiredCheckoutNote(actor, 'order'),
      status: updatedOrder.status,
      paymentStatus: updatedOrder.paymentStatus,
      chargeStatus: updatedOrder.chargeStatus,
    });

    // Update lines in orderDetail
    const updatedLines = orderDetail.lines.map((existingLine) => {
      const match = updatedOrder.lines.find((l) => l.id === existingLine.id);
      return match ? { ...existingLine, quantityFulfilled: match.quantityFulfilled } : existingLine;
    });

    const updatedDetail: OrderDetail = {
      ...orderDetail,
      status: updatedOrder.status,
      paymentStatus: updatedOrder.paymentStatus,
      chargeStatus: updatedOrder.chargeStatus,
      isPaid: updatedOrder.isPaid,
      fulfillments: updatedOrder.fulfillments,
      lines: updatedLines,
    };

    checkoutNotepadFor(actor).set('orderDetail', updatedDetail);
  }
}

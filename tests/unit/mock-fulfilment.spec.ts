import { after, before, describe, it } from 'node:test';
import assert from 'node:assert';
import { startMockServer } from '../../src/mock/server.js';
import {
  COMPLETE_CHECKOUT_MUTATION,
  CREATE_CHECKOUT_MUTATION,
  CREATE_CHECKOUT_TRANSACTION_MUTATION,
  FULFILL_ORDER_MUTATION,
  GET_ORDER_DETAILS_QUERY,
  UPDATE_CHECKOUT_BILLING_ADDRESS_MUTATION,
  UPDATE_CHECKOUT_DELIVERY_METHOD_MUTATION,
  UPDATE_CHECKOUT_SHIPPING_ADDRESS_MUTATION,
} from '../../src/screenplay/checkout/operations.js';

describe('Staff order fulfilment mock (FR-5)', () => {
  let server: Awaited<ReturnType<typeof startMockServer>>;

  before(async () => {
    server = await startMockServer(0);
  });

  after(async () => {
    await server.close();
  });

  const execute = async (query: string, variables: Record<string, unknown>, token?: string) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(server.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    });
    return response.json() as Promise<any>;
  };

  const seedConfirmedOrder = async (): Promise<{ orderId: string; orderNumber: string; lineId: string; warehouseId: string }> => {
    // 1. Create checkout
    const created = await execute(CREATE_CHECKOUT_MUTATION, {
      input: {
        channel: 'default-channel',
        email: 'fulfilment-customer@example.test',
        lines: [{ variantId: 'UHJvZHVjdFZhcmlhbnQ6Mzg0', quantity: 1 }],
      },
    });
    const checkoutId = created.data.checkoutCreate.checkout.id;

    // 2. Shipping & Billing
    await execute(UPDATE_CHECKOUT_SHIPPING_ADDRESS_MUTATION, {
      id: checkoutId,
      address: {
        firstName: 'Gary',
        lastName: 'Brooks',
        streetAddress1: '10 Downing St',
        city: 'London',
        postalCode: 'SW1A 2AA',
        country: 'GB',
      },
    });
    await execute(UPDATE_CHECKOUT_BILLING_ADDRESS_MUTATION, {
      id: checkoutId,
      address: {
        firstName: 'Gary',
        lastName: 'Brooks',
        streetAddress1: '10 Downing St',
        city: 'London',
        postalCode: 'SW1A 2AA',
        country: 'GB',
      },
    });

    // 3. Delivery method
    await execute(UPDATE_CHECKOUT_DELIVERY_METHOD_MUTATION, {
      id: checkoutId,
      deliveryMethodId: 'U2hpcHBpbmdNZXRob2Q6Mw==',
    });

    // 4. Transaction (Admin staff token)
    await execute(
      CREATE_CHECKOUT_TRANSACTION_MUTATION,
      {
        id: checkoutId,
        transaction: {
          name: 'Manual Payment',
          pspReference: 'psp-mock-ref-1',
          availableActions: ['CHARGE'],
          amountCharged: { amount: 29.18, currency: 'USD' },
        },
      },
      'mock-jwt-token-admin-ey99999'
    );

    // 5. Complete checkout
    const completed = await execute(COMPLETE_CHECKOUT_MUTATION, { id: checkoutId });
    const order = completed.data.checkoutComplete.order;

    const details = await execute(
      GET_ORDER_DETAILS_QUERY,
      { id: order.id },
      'mock-jwt-token-admin-ey99999'
    );
    const orderDetails = details.data.order;

    const lineId = orderDetails.lines[0].id;
    const warehouseId = orderDetails.lines[0].variant.stocks[0].warehouse.id;

    return {
      orderId: order.id,
      orderNumber: order.number,
      lineId,
      warehouseId,
    };
  };

  it('queries confirmed order details with lines and stock info', async () => {
    const { orderId } = await seedConfirmedOrder();

    const result = await execute(
      GET_ORDER_DETAILS_QUERY,
      { id: orderId },
      'mock-jwt-token-admin-ey99999'
    );

    assert.ok(result.data.order, 'Expected order details to be returned');
    assert.strictEqual(result.data.order.status, 'UNFULFILLED');
    assert.strictEqual(result.data.order.isPaid, true);
    assert.strictEqual(result.data.order.paymentStatus, 'FULLY_CHARGED');
    assert.strictEqual(result.data.order.lines.length, 1);
    assert.strictEqual(result.data.order.lines[0].quantity, 1);
    assert.strictEqual(result.data.order.lines[0].quantityFulfilled, 0);
  });

  it('allows authenticated staff to fulfill an order and transition status to FULFILLED', async () => {
    const { orderId, lineId, warehouseId } = await seedConfirmedOrder();

    const fulfillResult = await execute(
      FULFILL_ORDER_MUTATION,
      {
        order: orderId,
        input: {
          lines: [
            {
              orderLineId: lineId,
              stocks: [{ warehouse: warehouseId, quantity: 1 }],
            },
          ],
          notifyCustomer: false,
        },
      },
      'mock-jwt-token-admin-ey99999'
    );

    assert.strictEqual(fulfillResult.data.orderFulfill.errors.length, 0);
    const updatedOrder = fulfillResult.data.orderFulfill.order;
    assert.strictEqual(updatedOrder.status, 'FULFILLED');
    assert.strictEqual(updatedOrder.fulfillments.length, 1);
    assert.strictEqual(updatedOrder.fulfillments[0].status, 'FULFILLED');
    assert.strictEqual(updatedOrder.lines[0].quantityFulfilled, 1);
  });

  it('rejects order fulfilment when actor is unauthenticated or not staff', async () => {
    const { orderId, lineId, warehouseId } = await seedConfirmedOrder();

    const unauthResult = await execute(
      FULFILL_ORDER_MUTATION,
      {
        order: orderId,
        input: {
          lines: [{ orderLineId: lineId, stocks: [{ warehouse: warehouseId, quantity: 1 }] }],
        },
      }
      // No token provided
    );

    assert.strictEqual(unauthResult.data.orderFulfill.order, null);
    assert.strictEqual(unauthResult.data.orderFulfill.errors.length, 1);
    assert.strictEqual(unauthResult.data.orderFulfill.errors[0].code, 'REQUIRED');
  });

  it('returns error when fulfilling an order that does not exist', async () => {
    const nonExistentOrderId = 'T3JkZXI6bm9uLWV4aXN0ZW50';

    const result = await execute(
      FULFILL_ORDER_MUTATION,
      {
        order: nonExistentOrderId,
        input: {
          lines: [{ orderLineId: 'line-1', stocks: [{ warehouse: 'wh-1', quantity: 1 }] }],
        },
      },
      'mock-jwt-token-admin-ey99999'
    );

    assert.strictEqual(result.data.orderFulfill.order, null);
    assert.strictEqual(result.data.orderFulfill.errors[0].code, 'NOT_FOUND');
  });
});

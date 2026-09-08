import { randomUUID } from 'node:crypto';
import http from 'node:http';
import { buildSchema, graphql } from 'graphql';

const MOCK_SCHEMA_SDL = `
  type Query {
    shop: Shop!
    products(first: Int, channel: String!, after: String): ProductCountableConnection!
    me: User
  }

  type Mutation {
    tokenCreate(email: String!, password: String!): TokenCreatePayload!
    tokenRefresh(refreshToken: String!): TokenRefreshPayload!
    checkoutCreate(input: CheckoutCreateInput!): CheckoutCreate!
    checkoutShippingAddressUpdate(
      id: ID!
      shippingAddress: AddressInput!
      saveAddress: Boolean = true
    ): CheckoutShippingAddressUpdate!
    checkoutBillingAddressUpdate(
      id: ID!
      billingAddress: AddressInput!
      saveAddress: Boolean = true
    ): CheckoutBillingAddressUpdate!
    checkoutDeliveryMethodUpdate(id: ID!, deliveryMethodId: ID!): CheckoutDeliveryMethodUpdate!
    transactionCreate(id: ID!, transaction: TransactionCreateInput!): TransactionCreate!
    checkoutComplete(id: ID!): CheckoutComplete!
  }

  input CheckoutCreateInput {
    channel: String
    lines: [CheckoutLineInput!]!
    email: String
  }

  input CheckoutLineInput {
    quantity: Int!
    variantId: ID!
  }

  input AddressInput {
    firstName: String
    lastName: String
    streetAddress1: String
    city: String
    postalCode: String
    country: String
    countryArea: String
    phone: String
  }

  input MoneyInput {
    amount: Float!
    currency: String!
  }

  input TransactionCreateInput {
    name: String
    pspReference: String
    availableActions: [String!]
    amountCharged: MoneyInput
  }

  type Shop {
    name: String!
    description: String
    defaultCountry: CountryDisplay
  }

  type CountryDisplay {
    code: String!
    country: String!
  }

  type ProductCountableConnection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [ProductCountableEdge!]!
  }

  type ProductVariantCountableConnection {
    edges: [ProductVariantCountableEdge!]!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  type ProductCountableEdge {
    cursor: String!
    node: Product!
  }

  type ProductVariantCountableEdge {
    cursor: String!
    node: ProductVariant!
  }

  type Product {
    id: ID!
    name: String!
    slug: String!
    pricing: ProductPricingInfo
    category: Category
    productVariants(first: Int): ProductVariantCountableConnection!
  }

  type ProductVariant {
    id: ID!
    name: String!
    quantityAvailable: Int
    pricing: VariantPricingInfo
  }

  type ProductPricingInfo {
    priceRange: TaxedMoneyRange
  }

  type VariantPricingInfo {
    price: TaxedMoney
  }

  type TaxedMoneyRange {
    start: TaxedMoney
    stop: TaxedMoney
  }

  type TaxedMoney {
    gross: Money!
    net: Money!
  }

  type Money {
    amount: Float!
    currency: String!
  }

  type Category {
    id: ID!
    name: String!
  }

  type User {
    id: ID!
    email: String!
    isStaff: Boolean!
  }

  type Address {
    firstName: String
    lastName: String
    streetAddress1: String
    city: String
    postalCode: String
    country: CountryDisplay!
    countryArea: String
    phone: String
  }

  type ShippingMethod {
    id: ID!
    name: String!
    price: Money!
  }

  type Checkout {
    id: ID!
    token: String!
    quantity: Int!
    email: String
    shippingAddress: Address
    billingAddress: Address
    shippingMethods: [ShippingMethod!]!
    totalPrice: TaxedMoney!
  }

  type TransactionItem {
    id: ID!
    pspReference: String!
    chargedAmount: Money!
  }

  type Order {
    id: ID!
    number: String!
    status: String!
    paymentStatus: String!
    chargeStatus: String!
    total: TaxedMoney!
  }

  type AccountError {
    field: String
    message: String!
    code: String
  }

  type CheckoutError {
    field: String
    message: String!
    code: String
  }

  type TransactionCreateError {
    field: String
    message: String!
    code: String
  }

  type TokenCreatePayload {
    token: String
    refreshToken: String
    csrfToken: String
    user: User
    errors: [AccountError!]!
  }

  type TokenRefreshPayload {
    token: String
    errors: [AccountError!]!
  }

  type CheckoutCreate {
    checkout: Checkout
    errors: [CheckoutError!]!
  }

  type CheckoutShippingAddressUpdate {
    checkout: Checkout
    errors: [CheckoutError!]!
  }

  type CheckoutBillingAddressUpdate {
    checkout: Checkout
    errors: [CheckoutError!]!
  }

  type CheckoutDeliveryMethodUpdate {
    checkout: Checkout
    errors: [CheckoutError!]!
  }

  type TransactionCreate {
    transaction: TransactionItem
    errors: [TransactionCreateError!]!
  }

  type CheckoutComplete {
    order: Order
    confirmationNeeded: Boolean!
    errors: [CheckoutError!]!
  }
`;

const schema = buildSchema(MOCK_SCHEMA_SDL);

interface MockMoney {
  amount: number;
  currency: string;
}

interface MockAddressInput {
  firstName?: string;
  lastName?: string;
  streetAddress1?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  countryArea?: string;
  phone?: string;
}

interface MockShippingMethod {
  id: string;
  name: string;
  price: MockMoney;
}

interface MockCheckout {
  id: string;
  token: string;
  quantity: number;
  email?: string;
  shippingAddress?: ReturnType<typeof outputAddress>;
  billingAddress?: ReturnType<typeof outputAddress>;
  shippingMethods: MockShippingMethod[];
  selectedDeliveryMethodId?: string;
  totalPrice: ReturnType<typeof taxedMoney>;
  transaction?: {
    id: string;
    pspReference: string;
    chargedAmount: MockMoney;
  };
}

interface MockState {
  checkouts: Map<string, MockCheckout>;
  nextOrderNumber: number;
}

interface MockRequestContext {
  state: MockState;
  authUser?: { id: string; email: string; isStaff: boolean };
}

const money = (amount: number, currency: string = 'USD'): MockMoney => ({ amount, currency });
const taxedMoney = (amount: number, currency: string = 'USD') => ({
  gross: money(amount, currency),
  net: money(amount, currency),
});

const MOCK_SHIPPING_METHODS: MockShippingMethod[] = [
  { id: 'U2hpcHBpbmdNZXRob2Q6Mw==', name: 'UPS', price: money(27.19) },
];

const variant = (id: string, name: string, amount: number) => ({
  id,
  name,
  quantityAvailable: 100,
  pricing: { price: taxedMoney(amount) },
});

const MOCK_PRODUCTS = [
  {
    id: 'UHJvZHVjdDox',
    name: 'Apple Juice',
    slug: 'apple-juice',
    pricing: {
      priceRange: {
        start: taxedMoney(2.5),
        stop: taxedMoney(2.5),
      },
    },
    category: { id: 'Q2F0ZWdvcnk6MQ==', name: 'Juices' },
    productVariants: {
      edges: [
        {
          cursor: 'UHJvZHVjdFZhcmlhbnQ6Mzg0',
          node: variant('UHJvZHVjdFZhcmlhbnQ6Mzg0', '500 ml', 1.99),
        },
      ],
    },
  },
  {
    id: 'UHJvZHVjdDoy',
    name: 'Monospace Tee',
    slug: 'monospace-tee',
    pricing: {
      priceRange: {
        start: taxedMoney(18),
        stop: taxedMoney(18),
      },
    },
    category: { id: 'Q2F0ZWdvcnk6Mg==', name: 'Apparel' },
    productVariants: {
      edges: [
        {
          cursor: 'UHJvZHVjdFZhcmlhbnQ6Mzg1',
          node: variant('UHJvZHVjdFZhcmlhbnQ6Mzg1', 'Medium', 18),
        },
      ],
    },
  },
  {
    id: 'UHJvZHVjdDoz',
    name: "Paul's Box",
    slug: 'pauls-box',
    pricing: {
      priceRange: {
        start: taxedMoney(45),
        stop: taxedMoney(45),
      },
    },
    category: { id: 'Q2F0ZWdvcnk6Mw==', name: 'Accessories' },
    productVariants: {
      edges: [
        {
          cursor: 'UHJvZHVjdFZhcmlhbnQ6Mzg2',
          node: variant('UHJvZHVjdFZhcmlhbnQ6Mzg2', 'Default', 45),
        },
      ],
    },
  },
];

function outputAddress(input: MockAddressInput) {
  const countryCode = input.country ?? 'GB';
  return {
    ...input,
    country: {
      code: countryCode,
      country: countryCode === 'GB' ? 'United Kingdom' : countryCode,
    },
  };
}

function checkoutError(field: string | null, message: string, code: string) {
  return { field, message, code };
}

export function createRootValue(context: MockRequestContext) {
  return {
    shop: () => ({
      name: 'Saleor e-commerce',
      description: 'Modern Headless E-commerce Demo',
      defaultCountry: { code: 'US', country: 'United States' },
    }),

    products: ({ first = 10, after }: { first?: number; channel: string; after?: string }) => {
      let startIndex = 0;
      if (after) {
        const found = MOCK_PRODUCTS.findIndex((product) => product.id === after);
        if (found >= 0) {
          startIndex = found + 1;
        }
      }

      const sliced = MOCK_PRODUCTS.slice(startIndex, startIndex + first);
      const edges = sliced.map((product) => ({ cursor: product.id, node: product }));
      return {
        totalCount: MOCK_PRODUCTS.length,
        pageInfo: {
          hasNextPage: startIndex + first < MOCK_PRODUCTS.length,
          hasPreviousPage: startIndex > 0,
          startCursor: edges[0]?.cursor || null,
          endCursor: edges[edges.length - 1]?.cursor || null,
        },
        edges,
      };
    },

    me: () => context.authUser || null,

    tokenCreate: ({ email, password }: { email: string; password: string }) => {
      if (email === 'customer@example.com' && password === 'validPass123') {
        const user = { id: 'usr-101', email, isStaff: false };
        return {
          token: 'mock-jwt-token-ey1234567890',
          refreshToken: 'mock-refresh-token-ref987654321',
          csrfToken: 'mock-csrf-token-xyz',
          user,
          errors: [],
        };
      }

      if (email === 'admin@example.com' && password === 'admin') {
        const user = { id: 'usr-admin-1', email, isStaff: true };
        return {
          token: 'mock-jwt-token-admin-ey99999',
          refreshToken: 'mock-refresh-token-admin-8888',
          csrfToken: 'mock-csrf-token-admin',
          user,
          errors: [],
        };
      }

      return {
        token: null,
        refreshToken: null,
        csrfToken: null,
        user: null,
        errors: [checkoutError('password', 'Invalid credentials', 'INVALID_CREDENTIALS')],
      };
    },

    tokenRefresh: ({ refreshToken }: { refreshToken: string }) => {
      if (refreshToken?.startsWith('mock-refresh-token')) {
        return { token: 'mock-jwt-token-refreshed-ey112233', errors: [] };
      }
      return {
        token: null,
        errors: [checkoutError('refreshToken', 'Invalid refresh token', 'JWT_INVALID_TOKEN')],
      };
    },

    checkoutCreate: ({
      input,
    }: {
      input: { channel?: string; email?: string; lines: Array<{ variantId: string; quantity: number }> };
    }) => {
      const line = input.lines[0];
      const selected = MOCK_PRODUCTS.flatMap((product) => product.productVariants.edges)
        .find((edge) => edge.node.id === line?.variantId)?.node;
      if (!line || !selected || line.quantity < 1) {
        return {
          checkout: null,
          errors: [checkoutError('lines', 'A purchasable checkout line is required', 'INVALID')],
        };
      }

      const checkout: MockCheckout = {
        id: `Q2hlY2tvdXQ6${randomUUID()}`,
        token: randomUUID(),
        quantity: line.quantity,
        email: input.email,
        shippingMethods: [],
        totalPrice: taxedMoney(selected.pricing.price.gross.amount * line.quantity),
      };
      context.state.checkouts.set(checkout.id, checkout);
      return { checkout, errors: [] };
    },

    checkoutShippingAddressUpdate: ({
      id,
      shippingAddress,
    }: {
      id: string;
      shippingAddress: MockAddressInput;
    }) => {
      const checkout = context.state.checkouts.get(id);
      if (!checkout) {
        return { checkout: null, errors: [checkoutError('id', 'Checkout was not found', 'NOT_FOUND')] };
      }
      checkout.shippingAddress = outputAddress(shippingAddress);
      checkout.shippingMethods = MOCK_SHIPPING_METHODS;
      return { checkout, errors: [] };
    },

    checkoutBillingAddressUpdate: ({
      id,
      billingAddress,
    }: {
      id: string;
      billingAddress: MockAddressInput;
    }) => {
      const checkout = context.state.checkouts.get(id);
      if (!checkout) {
        return { checkout: null, errors: [checkoutError('id', 'Checkout was not found', 'NOT_FOUND')] };
      }
      checkout.billingAddress = outputAddress(billingAddress);
      return { checkout, errors: [] };
    },

    checkoutDeliveryMethodUpdate: ({ id, deliveryMethodId }: { id: string; deliveryMethodId: string }) => {
      const checkout = context.state.checkouts.get(id);
      if (!checkout) {
        return { checkout: null, errors: [checkoutError('id', 'Checkout was not found', 'NOT_FOUND')] };
      }
      const method = checkout.shippingMethods.find((candidate) => candidate.id === deliveryMethodId);
      if (!method) {
        return {
          checkout: null,
          errors: [checkoutError('deliveryMethodId', 'Delivery method is unavailable', 'SHIPPING_METHOD_NOT_APPLICABLE')],
        };
      }
      checkout.selectedDeliveryMethodId = method.id;
      checkout.totalPrice = taxedMoney(checkout.totalPrice.gross.amount + method.price.amount);
      return { checkout, errors: [] };
    },

    transactionCreate: ({
      id,
      transaction,
    }: {
      id: string;
      transaction: { pspReference?: string; amountCharged?: MockMoney };
    }) => {
      if (!context.authUser?.isStaff) {
        return {
          transaction: null,
          errors: [checkoutError(null, 'Staff authentication is required', 'GRAPHQL_ERROR')],
        };
      }
      const checkout = context.state.checkouts.get(id);
      if (!checkout) {
        return { transaction: null, errors: [checkoutError('id', 'Checkout was not found', 'NOT_FOUND')] };
      }
      const charged = transaction.amountCharged;
      if (!charged || charged.currency !== checkout.totalPrice.gross.currency || charged.amount !== checkout.totalPrice.gross.amount) {
        return {
          transaction: null,
          errors: [checkoutError('amountCharged', 'Charged amount must equal the checkout total', 'INCORRECT_CURRENCY')],
        };
      }
      checkout.transaction = {
        id: `VHJhbnNhY3Rpb25JdGVtOj${randomUUID()}`,
        pspReference: transaction.pspReference ?? `mock-${randomUUID()}`,
        chargedAmount: charged,
      };
      return { transaction: checkout.transaction, errors: [] };
    },

    checkoutComplete: ({ id }: { id: string }) => {
      const checkout = context.state.checkouts.get(id);
      if (!checkout) {
        return {
          order: null,
          confirmationNeeded: false,
          errors: [checkoutError('id', 'Checkout was not found', 'NOT_FOUND')],
        };
      }
      if (!checkout.shippingAddress) {
        return {
          order: null,
          confirmationNeeded: false,
          errors: [checkoutError('shippingAddress', 'Shipping address is required', 'SHIPPING_ADDRESS_NOT_SET')],
        };
      }
      if (!checkout.billingAddress) {
        return {
          order: null,
          confirmationNeeded: false,
          errors: [checkoutError('billingAddress', 'Billing address is required', 'BILLING_ADDRESS_NOT_SET')],
        };
      }
      if (!checkout.selectedDeliveryMethodId) {
        return {
          order: null,
          confirmationNeeded: false,
          errors: [checkoutError('deliveryMethod', 'Delivery method is required', 'SHIPPING_METHOD_NOT_SET')],
        };
      }
      if (!checkout.transaction) {
        return {
          order: null,
          confirmationNeeded: false,
          errors: [checkoutError('transaction', 'Checkout total has not been charged', 'CHECKOUT_NOT_FULLY_PAID')],
        };
      }

      const orderNumber = String(context.state.nextOrderNumber++);
      const order = {
        id: `T3JkZXI6${randomUUID()}`,
        number: orderNumber,
        status: 'UNFULFILLED',
        paymentStatus: 'FULLY_CHARGED',
        chargeStatus: 'FULL',
        total: checkout.totalPrice,
      };
      return { order, confirmationNeeded: false, errors: [] };
    },
  };
}

export function startMockServer(port: number = 0): Promise<{ url: string; close: () => Promise<void> }> {
  return new Promise((resolve) => {
    const state: MockState = {
      checkouts: new Map(),
      nextOrderNumber: 21,
    };

    const server = http.createServer(async (req, res) => {
      if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ errors: [{ message: 'Method Not Allowed' }] }));
        return;
      }

      let authUser: MockRequestContext['authUser'];
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer mock-jwt-token')) {
        authUser = authHeader.includes('admin')
          ? { id: 'usr-admin-1', email: 'admin@example.com', isStaff: true }
          : { id: 'usr-101', email: 'customer@example.com', isStaff: false };
      }

      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });

      req.on('end', async () => {
        try {
          const parsed = JSON.parse(body);
          const result = await graphql({
            schema,
            source: parsed.query,
            variableValues: parsed.variables,
            rootValue: createRootValue({ state, authUser }),
          });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (error: any) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ errors: [{ message: error.message || 'Bad Request' }] }));
        }
      });
    });

    server.listen(port, '127.0.0.1', () => {
      const address = server.address() as { port: number };
      const url = `http://127.0.0.1:${address.port}/graphql/`;
      resolve({
        url,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
}

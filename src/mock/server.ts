import http from 'node:http';
import { graphql, buildSchema } from 'graphql';

const MOCK_SCHEMA_SDL = `
  type Query {
    shop: Shop!
    products(first: Int, channel: String!, after: String): ProductCountableConnection!
    me: User
  }

  type Mutation {
    tokenCreate(email: String!, password: String!): TokenCreatePayload!
    tokenRefresh(refreshToken: String!): TokenRefreshPayload!
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

  type Product {
    id: ID!
    name: String!
    slug: String!
    pricing: ProductPricingInfo
    category: Category
  }

  type ProductPricingInfo {
    priceRange: TaxedMoneyRange
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

  type AccountError {
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
`;

const schema = buildSchema(MOCK_SCHEMA_SDL);

const MOCK_PRODUCTS = [
  {
    id: 'UHJvZHVjdDox',
    name: 'Apple Juice',
    slug: 'apple-juice',
    pricing: {
      priceRange: {
        start: { gross: { amount: 2.5, currency: 'USD' }, net: { amount: 2.5, currency: 'USD' } },
        stop: { gross: { amount: 2.5, currency: 'USD' }, net: { amount: 2.5, currency: 'USD' } },
      },
    },
    category: { id: 'Q2F0ZWdvcnk6MQ==', name: 'Juices' },
  },
  {
    id: 'UHJvZHVjdDoy',
    name: 'Monospace Tee',
    slug: 'monospace-tee',
    pricing: {
      priceRange: {
        start: { gross: { amount: 18.0, currency: 'USD' }, net: { amount: 18.0, currency: 'USD' } },
        stop: { gross: { amount: 18.0, currency: 'USD' }, net: { amount: 18.0, currency: 'USD' } },
      },
    },
    category: { id: 'Q2F0ZWdvcnk6Mg==', name: 'Apparel' },
  },
  {
    id: 'UHJvZHVjdDoz',
    name: "Paul's Box",
    slug: 'pauls-box',
    pricing: {
      priceRange: {
        start: { gross: { amount: 45.0, currency: 'USD' }, net: { amount: 45.0, currency: 'USD' } },
        stop: { gross: { amount: 45.0, currency: 'USD' }, net: { amount: 45.0, currency: 'USD' } },
      },
    },
    category: { id: 'Q2F0ZWdvcnk6Mw==', name: 'Accessories' },
  },
];

export function createRootValue(context: { authUser?: { id: string; email: string; isStaff: boolean } }) {
  return {
    shop: () => ({
      name: 'Saleor e-commerce',
      description: 'Modern Headless E-commerce Demo',
      defaultCountry: { code: 'US', country: 'United States' },
    }),

    products: ({ first = 10, channel, after }: { first?: number; channel: string; after?: string }) => {
      let startIndex = 0;
      if (after) {
        const found = MOCK_PRODUCTS.findIndex((p) => p.id === after);
        if (found >= 0) {
          startIndex = found + 1;
        }
      }

      const sliced = MOCK_PRODUCTS.slice(startIndex, startIndex + first);
      const edges = sliced.map((p) => ({ cursor: p.id, node: p }));
      const hasNext = startIndex + first < MOCK_PRODUCTS.length;
      const hasPrev = startIndex > 0;

      return {
        totalCount: MOCK_PRODUCTS.length,
        pageInfo: {
          hasNextPage: hasNext,
          hasPreviousPage: hasPrev,
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
        context.authUser = user;
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
        context.authUser = user;
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
        errors: [
          {
            field: 'password',
            message: 'Invalid credentials',
            code: 'INVALID_CREDENTIALS',
          },
        ],
      };
    },

    tokenRefresh: ({ refreshToken }: { refreshToken: string }) => {
      if (refreshToken && refreshToken.startsWith('mock-refresh-token')) {
        return {
          token: 'mock-jwt-token-refreshed-ey112233',
          errors: [],
        };
      }
      return {
        token: null,
        errors: [{ message: 'Invalid refresh token', code: 'JWT_INVALID_TOKEN' }],
      };
    },
  };
}

export function startMockServer(port: number = 0): Promise<{ url: string; close: () => Promise<void> }> {
  return new Promise((resolve) => {
    let authUser: { id: string; email: string; isStaff: boolean } | undefined;

    const server = http.createServer(async (req, res) => {
      if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ errors: [{ message: 'Method Not Allowed' }] }));
        return;
      }

      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer mock-jwt-token')) {
        if (authHeader.includes('admin')) {
          authUser = { id: 'usr-admin-1', email: 'admin@example.com', isStaff: true };
        } else {
          authUser = { id: 'usr-101', email: 'customer@example.com', isStaff: false };
        }
      }

      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });

      req.on('end', async () => {
        try {
          const parsed = JSON.parse(body);
          const rootValue = createRootValue({ authUser });
          const result = await graphql({
            schema,
            source: parsed.query,
            variableValues: parsed.variables,
            rootValue,
          });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (err: any) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ errors: [{ message: err.message || 'Bad Request' }] }));
        }
      });
    });

    server.listen(port, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      const url = `http://127.0.0.1:${addr.port}/graphql/`;
      resolve({
        url,
        close: () =>
          new Promise((done) => {
            server.close(() => done());
          }),
      });
    });
  });
}

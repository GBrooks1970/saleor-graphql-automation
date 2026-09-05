import { Task } from '@serenity-js/core';
import { CallGraphQL } from '../abilities/CallGraphQL.js';

const PRODUCTS_QUERY = `
  query GetProducts($first: Int, $channel: String!, $after: String) {
    products(first: $first, channel: $channel, after: $after) {
      totalCount
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      edges {
        cursor
        node {
          id
          name
          slug
          pricing {
            priceRange {
              start {
                gross {
                  amount
                  currency
                }
              }
            }
          }
          category {
            name
          }
        }
      }
    }
  }
`;

export class BrowseCatalogue extends Task {
  static inChannel(channel: string = 'default-channel', first: number = 10, after?: string): BrowseCatalogue {
    return new BrowseCatalogue(channel, first, after);
  }

  constructor(
    private readonly channel: string,
    private readonly first: number,
    private readonly after?: string
  ) {
    super(`#actor browses catalogue in channel ${channel}`);
  }

  async performAs(actor: any): Promise<void> {
    await CallGraphQL.as(actor).execute(PRODUCTS_QUERY, {
      channel: this.channel,
      first: this.first,
      after: this.after,
    });
  }
}

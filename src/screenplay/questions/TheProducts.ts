import { Question } from '@serenity-js/core';
import { CallGraphQL } from '../abilities/CallGraphQL.js';

export interface ProductNode {
  id: string;
  name: string;
  slug: string;
  pricing?: {
    priceRange?: {
      start?: {
        gross?: {
          amount: number;
          currency: string;
        };
      };
    };
  };
  category?: {
    name: string;
  };
}

export interface ProductEdge {
  cursor: string;
  node: ProductNode;
}

export interface ProductPageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}

export interface ProductConnection {
  totalCount: number;
  pageInfo: ProductPageInfo;
  edges: ProductEdge[];
}

export class TheProducts {
  static connection(): Question<Promise<ProductConnection | undefined>> {
    return Question.about('the product connection', async (actor) => {
      const response = CallGraphQL.as(actor).getLastResponse<{ products: ProductConnection }>();
      return response?.data?.products;
    });
  }

  static totalCount(): Question<Promise<number>> {
    return Question.about('the total product count', async (actor) => {
      const connection = await actor.answer(TheProducts.connection());
      return connection?.totalCount ?? 0;
    });
  }

  static names(): Question<Promise<string[]>> {
    return Question.about('the product names', async (actor) => {
      const connection = await actor.answer(TheProducts.connection());
      return connection?.edges?.map((e) => e.node.name) || [];
    });
  }

  static pageInfo(): Question<Promise<ProductPageInfo | undefined>> {
    return Question.about('the product page info', async (actor) => {
      const connection = await actor.answer(TheProducts.connection());
      return connection?.pageInfo;
    });
  }

  static edges(): Question<Promise<ProductEdge[]>> {
    return Question.about('the product edges', async (actor) => {
      const connection = await actor.answer(TheProducts.connection());
      return connection?.edges || [];
    });
  }
}

import { Task } from '@serenity-js/core';
import { CallGraphQL } from '../abilities/CallGraphQL.js';

const SHOP_QUERY = `
  query GetShopInfo {
    shop {
      name
      description
      defaultCountry {
        code
      }
    }
  }
`;

export class QueryShopInfo extends Task {
  static toVerifyHealth(): QueryShopInfo {
    return new QueryShopInfo();
  }

  constructor() {
    super('#actor queries shop details');
  }

  async performAs(actor: any): Promise<void> {
    await CallGraphQL.as(actor).execute(SHOP_QUERY);
  }
}

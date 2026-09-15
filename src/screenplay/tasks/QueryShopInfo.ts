import { Task } from '@serenity-js/core';
import { CallGraphQL } from '../abilities/CallGraphQL.js';
import { requireOperationPayload } from '../errors/index.js';
import { ShopData } from '../questions/TheShopInfo.js';

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
    const ability = CallGraphQL.as(actor);
    const response = await ability.execute<{ shop: ShopData }>(SHOP_QUERY);
    requireOperationPayload('GetShopInfo', response, response.data?.shop);
  }
}

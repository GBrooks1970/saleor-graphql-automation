import { Question } from '@serenity-js/core';
import { CallGraphQL } from '../abilities/CallGraphQL.js';

export interface ShopData {
  name: string;
  description: string;
  defaultCountry?: {
    code: string;
  };
}

export class TheShopInfo {
  static details(): Question<Promise<ShopData | undefined>> {
    return Question.about('the shop details', async (actor) => {
      const response = CallGraphQL.as(actor).getLastResponse<{ shop: ShopData }>();
      return response?.data?.shop;
    });
  }

  static name(): Question<Promise<string | undefined>> {
    return Question.about('the shop name', async (actor) => {
      const shop = await actor.answer(TheShopInfo.details());
      return shop?.name;
    });
  }
}

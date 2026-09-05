import { Question } from '@serenity-js/core';
import { CallGraphQL } from '../abilities/CallGraphQL.js';

export interface UserSummary {
  id: string;
  email: string;
  isStaff: boolean;
}

export interface AccountError {
  field?: string;
  message: string;
  code?: string;
}

export interface TokenCreatePayload {
  token?: string;
  refreshToken?: string;
  csrfToken?: string;
  user?: UserSummary;
  errors?: AccountError[];
}

export interface TokenRefreshPayload {
  token?: string;
  errors?: AccountError[];
}

export class TheToken {
  static createPayload(): Question<Promise<TokenCreatePayload | undefined>> {
    return Question.about('the token create payload', async (actor) => {
      const response = CallGraphQL.as(actor).getLastResponse<{ tokenCreate: TokenCreatePayload }>();
      return response?.data?.tokenCreate;
    });
  }

  static refreshPayload(): Question<Promise<TokenRefreshPayload | undefined>> {
    return Question.about('the token refresh payload', async (actor) => {
      const response = CallGraphQL.as(actor).getLastResponse<{ tokenRefresh: TokenRefreshPayload }>();
      return response?.data?.tokenRefresh;
    });
  }

  static value(): Question<Promise<string | undefined>> {
    return Question.about('the JWT access token', async (actor) => {
      const create = await actor.answer(TheToken.createPayload());
      if (create?.token) return create.token;

      const refresh = await actor.answer(TheToken.refreshPayload());
      if (refresh?.token) return refresh.token;

      return CallGraphQL.as(actor).getAuthToken();
    });
  }

  static refreshToken(): Question<Promise<string | undefined>> {
    return Question.about('the refresh token', async (actor) => {
      const create = await actor.answer(TheToken.createPayload());
      return create?.refreshToken;
    });
  }

  static user(): Question<Promise<UserSummary | undefined>> {
    return Question.about('the authenticated user', async (actor) => {
      const create = await actor.answer(TheToken.createPayload());
      if (create?.user) return create.user;

      const meResponse = CallGraphQL.as(actor).getLastResponse<{ me: UserSummary }>();
      return meResponse?.data?.me;
    });
  }

  static errors(): Question<Promise<AccountError[]>> {
    return Question.about('the token mutation errors', async (actor) => {
      const create = await actor.answer(TheToken.createPayload());
      if (create?.errors && create.errors.length > 0) {
        return create.errors;
      }
      const refresh = await actor.answer(TheToken.refreshPayload());
      return refresh?.errors || [];
    });
  }
}

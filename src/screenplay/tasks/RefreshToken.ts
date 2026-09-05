import { Task } from '@serenity-js/core';
import { CallGraphQL } from '../abilities/CallGraphQL.js';
import { TokenRefreshPayload } from '../questions/TheToken.js';

const TOKEN_REFRESH_MUTATION = `
  mutation TokenRefresh($refreshToken: String!) {
    tokenRefresh(refreshToken: $refreshToken) {
      token
      errors {
        field
        message
        code
      }
    }
  }
`;

export class RefreshToken extends Task {
  static using(refreshToken: string): RefreshToken {
    return new RefreshToken(refreshToken);
  }

  constructor(private readonly refreshToken: string) {
    super('#actor refreshes the auth token');
  }

  async performAs(actor: any): Promise<void> {
    const ability = CallGraphQL.as(actor);
    const response = await ability.execute<{ tokenRefresh: TokenRefreshPayload }>(TOKEN_REFRESH_MUTATION, {
      refreshToken: this.refreshToken,
    });

    const token = response.data?.tokenRefresh?.token;
    if (token) {
      ability.setAuthToken(token);
    }
  }
}

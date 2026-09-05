import { Task } from '@serenity-js/core';
import { CallGraphQL } from '../abilities/CallGraphQL.js';
import { TokenCreatePayload } from '../questions/TheToken.js';

const TOKEN_CREATE_MUTATION = `
  mutation TokenCreate($email: String!, $password: String!) {
    tokenCreate(email: $email, password: $password) {
      token
      refreshToken
      csrfToken
      user {
        id
        email
        isStaff
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

export class Authenticate extends Task {
  static withCredentials(email: string, password: string): Authenticate {
    return new Authenticate(email, password);
  }

  constructor(
    private readonly email: string,
    private readonly password: string
  ) {
    super(`#actor authenticates as ${email}`);
  }

  async performAs(actor: any): Promise<void> {
    const ability = CallGraphQL.as(actor);
    const response = await ability.execute<{ tokenCreate: TokenCreatePayload }>(TOKEN_CREATE_MUTATION, {
      email: this.email,
      password: this.password,
    });

    const token = response.data?.tokenCreate?.token;
    if (token) {
      ability.setAuthToken(token);
    }
  }
}

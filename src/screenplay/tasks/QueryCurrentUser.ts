import { Task } from '@serenity-js/core';
import { CallGraphQL } from '../abilities/CallGraphQL.js';
import { requireOperationPayload } from '../errors/index.js';
import { UserSummary } from '../questions/TheToken.js';

const ME_QUERY = `
  query GetCurrentUser {
    me {
      id
      email
      isStaff
    }
  }
`;

export class QueryCurrentUser extends Task {
  static profile(): QueryCurrentUser {
    return new QueryCurrentUser();
  }

  constructor() {
    super('#actor queries current user profile');
  }

  async performAs(actor: any): Promise<void> {
    const ability = CallGraphQL.as(actor);
    const response = await ability.execute<{ me: UserSummary }>(ME_QUERY);
    requireOperationPayload('GetCurrentUser', response, response.data?.me);
  }
}

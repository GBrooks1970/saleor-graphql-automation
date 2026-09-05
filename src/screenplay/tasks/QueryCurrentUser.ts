import { Task } from '@serenity-js/core';
import { CallGraphQL } from '../abilities/CallGraphQL.js';
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
    await CallGraphQL.as(actor).execute<{ me: UserSummary }>(ME_QUERY);
  }
}

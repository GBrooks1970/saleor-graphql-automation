import { type SaleorWorld } from '../../features/support/SaleorWorld.js';
import { type Authenticate } from '../../src/screenplay/tasks/Authenticate.js';
import { type BrowseCatalogue } from '../../src/screenplay/tasks/BrowseCatalogue.js';
import { type CompleteCheckout } from '../../src/screenplay/tasks/CompleteCheckout.js';
import { type CreateCheckout } from '../../src/screenplay/tasks/CreateCheckout.js';
import { type FulfillOrder } from '../../src/screenplay/tasks/FulfillOrder.js';
import { type LocateOrder } from '../../src/screenplay/tasks/LocateOrder.js';
import { type QueryCurrentUser } from '../../src/screenplay/tasks/QueryCurrentUser.js';
import { type QueryShopInfo } from '../../src/screenplay/tasks/QueryShopInfo.js';
import { type RecordCheckoutTransaction } from '../../src/screenplay/tasks/RecordCheckoutTransaction.js';
import { type RefreshToken } from '../../src/screenplay/tasks/RefreshToken.js';
import { type SelectCheckoutDeliveryMethod } from '../../src/screenplay/tasks/SelectCheckoutDeliveryMethod.js';
import { type SelectCheckoutVariant } from '../../src/screenplay/tasks/SelectCheckoutVariant.js';
import { type SetCheckoutBillingAddress } from '../../src/screenplay/tasks/SetCheckoutBillingAddress.js';
import { type SetCheckoutShippingAddress } from '../../src/screenplay/tasks/SetCheckoutShippingAddress.js';

// Compiled by npm run typecheck; never executed as a runtime test.
// Each negative assertion fails compilation if its boundary becomes untyped.
export function rejectInvalidScenarioState(world: SaleorWorld): void {
  // @ts-expect-error Credentials require a string password.
  world.credentials = { email: 'customer@example.com', password: 123 };
  // @ts-expect-error A refresh token is a string.
  world.savedRefreshToken = 123;
  // @ts-expect-error A checkout channel is a string.
  world.checkoutChannel = 123;
  // @ts-expect-error Undeclared scenario state must not be accepted.
  world.untypedState = 'unexpected';
}

export function rejectNonActorTaskArguments(tasks: {
  Authenticate: Authenticate;
  BrowseCatalogue: BrowseCatalogue;
  CompleteCheckout: CompleteCheckout;
  CreateCheckout: CreateCheckout;
  FulfillOrder: FulfillOrder;
  LocateOrder: LocateOrder;
  QueryCurrentUser: QueryCurrentUser;
  QueryShopInfo: QueryShopInfo;
  RecordCheckoutTransaction: RecordCheckoutTransaction;
  RefreshToken: RefreshToken;
  SelectCheckoutDeliveryMethod: SelectCheckoutDeliveryMethod;
  SelectCheckoutVariant: SelectCheckoutVariant;
  SetCheckoutBillingAddress: SetCheckoutBillingAddress;
  SetCheckoutShippingAddress: SetCheckoutShippingAddress;
}): void {
  // @ts-expect-error Authenticate requires a Serenity Actor.
  void tasks.Authenticate.performAs({});
  // @ts-expect-error BrowseCatalogue requires a Serenity Actor.
  void tasks.BrowseCatalogue.performAs({});
  // @ts-expect-error CompleteCheckout requires a Serenity Actor.
  void tasks.CompleteCheckout.performAs({});
  // @ts-expect-error CreateCheckout requires a Serenity Actor.
  void tasks.CreateCheckout.performAs({});
  // @ts-expect-error FulfillOrder requires a Serenity Actor.
  void tasks.FulfillOrder.performAs({});
  // @ts-expect-error LocateOrder requires a Serenity Actor.
  void tasks.LocateOrder.performAs({});
  // @ts-expect-error QueryCurrentUser requires a Serenity Actor.
  void tasks.QueryCurrentUser.performAs({});
  // @ts-expect-error QueryShopInfo requires a Serenity Actor.
  void tasks.QueryShopInfo.performAs({});
  // @ts-expect-error RecordCheckoutTransaction requires a Serenity Actor.
  void tasks.RecordCheckoutTransaction.performAs({});
  // @ts-expect-error RefreshToken requires a Serenity Actor.
  void tasks.RefreshToken.performAs({});
  // @ts-expect-error SelectCheckoutDeliveryMethod requires a Serenity Actor.
  void tasks.SelectCheckoutDeliveryMethod.performAs({});
  // @ts-expect-error SelectCheckoutVariant requires a Serenity Actor.
  void tasks.SelectCheckoutVariant.performAs({});
  // @ts-expect-error SetCheckoutBillingAddress requires a Serenity Actor.
  void tasks.SetCheckoutBillingAddress.performAs({});
  // @ts-expect-error SetCheckoutShippingAddress requires a Serenity Actor.
  void tasks.SetCheckoutShippingAddress.performAs({});
}

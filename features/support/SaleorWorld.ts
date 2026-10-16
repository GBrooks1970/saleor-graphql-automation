import { World } from '@cucumber/cucumber';
import assert from 'node:assert';

export interface CustomerCredentials {
  email: string;
  password: string;
}

/** Cucumber creates a fresh World for each scenario, including retries. */
export class SaleorWorld extends World<Record<string, unknown>> {
  credentials?: CustomerCredentials;
  savedRefreshToken?: string;
  checkoutChannel?: string;

  requireCredentials(): CustomerCredentials {
    assert.ok(this.credentials, 'Customer credentials must be recorded before authentication');
    return this.credentials;
  }
}

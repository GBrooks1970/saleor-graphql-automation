import { Given, When, Then } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import assert from 'node:assert';
import { Authenticate } from '../../src/screenplay/tasks/Authenticate.js';
import { RefreshToken } from '../../src/screenplay/tasks/RefreshToken.js';
import { QueryCurrentUser } from '../../src/screenplay/tasks/QueryCurrentUser.js';
import { TheToken } from '../../src/screenplay/questions/TheToken.js';
import { TheGraphQLError } from '../../src/screenplay/questions/TheGraphQLError.js';

Given('a customer with credentials {string} and {string}', function (email: string, password: string) {
  (this as any).email = email;
  (this as any).password = password;
});

When('they authenticate with their credentials', async function () {
  const email = (this as any).email;
  const password = (this as any).password;
  await actorCalled('Customer').attemptsTo(Authenticate.withCredentials(email, password));
});

Then('a valid JWT token should be returned', async function () {
  const token = await actorCalled('Customer').answer(TheToken.value());
  assert.ok(token, 'JWT access token must be defined');
  assert.ok(token.length > 10, 'JWT access token must have meaningful length');
});

Then('a refresh token should be present', async function () {
  const refreshToken = await actorCalled('Customer').answer(TheToken.refreshToken());
  assert.ok(refreshToken, 'Refresh token must be defined');
  (this as any).savedRefreshToken = refreshToken;
});

Then('the user profile email should be {string}', async function (expectedEmail: string) {
  const user = await actorCalled('Customer').answer(TheToken.user());
  assert.strictEqual(user?.email, expectedEmail);
});

Given('a customer authenticated with {string} and {string}', async function (email: string, password: string) {
  await actorCalled('Customer').attemptsTo(Authenticate.withCredentials(email, password));
  (this as any).savedRefreshToken = await actorCalled('Customer').answer(TheToken.refreshToken());
});

When('they query their current user profile', async function () {
  await actorCalled('Customer').attemptsTo(QueryCurrentUser.profile());
});

Then('the authenticated user email should be {string}', async function (expectedEmail: string) {
  const user = await actorCalled('Customer').answer(TheToken.user());
  assert.strictEqual(user?.email, expectedEmail);
});

Then('the authentication should fail with error code {string}', async function (expectedCode: string) {
  const errors = await actorCalled('Customer').answer(TheToken.errors());
  const graphQLErrorCode = await actorCalled('Customer').answer(TheGraphQLError.code());

  const matched = errors.some((e) => e.code === expectedCode) || graphQLErrorCode === expectedCode;
  assert.ok(
    matched,
    `Expected error code '${expectedCode}', got accountErrors=${JSON.stringify(errors)}, graphQLErrorCode=${graphQLErrorCode}`
  );
});

When('they refresh their token using their refresh token', async function () {
  const token = (this as any).savedRefreshToken;
  assert.ok(token, 'Saved refresh token must be present');
  await actorCalled('Customer').attemptsTo(RefreshToken.using(token));
});

Then('a refreshed JWT token should be issued', async function () {
  const token = await actorCalled('Customer').answer(TheToken.value());
  assert.ok(token, 'Refreshed JWT token must be returned');
});

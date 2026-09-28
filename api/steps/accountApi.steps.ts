import { Then, When, World } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import type { APIResponse } from 'playwright';
import { AccountApi } from '../services/accountApi';
import { apiClientFor, getApiTestData } from '../services/apiHelpers';

interface AccountApiWorld extends World {
  accountApiResponse?: APIResponse;
  requestedAccountId?: string;
}

When('I retrieve account details for the configured account', async function (this: AccountApiWorld) {
  const accountId = getApiTestData().accountId.trim();
  if (!accountId) throw new Error('Configure API_ACCOUNT_ID or api/apiTestData.json before running the account API scenario.');
  this.requestedAccountId = accountId;
  this.accountApiResponse = await new AccountApi(apiClientFor(this)).getAccount(accountId);
});

Then('the account API response status should be {int}', function (this: AccountApiWorld, status: number) {
  expect(this.accountApiResponse, 'The account API request was not sent.').toBeDefined();
  expect(this.accountApiResponse!.status()).toBe(status);
});

Then('the account API response should identify the configured account', async function (this: AccountApiWorld) {
  expect(this.accountApiResponse, 'The account API request was not sent.').toBeDefined();
  const payload: unknown = await this.accountApiResponse!.json();
  expect(payload).toBeTruthy();
  expect(typeof payload).toBe('object');
  const account = payload as { id?: string | number; accountId?: string | number };
  const actualId = account.id ?? account.accountId;
  expect(String(actualId), 'The response must include id or accountId.').toBe(this.requestedAccountId);
});
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Then, When } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import { AccountApi } from '../services/accountApi';
import { CustomerApi } from '../services/customerApi';
import { TransactionApi } from '../services/transactionApi';
import { apiClientFor, getApiTestData } from '../services/apiHelpers';
import type { ApiWorld } from '../support/world';
import { ApiAssertions } from '../utils/apiAssertions';
import { readJsonResponse } from '../utils/apiUtils';

/**
 * Reads transaction history, trying the configured account then the customer's accounts.
 * Saves a successful response or fails when no account exposes history.
 */
When('user fetches transaction details', async function (this: ApiWorld) {
  const transactionApi = new TransactionApi(apiClientFor(this));
  const configuredAccountId = this.accountId || getApiTestData().accountId;
  this.lastResponse = await transactionApi.getAccountTransactions(configuredAccountId, [200, 400, 404]);
  if (this.lastResponse.status() === 200) return;

  const customerId = this.customerId || getApiTestData().customerId;
  const accountsPayload = await new CustomerApi(apiClientFor(this)).getCustomerAccounts(customerId);
  const accounts = await readJsonResponse<unknown>(accountsPayload);
  if (!Array.isArray(accounts)) {
    throw new Error(`Customer ${customerId} accounts response was not an array.`);
  }

  for (const account of accounts) {
    if (typeof account !== 'object' || account === null || !('id' in account)) continue;
    const id = account.id;
    if ((typeof id !== 'string' && typeof id !== 'number') || String(id).trim() === '') continue;

    const response = await transactionApi.getAccountTransactions(String(id), [200, 400, 404]);
    if (response.status() === 200) {
      this.accountId = String(id);
      this.lastResponse = response;
      return;
    }
  }

  throw new Error(`No transaction history was found for customer ${customerId}'s accounts.`);
});

/** Confirms transaction history is an array of records with IDs and amounts. */
Then('transaction history should be returned', async function (this: ApiWorld) {
  const transactions = await readJsonResponse<unknown>(this.lastResponse!);
  if (!Array.isArray(transactions)) {
    throw new Error('Transaction history response must be a JSON array.');
  }
  for (const transaction of transactions) {
    expect(transaction).toBeTruthy();
    expect(typeof transaction).toBe('object');
    expect(transaction).toHaveProperty('id');
    expect(transaction).toHaveProperty('amount');
  }
});

/** Loads the customer schema and validates the captured JSON response. */
Then('customer response schema should be valid', async function (this: ApiWorld) {
  const schema = JSON.parse(readFileSync(join(__dirname, '..', 'payloads', 'schemas', 'customer.schema.json'), 'utf8').replace(/^\uFEFF/, ''));
  await ApiAssertions.assertSchema(this.lastResponse!, schema);
});

/** Loads the account schema and validates the captured JSON response. */
Then('account response schema should be valid', async function (this: ApiWorld) {
  const schema = JSON.parse(readFileSync(join(__dirname, '..', 'payloads', 'schemas', 'account.schema.json'), 'utf8').replace(/^\uFEFF/, ''));
  await ApiAssertions.assertSchema(this.lastResponse!, schema);
});

/** Loads the transaction schema and validates the captured JSON response. */
Then('transaction response schema should be valid', async function (this: ApiWorld) {
  const schema = JSON.parse(readFileSync(join(__dirname, '..', 'payloads', 'schemas', 'transaction.schema.json'), 'utf8').replace(/^\uFEFF/, ''));
  await ApiAssertions.assertSchema(this.lastResponse!, schema);
});

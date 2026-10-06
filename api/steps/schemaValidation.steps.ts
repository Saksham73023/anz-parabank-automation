import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Then, When } from '@cucumber/cucumber';
import { AccountApi } from '../services/accountApi';
import { CustomerApi } from '../services/customerApi';
import { apiClientFor, getApiTestData } from '../services/apiHelpers';
import type { ApiWorld } from '../support/world';
import { ApiAssertions } from '../utils/apiAssertions';
import { readJsonResponse } from '../utils/apiUtils';

When('user fetches transaction details', async function (this: ApiWorld) {
  const accountApi = new AccountApi(apiClientFor(this));
  const configuredAccountId = this.accountId || getApiTestData().accountId;
  this.lastResponse = await accountApi.getAccountTransactions(configuredAccountId, [200, 400, 404]);
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

    const response = await accountApi.getAccountTransactions(String(id), [200, 400, 404]);
    if (response.status() === 200) {
      this.accountId = String(id);
      this.lastResponse = response;
      return;
    }
  }

  throw new Error(`No transaction history was found for customer ${customerId}'s accounts.`);
});

Then('customer response schema should be valid', async function (this: ApiWorld) {
  const schema = JSON.parse(readFileSync(join(__dirname, '..', 'payloads', 'schemas', 'customer.schema.json'), 'utf8').replace(/^\uFEFF/, ''));
  await ApiAssertions.assertSchema(this.lastResponse!, schema);
});

Then('account response schema should be valid', async function (this: ApiWorld) {
  const schema = JSON.parse(readFileSync(join(__dirname, '..', 'payloads', 'schemas', 'account.schema.json'), 'utf8').replace(/^\uFEFF/, ''));
  await ApiAssertions.assertSchema(this.lastResponse!, schema);
});

Then('transaction response schema should be valid', async function (this: ApiWorld) {
  const schema = JSON.parse(readFileSync(join(__dirname, '..', 'payloads', 'schemas', 'transaction.schema.json'), 'utf8').replace(/^\uFEFF/, ''));
  await ApiAssertions.assertSchema(this.lastResponse!, schema);
});

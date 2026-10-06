import { Then, When } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import { AccountApi } from '../services/accountApi';
import { BillPayApi } from '../services/billPayApi';
import { apiClientFor, getApiTestData } from '../services/apiHelpers';
import { TransferApi } from '../services/transferApi';
import type { ApiWorld } from '../support/world';
import { readJsonResponse } from '../utils/apiUtils';

When('user seeds account transactions', async function (this: ApiWorld) {
  const accountId = this.accountId || getApiTestData().accountId;
  this.lastResponse = await new AccountApi(apiClientFor(this)).getAccountTransactions(accountId);
});

When('user pays a bill', async function (this: ApiWorld) {
  const { billPay } = getApiTestData();
  this.lastResponse = await new BillPayApi(apiClientFor(this)).payBill({
    accountId: this.accountId || billPay.accountId,
    payeeName: billPay.payeeName,
    address: billPay.address,
    city: billPay.city,
    state: billPay.state,
    zipCode: billPay.zipCode,
    phoneNumber: billPay.phoneNumber,
    amount: billPay.amount
  });
});

Then('all api responses should be successful', function (this: ApiWorld) {
  expect(this.lastResponse).toBeTruthy();
  expect(this.lastResponse!.status()).toBeGreaterThanOrEqual(200);
  expect(this.lastResponse!.status()).toBeLessThan(300);
});

Then('final account balance should be correct', async function (this: ApiWorld) {
  const accountApi = new AccountApi(apiClientFor(this));
  const accountId = this.accountId || getApiTestData().accountId;
  const payload = await readJsonResponse(await accountApi.getAccount(accountId));
  expect((payload as { balance?: number }).balance).toBeDefined();
});

When('user completes a transfer between accounts', async function (this: ApiWorld) {
  const { transfer } = getApiTestData();
  this.sourceAccountId = this.sourceAccountId || transfer.sourceAccountId;
  this.destinationAccountId = this.destinationAccountId || this.accountId || transfer.destinationAccountId;
  this.transferAmount = this.transferAmount || transfer.amount;
  this.lastResponse = await new TransferApi(apiClientFor(this)).transfer({
    sourceAccountId: this.sourceAccountId,
    destinationAccountId: this.destinationAccountId,
    amount: this.transferAmount
  });
});

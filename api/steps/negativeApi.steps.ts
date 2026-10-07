import { When } from '@cucumber/cucumber';
import { apiClientFor, getApiTestData } from '../services/apiHelpers';
import type { ApiWorld } from '../support/world';

When('user sends a malformed JSON payload', async function (this: ApiWorld) {
  const { billPay } = getApiTestData();
  this.lastResponse = await apiClientFor(this).post('/billpay', {
    params: { accountId: billPay.accountId, amount: billPay.amount },
    data: '{"customerId":',
    headers: { 'Content-Type': 'application/json' },
    expectedStatus: 500
  });
});

When('user creates an account without required parameters', async function (this: ApiWorld) {
  this.lastResponse = await apiClientFor(this).post('/createAccount', {
    expectedStatus: 400
  });
});

When('user sends a request with the wrong content type', async function (this: ApiWorld) {
  const { billPay } = getApiTestData();
  this.lastResponse = await apiClientFor(this).post('/billpay', {
    params: { accountId: billPay.accountId, amount: billPay.amount },
    data: 'invalid request body',
    headers: { 'Content-Type': 'text/plain' },
    expectedStatus: 415
  });
});

When('user attempts an invalid transfer', async function (this: ApiWorld) {
  const { transfer } = getApiTestData();
  const fromAccountId = this.sourceAccountId || transfer.sourceAccountId;
  const toAccountId = this.destinationAccountId || transfer.destinationAccountId;
  this.lastResponse = await apiClientFor(this).post('/transfer', {
    params: {
      fromAccountId,
      toAccountId,
      amount: -1
    },
    expectedStatus: 400
  });
});

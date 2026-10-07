import { When } from '@cucumber/cucumber';
import { apiClientFor, getApiTestData } from '../services/apiHelpers';
import type { ApiWorld } from '../support/world';

/** Sends intentionally malformed JSON and accepts the server response documented by this test. */
When('user sends a malformed JSON payload', async function (this: ApiWorld) {
  const { billPay } = getApiTestData();
  this.lastResponse = await apiClientFor(this).post('/billpay', {
    params: { accountId: billPay.accountId, amount: billPay.amount },
    data: '{"customerId":',
    headers: { 'Content-Type': 'application/json' },
    expectedStatus: 500
  });
});

/** Sends an account-creation request without mandatory parameters. */
When('user creates an account without required parameters', async function (this: ApiWorld) {
  this.lastResponse = await apiClientFor(this).post('/createAccount', {
    expectedStatus: 400
  });
});

/** Sends a bill-payment body with an unsupported media type for negative validation. */
When('user sends a request with the wrong content type', async function (this: ApiWorld) {
  const { billPay } = getApiTestData();
  this.lastResponse = await apiClientFor(this).post('/billpay', {
    params: { accountId: billPay.accountId, amount: billPay.amount },
    data: 'invalid request body',
    headers: { 'Content-Type': 'text/plain' },
    expectedStatus: 415
  });
});

/** Sends a transfer with a negative amount to verify server-side rejection. */
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

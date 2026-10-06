import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import { apiClientFor, getApiTestData } from '../services/apiHelpers';
import type { ApiWorld } from '../support/world';

Given(/^an? incomplete payload$/, function (this: ApiWorld) {
  this.requestBody = { firstName: 'Incomplete' };
});

Given(/^an empty payload$/, function (this: ApiWorld) {
  this.requestBody = {};
});

Given('content type is invalid', function (this: ApiWorld) {
  this.requestBody = { invalid: true };
});

When(/^user sends (?:a )?request$/, async function (this: ApiWorld) {
  const client = apiClientFor(this);
  if (
    typeof this.requestBody === 'object' &&
    this.requestBody !== null &&
    Object.keys(this.requestBody).length === 0
  ) {
    this.lastResponse = await client.post('/createAccount', {
      params: { customerId: '', newAccountType: 0, fromAccountId: '' },
      expectedStatus: 400
    });
    return;
  }

  const { billPay } = getApiTestData();
  this.lastResponse = await client.post('/billpay', {
    params: { accountId: billPay.accountId, amount: billPay.amount },
    data: 'invalid request body',
    headers: { 'Content-Type': 'text/plain' },
    expectedStatus: 415
  });
});

When('user creates an account', async function (this: ApiWorld) {
  const client = apiClientFor(this);
  this.lastResponse = await client.post('/createAccount', {
    params: {
      customerId: '',
      newAccountType: 0,
      fromAccountId: ''
    },
    expectedStatus: 400
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

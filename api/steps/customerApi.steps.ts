import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import { CustomerApi } from '../services/customerApi';
import { apiClientFor, getApiTestData } from '../services/apiHelpers';
import type { ApiWorld } from '../support/world';
import { readJsonResponse } from '../utils/apiUtils';

Given('a valid customer exists', function (this: ApiWorld) {
  const { customerId } = getApiTestData();
  this.customerId = customerId || '12212';
  this.invalidCustomerIdRequested = false;
});

Given('an invalid customer id', function (this: ApiWorld) {
  this.customerId = '999999999';
  this.invalidCustomerIdRequested = true;
});

When('user fetches customer details', async function (this: ApiWorld) {
  const customerId = this.customerId || getApiTestData().customerId;
  this.lastResponse = await new CustomerApi(apiClientFor(this)).getCustomer(
    customerId,
    this.invalidCustomerIdRequested ? 400 : undefined
  );
});

Then('response status should be {int}', function (this: ApiWorld, expectedStatus: number) {
  expect(this.lastResponse, 'No API response was captured for this step.').toBeTruthy();
  expect(this.lastResponse!.status()).toBe(expectedStatus);
});

Then('customer information should be returned', async function (this: ApiWorld) {
  const payload = await readJsonResponse(this.lastResponse!);
  expect(payload).toBeTruthy();
  const customer = payload as { id?: unknown; customerId?: unknown; firstName?: string; lastName?: string };
  expect(customer.id ?? customer.customerId).toBeTruthy();
  expect(customer.firstName).toBeTruthy();
  expect(customer.lastName).toBeTruthy();
});

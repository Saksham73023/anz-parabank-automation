import { Then, When } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import { AccountApi } from '../services/accountApi';
import { CustomerApi } from '../services/customerApi';
import { apiClientFor, getApiTestData } from '../services/apiHelpers';
import { SoapApi } from '../services/soapApi';
import type { ApiWorld } from '../support/world';
import { readJsonResponse } from '../utils/apiUtils';
import { soapRecords } from '../utils/soapResponse';

When('customer details are compared over REST and SOAP', async function (this: ApiWorld) {
  const customerId = this.customerId || getApiTestData().customerId;
  const [restResponse, soapResponse] = await Promise.all([
    new CustomerApi(apiClientFor(this)).getCustomer(customerId),
    new SoapApi(apiClientFor(this)).getCustomer(customerId)
  ]);
  const restBody = await readJsonResponse<Record<string, unknown>>(restResponse);
  const soapBody = await soapResponse.text();
  this.soapParity = {
    operation: 'customer',
    rest: restRecords(restBody, ['id', 'firstName', 'lastName'], 'customer'),
    soap: soapRecords(soapBody, 'customer', ['id', 'firstName', 'lastName'])
  };
});

When('account details are compared over REST and SOAP', async function (this: ApiWorld) {
  const accountId = this.accountId || getApiTestData().accountId;
  const [restResponse, soapResponse] = await Promise.all([
    new AccountApi(apiClientFor(this)).getAccount(accountId),
    new SoapApi(apiClientFor(this)).getAccount(accountId)
  ]);
  const restBody = await readJsonResponse<Record<string, unknown>>(restResponse);
  const soapBody = await soapResponse.text();
  this.soapParity = {
    operation: 'account',
    rest: restRecords(restBody, ['id', 'type', 'balance'], 'account'),
    soap: soapRecords(soapBody, 'account', ['id', 'type', 'balance'])
  };
});

When('transaction history is compared over REST and SOAP', async function (this: ApiWorld) {
  const accountId = this.accountId || getApiTestData().accountId;
  const [restResponse, soapResponse] = await Promise.all([
    new AccountApi(apiClientFor(this)).getAccountTransactions(accountId),
    new SoapApi(apiClientFor(this)).getTransactions(accountId)
  ]);
  const restBody = await readJsonResponse<unknown>(restResponse);
  if (!Array.isArray(restBody)) {
    throw new Error('REST transaction history must be a JSON array for SOAP parity validation.');
  }
  const soapBody = await soapResponse.text();
  this.soapParity = {
    operation: 'transaction',
    rest: restRecords(restBody, ['id', 'type', 'amount'], 'transaction'),
    soap: soapRecords(soapBody, 'transaction', ['id', 'type', 'amount'])
  };
});

Then('REST and SOAP customer responses should be functionally equivalent', function (this: ApiWorld) {
  assertEquivalent(this, 'customer');
});

Then('REST and SOAP account responses should be functionally equivalent', function (this: ApiWorld) {
  assertEquivalent(this, 'account');
});

Then('REST and SOAP transaction responses should be functionally equivalent', function (this: ApiWorld) {
  assertEquivalent(this, 'transaction');
});

function restRecords(value: unknown, fields: string[], resourceName: string): Record<string, unknown>[] {
  const candidates = Array.isArray(value) ? value : [value];
  return candidates.map((candidate) => {
    if (typeof candidate !== 'object' || candidate === null) {
      throw new Error(`REST ${resourceName} response contains a non-object record.`);
    }
    const record = candidate as Record<string, unknown>;
    const missingFields = fields.filter((field) => record[field] === undefined || record[field] === null);
    if (missingFields.length > 0) {
      throw new Error(`REST ${resourceName} record is missing parity fields: ${missingFields.join(', ')}.`);
    }
    return Object.fromEntries(fields.map((field) => [field, record[field]]));
  });
}

function assertEquivalent(world: ApiWorld, operation: string): void {
  const parity = world.soapParity;
  if (!parity || parity.operation !== operation) {
    throw new Error(`REST and SOAP ${operation} responses were not both captured.`);
  }
  expect(parity.rest, `REST ${operation} response did not contain the expected resource record.`).not.toHaveLength(0);
  expect(parity.soap, `SOAP ${operation} response did not contain the expected resource record.`).not.toHaveLength(0);
  if (operation !== 'transaction') {
    expect(parity.rest, `REST ${operation} response should contain one resource record.`).toHaveLength(1);
    expect(parity.soap, `SOAP ${operation} response should contain one resource record.`).toHaveLength(1);
  }
  expect(canonicalRecords(parity.soap)).toEqual(canonicalRecords(parity.rest));
}

function canonicalRecords(records: Record<string, unknown>[]): Record<string, string>[] {
  return records.map((record) => Object.fromEntries(
    Object.entries(record)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => [key, canonicalValue(value)])
  )).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function canonicalValue(value: unknown): string {
  if (typeof value === 'number') return String(value);
  const text = String(value).trim();
  const number = Number(text);
  return text !== '' && Number.isFinite(number) ? String(number) : text;
}

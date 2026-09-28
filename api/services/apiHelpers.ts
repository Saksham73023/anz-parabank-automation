import { After, Before, Given, World } from '@cucumber/cucumber';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ApiClient } from '../apiClient';

export interface ApiTestData {
  accountId: string;
  transfer: {
    sourceAccountId: string;
    destinationAccountId: string;
    amount: number;
  };
}

const clients = new WeakMap<World, ApiClient>();

export function getApiTestData(): ApiTestData {
  const dataPath = join(__dirname, '..', 'testData', 'apiTestData.json');
  const data = JSON.parse(readFileSync(dataPath, 'utf8')) as ApiTestData;
  const amount = Number(process.env.API_TRANSFER_AMOUNT ?? data.transfer.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new RangeError('API_TRANSFER_AMOUNT must be a finite number greater than zero.');
  }

  return {
    accountId: process.env.API_ACCOUNT_ID?.trim() || data.accountId,
    transfer: {
      sourceAccountId: process.env.API_TRANSFER_SOURCE_ACCOUNT_ID?.trim() || data.transfer.sourceAccountId,
      destinationAccountId: process.env.API_TRANSFER_DESTINATION_ACCOUNT_ID?.trim() || data.transfer.destinationAccountId,
      amount
    }
  };
}

export function apiClientFor(world: World): ApiClient {
  const client = clients.get(world);
  if (!client) throw new Error('API client is not initialized for this scenario.');
  return client;
}

Before({ tags: '@api' }, async function (this: World) {
  clients.set(this, await ApiClient.create());
});

After({ tags: '@api' }, async function (this: World) {
  const client = clients.get(this);
  clients.delete(this);
  await client?.dispose();
});

Given('API client is configured', function (this: World) {
  apiClientFor(this);
});
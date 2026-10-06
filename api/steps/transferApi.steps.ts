import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import { AccountApi } from '../services/accountApi';
import { apiClientFor, getApiTestData } from '../services/apiHelpers';
import { TransferApi } from '../services/transferApi';
import type { ApiWorld } from '../support/world';
import { readJsonResponse } from '../utils/apiUtils';

Given('source account exists', function (this: ApiWorld) {
  const { sourceAccountId } = getApiTestData().transfer;
  this.sourceAccountId = sourceAccountId || '12345';
});

Given('destination account exists', function (this: ApiWorld) {
  const { destinationAccountId } = getApiTestData().transfer;
  this.destinationAccountId = destinationAccountId || '12346';
});

Given('transfer amount is invalid', function (this: ApiWorld) {
  this.transferAmount = -10;
});

When('transfer is completed', async function (this: ApiWorld) {
  await resolveTransferAccounts(this);
  this.lastResponse = await new TransferApi(apiClientFor(this)).transfer({
    sourceAccountId: this.sourceAccountId,
    destinationAccountId: this.destinationAccountId,
    amount: this.transferAmount
  });
});

When('user transfers amount between accounts', async function (this: ApiWorld) {
  await resolveTransferAccounts(this);
  this.lastResponse = await new TransferApi(apiClientFor(this)).transfer({
    sourceAccountId: this.sourceAccountId,
    destinationAccountId: this.destinationAccountId,
    amount: this.transferAmount
  });
});

When('user transfers funds', async function (this: ApiWorld) {
  await resolveTransferAccounts(this);

  this.lastResponse = await apiClientFor(this).post('/transfer', {
    params: {
      fromAccountId: this.sourceAccountId,
      toAccountId: this.destinationAccountId,
      amount: this.transferAmount
    },
    expectedStatus: [200, 201, 202]
  });
});

When('user transfers amount', async function (this: ApiWorld) {
  await resolveTransferAccounts(this);

  this.lastResponse = await new TransferApi(apiClientFor(this)).transfer({
    sourceAccountId: this.sourceAccountId,
    destinationAccountId: this.destinationAccountId,
    amount: this.transferAmount
  });
});

Then('transfer transaction should be recorded', async function (this: ApiWorld) {
  const payload = await readJsonResponse(this.lastResponse!);
  expect(payload).toBeTruthy();
});

Then('source account balance should decrease', async function (this: ApiWorld) {
  const api = new AccountApi(apiClientFor(this));
  if (this.sourceBalanceBeforeTransfer === undefined) {
    throw new Error('Source balance was not captured before the transfer.');
  }
  const payload = await readJsonResponse<{ balance?: number | string }>(await api.getAccount(this.sourceAccountId));
  const balanceAfter = Number(payload.balance);
  expect(Number.isFinite(balanceAfter)).toBe(true);
  expect(balanceAfter).toBeLessThan(this.sourceBalanceBeforeTransfer);
});

Then('destination account balance should increase', async function (this: ApiWorld) {
  const api = new AccountApi(apiClientFor(this));
  if (this.destinationBalanceBeforeTransfer === undefined) {
    throw new Error('Destination balance was not captured before the transfer.');
  }
  const payload = await readJsonResponse<{ balance?: number | string }>(await api.getAccount(this.destinationAccountId));
  const balanceAfter = Number(payload.balance);
  expect(Number.isFinite(balanceAfter)).toBe(true);
  expect(balanceAfter).toBeGreaterThan(this.destinationBalanceBeforeTransfer);
});

async function resolveTransferAccounts(world: ApiWorld): Promise<void> {
  const { customerId, transfer } = getApiTestData();
  const accountApi = new AccountApi(apiClientFor(world));
  const response = await accountApi.getCustomerAccounts(world.customerId || customerId);
  const payload = await readJsonResponse<unknown>(response);
  if (!Array.isArray(payload)) {
    throw new Error(`Customer ${world.customerId || customerId} accounts response was not an array.`);
  }

  const accounts: Array<{ id: string; balance: number }> = [];
  for (const account of payload) {
    if (typeof account !== 'object' || account === null) continue;
    const record = account as Record<string, unknown>;
    const id = record.id;
    const type = record.type ?? record.accountType;
    const balance = Number(record.balance ?? record.availableBalance);
    if (
      (typeof id === 'string' || typeof id === 'number') &&
      String(id).trim() !== '' &&
      String(record.customerId) === (world.customerId || customerId) &&
      (type === 'CHECKING' || type === 'SAVINGS') &&
      Number.isFinite(balance)
    ) {
      accounts.push({ id: String(id), balance });
    }
  }

  const requestedSourceId = world.sourceAccountId || transfer.sourceAccountId;
  const requestedDestinationId = world.destinationAccountId || transfer.destinationAccountId;
  const source = accounts.find((account) => account.id === requestedSourceId && account.balance >= transfer.amount)
    ?? accounts
      .filter((account) => account.balance >= transfer.amount)
      .sort((left, right) => right.balance - left.balance)[0];
  if (!source) {
    throw new Error(`Customer ${world.customerId || customerId} has no CHECKING or SAVINGS account with enough balance for a ${transfer.amount} transfer.`);
  }

  const destination = accounts.find((account) =>
    account.id === requestedDestinationId && account.id !== source.id
  ) ?? accounts.find((account) => account.id !== source.id);
  if (!destination) {
    throw new Error(`Customer ${world.customerId || customerId} needs at least two CHECKING or SAVINGS accounts to transfer funds.`);
  }

  world.sourceAccountId = source.id;
  world.destinationAccountId = destination.id;
  world.transferAmount = transfer.amount;
  world.sourceBalanceBeforeTransfer = source.balance;
  world.destinationBalanceBeforeTransfer = destination.balance;
}

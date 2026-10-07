import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import { AccountApi } from '../services/accountApi';
import { apiClientFor, getApiTestData } from '../services/apiHelpers';
import { TransferApi } from '../services/transferApi';
import type { ApiWorld } from '../support/world';
import { readJsonResponse } from '../utils/apiUtils';

/** Selects the configured source account for a transfer scenario. */
Given('source account exists', function (this: ApiWorld) {
  const { sourceAccountId } = getApiTestData().transfer;
  this.sourceAccountId = sourceAccountId || '12345';
});

/** Selects the configured destination account for a transfer scenario. */
Given('destination account exists', function (this: ApiWorld) {
  const { destinationAccountId } = getApiTestData().transfer;
  this.destinationAccountId = destinationAccountId || '12346';
});

/** Sets a negative amount to drive the invalid-transfer request scenario. */
Given('transfer amount is invalid', function (this: ApiWorld) {
  this.transferAmount = -10;
});

/** Resolves account IDs and submits the scenario transfer via TransferApi. */
When('transfer is completed', async function (this: ApiWorld) {
  await resolveTransferAccounts(this);
  this.lastResponse = await new TransferApi(apiClientFor(this)).transfer({
    sourceAccountId: this.sourceAccountId,
    destinationAccountId: this.destinationAccountId,
    amount: this.transferAmount
  });
});

/** Resolves eligible accounts and submits the configured transfer via TransferApi. */
When('user transfers amount between accounts', async function (this: ApiWorld) {
  await resolveTransferAccounts(this);
  this.lastResponse = await new TransferApi(apiClientFor(this)).transfer({
    sourceAccountId: this.sourceAccountId,
    destinationAccountId: this.destinationAccountId,
    amount: this.transferAmount
  });
});

/** Resolves account IDs and sends a transfer through the shared API client. */
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

/** Resolves eligible accounts and submits the configured transfer via TransferApi. */
When('user transfers amount', async function (this: ApiWorld) {
  await resolveTransferAccounts(this);

  this.lastResponse = await new TransferApi(apiClientFor(this)).transfer({
    sourceAccountId: this.sourceAccountId,
    destinationAccountId: this.destinationAccountId,
    amount: this.transferAmount
  });
});

/** Confirms the transfer response can be parsed and contains a truthy payload. */
Then('transfer transaction should be recorded', async function (this: ApiWorld) {
  const payload = await readJsonResponse(this.lastResponse!);
  expect(payload).toBeTruthy();
});

/** Fetches both post-transfer balances and verifies that the source balance decreased. */
Then('source account balance should decrease', async function (this: ApiWorld) {
  if (this.sourceBalanceBeforeTransfer === undefined) {
    throw new Error('Source balance was not captured before the transfer.');
  }
  const balances = await loadBalancesAfterTransfer(this);
  this.destinationBalanceAfterTransfer = balances.destination;
  expect(balances.source).toBeLessThan(this.sourceBalanceBeforeTransfer);
});

/** Verifies the destination balance fetched during the source-balance check increased. */
Then('destination account balance should increase', async function (this: ApiWorld) {
  if (this.destinationBalanceBeforeTransfer === undefined) {
    throw new Error('Destination balance was not captured before the transfer.');
  }
  if (this.destinationBalanceAfterTransfer === undefined) {
    throw new Error('Destination balance was not fetched after the transfer.');
  }
  expect(this.destinationBalanceAfterTransfer).toBeGreaterThan(this.destinationBalanceBeforeTransfer);
});

/**
 * Fetches the customer's account list and resolves fresh balances for both transfer accounts.
 * @param world Scenario state containing the customer and transfer account IDs.
 * @returns The current source and destination balances.
 */
async function loadBalancesAfterTransfer(world: ApiWorld): Promise<{ source: number; destination: number }> {
  const { customerId } = getApiTestData();
  const expectedCustomerId = world.customerId || customerId;
  const response = await new AccountApi(apiClientFor(world)).getCustomerAccounts(expectedCustomerId);
  const payload = await readJsonResponse<unknown>(response);
  if (!Array.isArray(payload)) {
    throw new Error(`Customer ${expectedCustomerId} accounts response was not an array.`);
  }

  const balances = new Map<string, number>();
  for (const account of payload) {
    if (typeof account !== 'object' || account === null) continue;
    const record = account as Record<string, unknown>;
    const id = record.id;
    if (
      (typeof id !== 'string' && typeof id !== 'number') ||
      String(record.customerId) !== expectedCustomerId
    ) {
      continue;
    }

    const balance = Number(record.balance ?? record.availableBalance);
    if (Number.isFinite(balance)) balances.set(String(id), balance);
  }

  const source = balances.get(world.sourceAccountId);
  const destination = balances.get(world.destinationAccountId);
  if (source === undefined || destination === undefined) {
    throw new Error('Could not find both transfer accounts in the customer accounts response.');
  }
  return { source, destination };
}

/**
 * Selects distinct eligible accounts and captures their pre-transfer balances.
 * Requires a funded checking/savings source and another account belonging to the customer.
 * @param world Scenario state to populate with selected accounts and baseline balances.
 */
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

import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import { AccountApi } from '../services/accountApi';
import { apiClientFor, getApiTestData, resolveCustomerAccountId } from '../services/apiHelpers';
import { TransactionApi } from '../services/transactionApi';
import { TransferApi } from '../services/transferApi';
import type { ApiWorld } from '../support/world';
import { readJsonResponse } from '../utils/apiUtils';

/** Selects the configured source account for a transfer scenario. */
Given('source account exists', async function (this: ApiWorld) {
  const { customerId, transfer } = getApiTestData();
  this.sourceAccountId = await resolveCustomerAccountId(
    apiClientFor(this),
    this.customerId || customerId,
    transfer.sourceAccountId || getApiTestData().accountId
  );
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
 * Fetches both transfer accounts directly and resolves their current balances.
 * @param world Scenario state containing the customer and transfer account IDs.
 * @returns The current source and destination balances.
 */
async function loadBalancesAfterTransfer(world: ApiWorld): Promise<{ source: number; destination: number }> {
  const { customerId } = getApiTestData();
  const expectedCustomerId = world.customerId || customerId;
  const accountApi = new AccountApi(apiClientFor(world));
  const [source, destination] = await Promise.all([
    getTransferAccount(accountApi, world.sourceAccountId, expectedCustomerId),
    getTransferAccount(accountApi, world.destinationAccountId, expectedCustomerId)
  ]);
  return { source: source.balance, destination: destination.balance };
}

/**
 * Validates the configured source and destination accounts and captures their balances.
 * Creates a savings destination when the configured destination is unavailable.
 * @param world Scenario state to populate with selected accounts and baseline balances.
 */
async function resolveTransferAccounts(world: ApiWorld): Promise<void> {
  const { customerId, transfer } = getApiTestData();
  const client = apiClientFor(world);
  const accountApi = new AccountApi(client);
  const transactionApi = new TransactionApi(client);
  const expectedCustomerId = world.customerId || customerId;
  const requestedSourceId = world.sourceAccountId || transfer.sourceAccountId;
  const requestedDestinationId = world.destinationAccountId || transfer.destinationAccountId;
  let source = await getTransferAccount(accountApi, requestedSourceId, expectedCustomerId);
  if (source.balance < transfer.amount) {
    await transactionApi.seedWithDeposit(source.id, transfer.amount - source.balance);
    source = await getTransferAccount(accountApi, source.id, expectedCustomerId);
  }
  if (source.balance < transfer.amount) {
    throw new Error(`Source account ${source.id} still does not have enough balance for a ${transfer.amount} transfer after funding.`);
  }

  let destination: TransferAccountSnapshot | undefined;
  if (requestedDestinationId && requestedDestinationId !== source.id) {
    const response = await accountApi.getAccount(requestedDestinationId, [200, 400, 404]);
    if (response.status() === 200) {
      destination = await parseTransferAccount(response, expectedCustomerId);
    }
  }

  if (!destination) {
    const response = await accountApi.createAccount(expectedCustomerId, 'SAVINGS', source.id);
    destination = await parseTransferAccount(response, expectedCustomerId);
    if (destination.id === source.id) {
      throw new Error('ParaBank returned the source account as the newly created destination account.');
    }
  }

  world.sourceAccountId = source.id;
  world.destinationAccountId = destination.id;
  world.transferAmount = transfer.amount;
  world.sourceBalanceBeforeTransfer = source.balance;
  world.destinationBalanceBeforeTransfer = destination.balance;
}

interface TransferAccountSnapshot {
  id: string;
  type: 'CHECKING' | 'SAVINGS';
  balance: number;
}

/**
 * Retrieves and validates a transfer account owned by the selected customer.
 * @param accountApi Account service bound to the current scenario.
 * @param accountId Account identifier to read.
 * @param customerId Expected account owner.
 * @returns The account identifier, type, and current balance.
 */
async function getTransferAccount(
  accountApi: AccountApi,
  accountId: string,
  customerId: string
): Promise<TransferAccountSnapshot> {
  const response = await accountApi.getAccount(accountId);
  return parseTransferAccount(response, customerId);
}

/**
 * Parses and validates an account response needed by transfer setup and balance checks.
 * @param response Successful ParaBank account response.
 * @param customerId Expected account owner.
 * @returns A validated account snapshot.
 */
async function parseTransferAccount(
  response: Awaited<ReturnType<AccountApi['getAccount']>>,
  customerId: string
): Promise<TransferAccountSnapshot> {
  const payload = await readJsonResponse<unknown>(response);
  if (typeof payload !== 'object' || payload === null) {
    throw new Error(`Account ${response.url()} response was not an object.`);
  }

  const record = payload as Record<string, unknown>;
  const id = record.id;
  const type = record.type ?? record.accountType;
  const balance = Number(record.balance ?? record.availableBalance);
  if (
    (typeof id !== 'string' && typeof id !== 'number') ||
    String(id).trim() === '' ||
    String(record.customerId) !== customerId ||
    (type !== 'CHECKING' && type !== 'SAVINGS') ||
    !Number.isFinite(balance)
  ) {
    throw new Error(`Account response for customer ${customerId} is missing valid ownership, type, or balance data.`);
  }

  return { id: String(id), type, balance };
}

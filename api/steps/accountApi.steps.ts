import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import { AccountApi } from '../services/accountApi';
import { AuthenticationManager } from '../services/authenticationManager';
import { apiClientFor, getApiTestData } from '../services/apiHelpers';
import type { ApiWorld } from '../support/world';
import { readJsonResponse } from '../utils/apiUtils';

/** Selects the configured valid account for subsequent account steps. */
Given('a valid account exists', function (this: ApiWorld) {
  const { accountId } = getApiTestData();
  this.accountId = this.accountId || accountId || '12345';
  this.invalidAccountIdRequested = false;
});

/** Selects a known-invalid account ID for negative API assertions. */
Given('an invalid account id', function (this: ApiWorld) {
  this.accountId = '999999999';
  this.invalidAccountIdRequested = true;
});

/** Establishes a ParaBank web session using configured credentials. */
Given('user is logged into ParaBank', async function (this: ApiWorld) {
  await AuthenticationManager.login(
    apiClientFor(this),
    process.env.PARABANK_USERNAME ?? '',
    process.env.PARABANK_PASSWORD ?? ''
  );
});

/** Creates a savings account for the scenario's configured customer. */
When('user creates a new account', async function (this: ApiWorld) {
  await createCustomerAccount(this, 'SAVINGS');
});

/** Creates a savings account for the scenario's configured customer. */
When('user creates a savings account', async function (this: ApiWorld) {
  await createCustomerAccount(this, 'SAVINGS');
});

/** Creates a checking account for the scenario's configured customer. */
When('user creates a checking account', async function (this: ApiWorld) {
  await createCustomerAccount(this, 'CHECKING');
});

/**
 * Fetches the selected account, allowing expected invalid statuses for negative tests.
 * If the configured valid ID is stale, selects an account from the configured customer.
 */
When('user fetches account details', async function (this: ApiWorld) {
  const accountApi = new AccountApi(apiClientFor(this));
  const requestedAccountId = this.accountId || getApiTestData().accountId;
  if (this.invalidAccountIdRequested) {
    this.lastResponse = await accountApi.getAccount(requestedAccountId, [400, 404]);
    return;
  }

  try {
    this.lastResponse = await accountApi.getAccount(requestedAccountId);
    return;
  } catch (error) {
    const customerId = this.customerId || getApiTestData().customerId;
    const customerAccounts = await accountApi.getCustomerAccounts(customerId);
    const payload = await readJsonResponse<unknown>(customerAccounts);
    if (!Array.isArray(payload)) {
      throw error;
    }

    const firstAccount = payload.find((item): item is { id: string | number } =>
      typeof item === 'object' && item !== null && 'id' in item &&
      (typeof item.id === 'string' || typeof item.id === 'number') &&
      String(item.id).trim() !== ''
    );

    if (!firstAccount) {
      throw error;
    }

    this.accountId = String(firstAccount.id);
    this.lastResponse = await accountApi.getAccount(this.accountId);
  }
});

/** Retrieves the configured customer's account list. */
When("user fetches customer's accounts", async function (this: ApiWorld) {
  this.lastResponse = await new AccountApi(apiClientFor(this)).getCustomerAccounts(this.customerId);
});

/** Verifies that the account-creation response contains an account identifier. */
Then('account should be created successfully', async function (this: ApiWorld) {
  const payload = await readJsonResponse(this.lastResponse!);
  expect((payload as { id?: unknown }).id ?? (payload as { accountId?: unknown }).accountId).toBeTruthy();
});

/** Verifies that the account-details response contains an account identifier. */
Then('account information should be returned', async function (this: ApiWorld) {
  const payload = await readJsonResponse(this.lastResponse!);
  expect((payload as { id?: unknown }).id ?? (payload as { accountId?: unknown }).accountId).toBeTruthy();
});

/** Verifies that the account response includes a balance field. */
Then('account balance should be displayed', async function (this: ApiWorld) {
  const payload = await readJsonResponse(this.lastResponse!);
  const balance = (payload as { balance?: unknown }).balance ?? (payload as { availableBalance?: unknown }).availableBalance;
  expect(balance).toBeDefined();
});

/** Verifies that the returned account type is one of ParaBank's supported categories. */
Then('account type should be valid', async function (this: ApiWorld) {
  const payload = await readJsonResponse(this.lastResponse!);
  const accountType = (payload as { accountType?: string }).accountType ?? (payload as { type?: string }).type;
  expect(['CHECKING', 'SAVINGS', 'LOAN']).toContain(accountType ?? '');
});

/** Checks content type and validates owner, identifier, type, and balance for each account. */
Then('customer accounts should be returned with valid details', async function (this: ApiWorld) {
  const contentType = this.lastResponse!.headers()['content-type'] ?? '';
  expect(contentType).toContain('application/json');

  const payload = await readJsonResponse<unknown>(this.lastResponse!);
  expect(Array.isArray(payload)).toBe(true);
  if (!Array.isArray(payload)) return;
  expect(payload.length).toBeGreaterThan(0);

  const expectedCustomerId = this.customerId || getApiTestData().customerId;
  for (const account of payload as unknown[]) {
    expect(account).toBeTruthy();
    expect(typeof account).toBe('object');
    if (!account || typeof account !== 'object') continue;

    const record = account as Record<string, unknown>;
    expect(Number.isFinite(Number(record.id))).toBe(true);
    expect(Number(record.id)).toBeGreaterThan(0);
    expect(String(record.customerId)).toBe(expectedCustomerId);
    expect(['CHECKING', 'SAVINGS', 'LOAN']).toContain(record.type);
    expect(record.balance).not.toBeNull();
    expect(['number', 'string']).toContain(typeof record.balance);
    if (typeof record.balance === 'string') expect(record.balance.trim()).not.toBe('');
    const balance = Number(record.balance);
    expect(Number.isFinite(balance)).toBe(true);
  }
});

/**
 * Selects a funding account, creates the requested account, and stores its returned ID.
 * @param world Current scenario state for response and account tracking.
 * @param accountType Type of account to create.
 */
async function createCustomerAccount(world: ApiWorld, accountType: 'CHECKING' | 'SAVINGS'): Promise<void> {
  const accountApi = new AccountApi(apiClientFor(world));
  const customerId = world.customerId || getApiTestData().customerId;
  const preferredAccountId = world.accountId || getApiTestData().accountId;
  const fundingAccountId = await resolveFundingAccountId(accountApi, customerId, preferredAccountId);
  world.lastResponse = await accountApi.createAccount(customerId, accountType, fundingAccountId);
  world.sourceAccountId = fundingAccountId;
  world.e2eResponses.push(world.lastResponse);

  const payload = await readJsonResponse<{ id?: string | number; accountId?: string | number }>(world.lastResponse);
  const createdAccountId = payload.id ?? payload.accountId;
  if (createdAccountId === undefined || createdAccountId === null || String(createdAccountId).trim() === '') {
    throw new Error('Account creation response did not include a valid account identifier.');
  }
  world.accountId = String(createdAccountId);
}

/**
 * Chooses the preferred eligible account or the highest-balance checking/savings account.
 * @param accountApi Service used to retrieve the customer's accounts.
 * @param customerId Owner whose eligible accounts are considered.
 * @param preferredAccountId Preferred configured funding account.
 * @returns The selected funding account ID.
 */
async function resolveFundingAccountId(
  accountApi: AccountApi,
  customerId: string,
  preferredAccountId: string
): Promise<string> {
  const accounts = await readJsonResponse<unknown>(await accountApi.getCustomerAccounts(customerId));
  if (!Array.isArray(accounts)) {
    throw new Error(`Could not select a funding account: customer ${customerId} accounts response was not an array.`);
  }

  const eligibleAccounts: Array<{ id: string; balance: number }> = [];
  for (const account of accounts) {
    if (typeof account !== 'object' || account === null) continue;

    const record = account as Record<string, unknown>;
    const id = record.id;
    const ownerId = record.customerId;
    const type = record.type ?? record.accountType;
    const balance = Number(record.balance ?? record.availableBalance);
    if (
      (typeof id === 'string' || typeof id === 'number') &&
      String(id).trim() !== '' &&
      String(ownerId) === customerId &&
      (type === 'CHECKING' || type === 'SAVINGS') &&
      Number.isFinite(balance)
    ) {
      eligibleAccounts.push({ id: String(id), balance });
    }
  }

  const preferred = eligibleAccounts.find((account) => account.id === preferredAccountId);
  if (preferred) return preferred.id;

  eligibleAccounts.sort((left, right) => right.balance - left.balance);
  const fundingAccount = eligibleAccounts[0];
  if (!fundingAccount) {
    throw new Error(`Customer ${customerId} has no CHECKING or SAVINGS account available to fund a new account.`);
  }
  return fundingAccount.id;
}

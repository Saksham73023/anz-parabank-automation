import { Then, When } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import { AccountApi } from '../services/accountApi';
import { BillPayApi } from '../services/billPayApi';
import { apiClientFor, getApiTestData } from '../services/apiHelpers';
import { TransactionApi } from '../services/transactionApi';
import { TransferApi } from '../services/transferApi';
import type { ApiWorld } from '../support/world';
import { readJsonResponse } from '../utils/apiUtils';

When('user seeds account transactions', async function (this: ApiWorld) {
  const accountId = this.accountId || getApiTestData().accountId;
  const accountApi = new AccountApi(apiClientFor(this));
  const transactionApi = new TransactionApi(apiClientFor(this));
  const account = await readJsonResponse<Record<string, unknown>>(await accountApi.getAccount(accountId));
  const openingBalance = getBalance(account);
  const history = await readJsonResponse<unknown>(await transactionApi.getAccountTransactions(accountId));
  if (!Array.isArray(history)) {
    throw new Error('Transaction history must be an array before seeding the E2E flow.');
  }
  const initialTransactions = transactionRecords(history);

  const { transfer, billPay } = getApiTestData();
  const seedAmount = Number(process.env.API_E2E_SEED_AMOUNT ?? 100);
  if (!Number.isFinite(seedAmount) || seedAmount <= transfer.amount + billPay.amount) {
    throw new RangeError('API_E2E_SEED_AMOUNT must be greater than the transfer and bill-pay amounts combined.');
  }
  this.e2eOpeningBalance = openingBalance;
  this.e2eSeedAmount = seedAmount;
  this.e2eInitialTransactionCount = initialTransactions.length;
  this.e2eInitialTransactionIds = initialTransactions.map((transaction) => transaction.id);
  this.lastResponse = await transactionApi.seedWithDeposit(accountId, seedAmount);
  this.e2eResponses.push(this.lastResponse);
});

When('user completes a transfer between accounts', async function (this: ApiWorld) {
  const { customerId, transfer, billPay } = getApiTestData();
  const sourceAccountId = this.accountId || getApiTestData().accountId;
  const accounts = await readJsonResponse<unknown>(
    await new AccountApi(apiClientFor(this)).getCustomerAccounts(this.customerId || customerId)
  );
  if (!Array.isArray(accounts)) {
    throw new Error('Customer accounts response must be an array to select the E2E transfer destination.');
  }

  const candidates: Array<{ id: string; balance: number }> = [];
  for (const account of accounts) {
    if (typeof account !== 'object' || account === null) continue;
    const record = account as Record<string, unknown>;
    const id = record.id;
    const balance = Number(record.balance ?? record.availableBalance);
    const type = record.type ?? record.accountType;
    if (
      (typeof id === 'string' || typeof id === 'number') &&
      String(id) !== sourceAccountId &&
      (type === 'CHECKING' || type === 'SAVINGS') &&
      Number.isFinite(balance)
    ) {
      candidates.push({ id: String(id), balance });
    }
  }

  const destination = candidates.find((account) => account.id === transfer.destinationAccountId)
    ?? candidates[0];
  if (!destination) {
    throw new Error(`Customer ${this.customerId || customerId} needs another account to reconcile the E2E transfer.`);
  }
  const amountAvailable = (this.e2eOpeningBalance ?? 0) + (this.e2eSeedAmount ?? 0);
  if (amountAvailable <= transfer.amount + billPay.amount) {
    throw new Error('The E2E source account does not have enough seeded funds for both transfer and bill payment.');
  }

  this.sourceAccountId = sourceAccountId;
  this.destinationAccountId = destination.id;
  this.transferAmount = transfer.amount;
  this.e2eDestinationOpeningBalance = destination.balance;
  this.lastResponse = await new TransferApi(apiClientFor(this)).transfer({
    sourceAccountId,
    destinationAccountId: destination.id,
    amount: transfer.amount
  });
  this.e2eResponses.push(this.lastResponse);
});

When('user pays a bill', async function (this: ApiWorld) {
  const { billPay } = getApiTestData();
  this.lastResponse = await new BillPayApi(apiClientFor(this)).payBill({
    accountId: this.accountId || billPay.accountId,
    payeeName: billPay.payeeName,
    address: billPay.address,
    city: billPay.city,
    state: billPay.state,
    zipCode: billPay.zipCode,
    phoneNumber: billPay.phoneNumber,
    amount: billPay.amount
  });
  this.e2eResponses.push(this.lastResponse);
});

Then('all api responses should be successful', function (this: ApiWorld) {
  expect(this.e2eResponses.length).toBe(4);
  for (const response of this.e2eResponses) {
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(300);
  }
});

Then('account balances and transaction history should reconcile', async function (this: ApiWorld) {
  if (
    this.e2eOpeningBalance === undefined ||
    this.e2eDestinationOpeningBalance === undefined ||
    this.e2eSeedAmount === undefined ||
    this.e2eInitialTransactionCount === undefined ||
    this.e2eInitialTransactionIds === undefined
  ) {
    throw new Error('The E2E flow is missing balances or transaction history captured before its mutations.');
  }

  const { transfer, billPay } = getApiTestData();
  const accountApi = new AccountApi(apiClientFor(this));
  const transactionsApi = new TransactionApi(apiClientFor(this));
  const sourceResponse = await accountApi.getAccount(this.sourceAccountId);
  const destinationResponse = await accountApi.getAccount(this.destinationAccountId);
  const transactionResponse = await transactionsApi.getAccountTransactions(this.sourceAccountId);
  const sourceBalance = getBalance(await readJsonResponse<Record<string, unknown>>(sourceResponse));
  const destinationBalance = getBalance(await readJsonResponse<Record<string, unknown>>(destinationResponse));
  const history = await readJsonResponse<unknown>(transactionResponse);
  if (!Array.isArray(history)) {
    throw new Error('Final transaction history must be a JSON array for reconciliation.');
  }
  const finalTransactions = transactionRecords(history);
  const initialTransactionIds = new Set(this.e2eInitialTransactionIds);
  const newTransactions = finalTransactions.filter((transaction) => !initialTransactionIds.has(transaction.id));

  const expectedSource = this.e2eOpeningBalance + this.e2eSeedAmount - transfer.amount - billPay.amount;
  const expectedDestination = this.e2eDestinationOpeningBalance + transfer.amount;
  expect(toCents(sourceBalance)).toBe(toCents(expectedSource));
  expect(toCents(destinationBalance)).toBe(toCents(expectedDestination));
  expect(finalTransactions.length).toBeGreaterThanOrEqual(this.e2eInitialTransactionCount + 3);
  expect(newTransactions.length).toBeGreaterThanOrEqual(3);
  const reconciledTransactionIds = new Set<string>();
  for (const expectedAmount of [this.e2eSeedAmount, transfer.amount, billPay.amount]) {
    const transaction = newTransactions.find((candidate) =>
      !reconciledTransactionIds.has(candidate.id) &&
      Math.abs(toCents(candidate.amount)) === toCents(expectedAmount)
    );
    expect(transaction, `No distinct new transaction was recorded for amount ${expectedAmount}.`).toBeDefined();
    if (transaction) reconciledTransactionIds.add(transaction.id);
  }
});

function getBalance(account: Record<string, unknown>): number {
  const balance = Number(account.balance ?? account.availableBalance);
  if (!Number.isFinite(balance)) {
    throw new Error('Account response did not contain a finite balance.');
  }
  return balance;
}

function transactionRecords(value: unknown[]): Array<{ id: string; amount: number }> {
  return value.map((item) => {
    if (typeof item !== 'object' || item === null) {
      throw new Error('Transaction history contains a non-object record.');
    }
    const record = item as Record<string, unknown>;
    const id = record.id;
    const amount = Number(record.amount);
    if ((typeof id !== 'string' && typeof id !== 'number') || String(id).trim() === '') {
      throw new Error('Transaction history contains a record without a valid ID.');
    }
    if (!Number.isFinite(amount)) {
      throw new Error(`Transaction ${String(id)} does not contain a finite amount.`);
    }
    return { id: String(id), amount };
  });
}

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

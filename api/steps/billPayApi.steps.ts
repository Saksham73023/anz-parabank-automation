import { Then, When } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import { AccountApi } from '../services/accountApi';
import { BillPayApi } from '../services/billPayApi';
import { TransactionApi } from '../services/transactionApi';
import { apiClientFor, getApiTestData } from '../services/apiHelpers';
import type { ApiWorld } from '../support/world';
import { readJsonResponse } from '../utils/apiUtils';

/** Validates the configured account and submits the bill-payment request. */
When('user submits bill payment request', async function (this: ApiWorld) {
  const { billPay, customerId } = getApiTestData();
  const client = apiClientFor(this);
  const accountId = await resolveBillPayAccountId(
    new AccountApi(client),
    new TransactionApi(client),
    customerId,
    billPay.accountId,
    billPay.amount
  );
  this.accountId = accountId;
  this.lastResponse = await new BillPayApi(apiClientFor(this)).payBill({
    accountId,
    payeeName: billPay.payeeName,
    address: billPay.address,
    city: billPay.city,
    state: billPay.state,
    zipCode: billPay.zipCode,
    phoneNumber: billPay.phoneNumber,
    amount: billPay.amount
  });
});

/** Verifies the bill-payment confirmation's payee, amount, and funding account. */
Then('payment confirmation should be generated', async function (this: ApiWorld) {
  const payload = await readJsonResponse<{
    payeeName?: unknown;
    amount?: unknown;
    accountId?: unknown;
  }>(this.lastResponse!);
  const { billPay } = getApiTestData();

  expect(payload.payeeName).toBe(billPay.payeeName);
  expect(Number(payload.amount)).toBe(billPay.amount);
  expect(String(payload.accountId)).toBe(this.accountId);
});

/** Confirms that a payment response payload was captured for balance validation. */
Then('account balance should be reduced', async function (this: ApiWorld) {
  const payload = await readJsonResponse(this.lastResponse!);
  expect(payload).toBeTruthy();
});

/**
 * Validates the configured bill-pay account and its available balance.
 * @param accountApi Service used to retrieve the configured account.
 * @param customerId Expected account owner.
 * @param preferredAccountId Configured account to use for payment.
 * @param amount Minimum balance required for the payment.
 * @returns The validated funding account ID.
 */
async function resolveBillPayAccountId(
  accountApi: AccountApi,
  transactionApi: TransactionApi,
  customerId: string,
  preferredAccountId: string,
  amount: number
): Promise<string> {
  if (!preferredAccountId.trim()) {
    throw new Error('API_BILLPAY_ACCOUNT_ID must be configured before submitting a bill payment.');
  }

  const response = await accountApi.getAccount(preferredAccountId, [200, 400, 404]);
  if (response.status() !== 200) {
    throw new Error(`Configured bill-pay account ${preferredAccountId} was not found; set API_BILLPAY_ACCOUNT_ID to a valid account.`);
  }

  const payload = await readJsonResponse<unknown>(response);
  if (typeof payload !== 'object' || payload === null) {
    throw new Error(`Configured bill-pay account ${preferredAccountId} returned an invalid response.`);
  }

  const record = payload as Record<string, unknown>;
  const id = record.id;
  const accountType = record.type ?? record.accountType;
  let balance = Number(record.balance ?? record.availableBalance);
  if (
    (typeof id !== 'string' && typeof id !== 'number') ||
    String(record.customerId) !== customerId ||
    (accountType !== 'CHECKING' && accountType !== 'SAVINGS')
  ) {
    throw new Error(`Configured account ${preferredAccountId} is not eligible for bill payment by customer ${customerId}.`);
  }
  if (!Number.isFinite(balance)) {
    throw new Error(`Configured bill-pay account ${String(id)} does not contain a valid balance.`);
  }
  if (balance < amount) {
    await transactionApi.seedWithDeposit(String(id), amount - balance);
    const refreshed = await readJsonResponse<Record<string, unknown>>(await accountApi.getAccount(String(id)));
    balance = Number(refreshed.balance ?? refreshed.availableBalance);
  }
  if (!Number.isFinite(balance) || balance < amount) {
    throw new Error(`Configured bill-pay account ${String(id)} still does not have enough balance for a ${amount} payment after funding.`);
  }
  return String(id);
}

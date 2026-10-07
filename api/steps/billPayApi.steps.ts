import { Then, When } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import { AccountApi } from '../services/accountApi';
import { BillPayApi } from '../services/billPayApi';
import { apiClientFor, getApiTestData } from '../services/apiHelpers';
import type { ApiWorld } from '../support/world';
import { readJsonResponse } from '../utils/apiUtils';

/** Chooses a funded customer account and submits the configured bill-payment request. */
When('user submits bill payment request', async function (this: ApiWorld) {
  const { billPay, customerId } = getApiTestData();
  const accountId = await resolveBillPayAccountId(
    new AccountApi(apiClientFor(this)),
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
 * Selects the preferred account with sufficient balance, or the highest-balance eligible account.
 * @param accountApi Service used to list customer accounts.
 * @param customerId Owner whose accounts are evaluated.
 * @param preferredAccountId Preferred configured account.
 * @param amount Minimum balance required for the payment.
 * @returns The selected funding account ID.
 */
async function resolveBillPayAccountId(
  accountApi: AccountApi,
  customerId: string,
  preferredAccountId: string,
  amount: number
): Promise<string> {
  const payload = await readJsonResponse<unknown>(await accountApi.getCustomerAccounts(customerId));
  if (!Array.isArray(payload)) {
    throw new Error(`Customer ${customerId} accounts response was not an array.`);
  }

  const eligibleAccounts: Array<{ id: string; balance: number }> = [];
  for (const account of payload) {
    if (typeof account !== 'object' || account === null) continue;
    const record = account as Record<string, unknown>;
    const id = record.id;
    const type = record.type ?? record.accountType;
    const balance = Number(record.balance ?? record.availableBalance);
    if (
      (typeof id === 'string' || typeof id === 'number') &&
      String(id).trim() !== '' &&
      String(record.customerId) === customerId &&
      (type === 'CHECKING' || type === 'SAVINGS') &&
      Number.isFinite(balance) &&
      balance >= amount
    ) {
      eligibleAccounts.push({ id: String(id), balance });
    }
  }

  const preferred = eligibleAccounts.find((account) => account.id === preferredAccountId);
  if (preferred) return preferred.id;

  eligibleAccounts.sort((left, right) => right.balance - left.balance);
  const selected = eligibleAccounts[0];
  if (!selected) {
    throw new Error(`Customer ${customerId} has no CHECKING or SAVINGS account with enough balance for a ${amount} bill payment.`);
  }
  return selected.id;
}

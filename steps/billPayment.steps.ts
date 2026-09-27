import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import { BillPaymentPage, BillPaymentSubmission } from '../pages/billPayment.page';
import { LedgerEntry, TransferFundsPage } from '../pages/transferFunds.page';
import {
  billPaymentErrorPatterns,
  billPaymentFieldByLabel,
  batchBillPayments,
  BillPaymentData,
  BillPaymentField,
  invalidAmountByValue,
  invalidBillPaymentData,
  validBillPaymentData
} from '../support/testDataHelper';
import { CustomWorld } from '../support/world';

interface BillPaymentWorld extends CustomWorld {
  billPaymentSubmissions?: BillPaymentSubmission[];
  billPaymentAccountId?: string;
  expectedPaymentCount?: number;
}

const billPaymentScenarios = {
  valid: validBillPaymentData
} satisfies Record<string, BillPaymentData>;

function paymentPage(world: BillPaymentWorld): BillPaymentPage {
  return new BillPaymentPage(world.page!);
}

function fieldForLabel(label: string): BillPaymentField {
  const field = billPaymentFieldByLabel[label as keyof typeof billPaymentFieldByLabel];
  if (!field) throw new Error(`Unsupported bill-payment field: ${label}`);
  return field;
}

async function submitPayment(
  world: BillPaymentWorld,
  data: Partial<BillPaymentData>,
  accountId?: string
): Promise<void> {
  await submitPayments(world, [data], accountId);
}

async function submitPayments(
  world: BillPaymentWorld,
  payments: readonly Partial<BillPaymentData>[],
  accountId?: string
): Promise<void> {
  const submissions = await paymentPage(world).submitBillPayments(payments, accountId);
  world.billPaymentSubmissions ??= [];
  world.billPaymentSubmissions.push(...submissions);
  world.billPaymentAccountId = submissions.at(-1)?.fundingAccountId ?? accountId;
}

async function submitAmount(world: BillPaymentWorld, amount: string): Promise<void> {
  const data = invalidAmountByValue[amount] ?? { ...validBillPaymentData, amount };
  await submitPayment(world, data);
}

function latestSubmission(world: BillPaymentWorld): BillPaymentSubmission {
  const submission = world.billPaymentSubmissions?.at(-1);
  if (!submission) throw new Error('No bill-payment submission is available for this scenario.');
  return submission;
}

async function verifyPaymentTransactions(world: BillPaymentWorld): Promise<void> {
  const submissions = world.billPaymentSubmissions ?? [];
  const accountId = world.billPaymentAccountId;
  if (!accountId || submissions.length === 0) {
    throw new Error('Bill-payment transaction data is unavailable.');
  }

  const ledgerEntries: LedgerEntry[] = await new TransferFundsPage(world.page!).getLedgerEntries(accountId);
  const unmatchedDebits = ledgerEntries.filter((entry) => entry.type === 'debit').map((entry) => entry.amount);
  const recordedAmounts: number[] = [];

  for (const submission of submissions) {
    const index = unmatchedDebits.findIndex((amount) => Math.abs(amount - submission.amount) < 0.01);
    if (index < 0) {
      throw new Error(`Bill-payment amount ${submission.amount.toFixed(2)} was not found in account activity.`);
    }
    recordedAmounts.push(unmatchedDebits.splice(index, 1)[0]);
  }

  const expectedTotal = submissions.reduce((total, submission) => total + submission.amount, 0);
  const recordedTotal = recordedAmounts.reduce((total, amount) => total + amount, 0);
  expect(recordedTotal).toBeCloseTo(expectedTotal, 2);
}

Given('user navigates to Bill Payment page', async function (this: BillPaymentWorld) {
  await paymentPage(this).open();
});

When('user submits bill payment with {string} data', async function (this: BillPaymentWorld, dataKey: string) {
  const data = billPaymentScenarios[dataKey as keyof typeof billPaymentScenarios];
  if (!data) throw new Error(`Unknown bill-payment dataset: ${dataKey}`);
  await submitPayment(this, data);
});

Then('payment should be successful', async function (this: BillPaymentWorld) {
  expect(latestSubmission(this).success).toBe(true);
  await paymentPage(this).verifyPaymentSuccessful();
});

When('user submits bill payment with {string} blank', async function (this: BillPaymentWorld, label: string) {
  const field = fieldForLabel(label);
  await submitPayment(this, { ...validBillPaymentData, [field]: '' });
});

Then('validation message should be displayed for {string}', async function (this: BillPaymentWorld, label: string) {
  await paymentPage(this).verifyRequiredField(fieldForLabel(label));
});

When('user submits bill payment with mismatched account numbers', async function (this: BillPaymentWorld) {
  await submitPayment(this, invalidBillPaymentData.mismatchedAccount);
});

Then('account mismatch validation should be displayed', async function (this: BillPaymentWorld) {
  await paymentPage(this).verifyPaymentError(billPaymentErrorPatterns.accountMismatch);
});

When('user submits bill payment with amount {string}', async function (this: BillPaymentWorld, amount: string) {
  await submitAmount(this, amount);
});

Then('amount validation should be displayed', async function (this: BillPaymentWorld) {
  await paymentPage(this).verifyPaymentError(billPaymentErrorPatterns.amount);
});

When('user submits bill payment with blank amount', async function (this: BillPaymentWorld) {
  await submitPayment(this, invalidBillPaymentData.blankAmount);
});

Then('invalid amount error should be displayed', async function (this: BillPaymentWorld) {
  await paymentPage(this).verifyPaymentError(billPaymentErrorPatterns.invalidAmount);
});

When('user submits bill payment with amount exceeding balance', async function (this: BillPaymentWorld) {
  const page = paymentPage(this);
  const accountId = await page.selectFundingAccount();
  const balance = await new TransferFundsPage(this.page!).getAccountBalance(accountId);
  await submitPayment(this, { ...validBillPaymentData, amount: (balance + 1).toFixed(2) }, accountId);
});

Then('insufficient fund message should be displayed', async function (this: BillPaymentWorld) {
  await paymentPage(this).verifyPaymentError(billPaymentErrorPatterns.insufficientFunds);
});

When('user pays the same biller twice', async function (this: BillPaymentWorld) {
  await submitPayments(this, [validBillPaymentData, validBillPaymentData]);
});

Then('two successful payment transactions should be recorded', async function (this: BillPaymentWorld) {
  const submissions = this.billPaymentSubmissions ?? [];
  expect(submissions).toHaveLength(2);
  expect(submissions.every((submission) => submission.success)).toBe(true);
  await verifyPaymentTransactions(this);
});

When('user performs bill payments using TypeScript data', async function (this: BillPaymentWorld) {
  this.expectedPaymentCount = batchBillPayments.length;
  await submitPayments(this, batchBillPayments);
});

Then('all bill payments should be successful', async function (this: BillPaymentWorld) {
  const submissions = this.billPaymentSubmissions ?? [];
  expect(submissions).toHaveLength(this.expectedPaymentCount ?? submissions.length);
  expect(submissions.length).toBeGreaterThan(0);
  expect(submissions.every((submission) => submission.success)).toBe(true);
});

Then('transaction total should match account activity', async function (this: BillPaymentWorld) {
  await verifyPaymentTransactions(this);
});
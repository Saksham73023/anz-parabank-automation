import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import { BillPaymentPage, BillPaymentSubmission } from '../pages/billPayment.page';
import { TransferFundsPage } from '../pages/transferFunds.page';
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

/** Scenario state for captured bill-payment submissions and expected batch totals. */
interface BillPaymentWorld extends CustomWorld {
  billPaymentSubmissions?: BillPaymentSubmission[];
  billPaymentAccountId?: string;
  expectedPaymentCount?: number;
}

/** Named bill-payment datasets selectable by Gherkin scenario steps. */
const billPaymentScenarios = {
  valid: validBillPaymentData
} satisfies Record<string, BillPaymentData>;

/** Returns a bill-payment page object bound to the current scenario page. */
function paymentPage(world: BillPaymentWorld): BillPaymentPage {
  return new BillPaymentPage(world.page!);
}

/** Resolves a Gherkin field label to a supported typed bill-payment field. */
function fieldForLabel(label: string): BillPaymentField {
  const field = billPaymentFieldByLabel[label as keyof typeof billPaymentFieldByLabel];
  if (!field) throw new Error(`Unsupported bill-payment field: ${label}`);
  return field;
}

/** Submits one bill payment and records its result in scenario state. */
async function submitPayment(
  world: BillPaymentWorld,
  data: Partial<BillPaymentData>,
  accountId?: string
): Promise<void> {
  await submitPayments(world, [data], accountId);
}

/** Submits a payment batch and accumulates each UI result for later assertions. */
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

/** Selects a configured invalid-amount case or builds valid payment data with the supplied amount. */
async function submitAmount(world: BillPaymentWorld, amount: string): Promise<void> {
  const data = invalidAmountByValue[amount] ?? { ...validBillPaymentData, amount };
  await submitPayment(world, data);
}

/** Returns the most recent bill-payment result or fails when no payment was submitted. */
function latestSubmission(world: BillPaymentWorld): BillPaymentSubmission {
  const submission = world.billPaymentSubmissions?.at(-1);
  if (!submission) throw new Error('No bill-payment submission is available for this scenario.');
  return submission;
}

/** Validates each payment confirmation, its funding account, and the aggregate confirmed amount. */
async function verifyPaymentConfirmations(world: BillPaymentWorld): Promise<void> {
  const submissions = world.billPaymentSubmissions ?? [];
  expect(submissions).toHaveLength(world.expectedPaymentCount ?? submissions.length);
  expect(submissions.length).toBeGreaterThan(0);
  const expectedTotal = submissions.reduce((total, submission) => total + submission.amount, 0);
  let confirmedTotal = 0;
  for (const submission of submissions) {
    expect(submission.success).toBe(true);
    const confirmation = submission.message.match(/in the amount of \$([\d,]+(?:\.\d{2})?) from account (\d+) was successful/i);
    if (!confirmation) throw new Error(`Bill-payment confirmation is missing its amount or account: ${submission.message}`);
    expect(confirmation[2]).toBe(submission.fundingAccountId);
    confirmedTotal += Number(confirmation[1].replace(/,/g, ''));
  }

  expect(confirmedTotal).toBeCloseTo(expectedTotal, 2);
}

/**
 * Prepares scenario state and the browser UI for the Gherkin step "user navigates to Bill Payment page" using the Web page objects.
 */

Given('user navigates to Bill Payment page', async function (this: BillPaymentWorld) {
  await paymentPage(this).open();
});

/**
 * Performs the requested browser interaction for the Gherkin step "user submits bill payment with {string} data" using the Web page objects.
 * @param dataKey Fixture or input value selected by the Gherkin step.
 */

When('user submits bill payment with {string} data', async function (this: BillPaymentWorld, dataKey: string) {
  const data = billPaymentScenarios[dataKey as keyof typeof billPaymentScenarios];
  if (!data) throw new Error(`Unknown bill-payment dataset: ${dataKey}`);
  await submitPayment(this, data);
});

/**
 * Verifies the expected application result for the Gherkin step "payment should be successful" using the Web page objects.
 */

Then('payment should be successful', async function (this: BillPaymentWorld) {
  expect(latestSubmission(this).success).toBe(true);
  await paymentPage(this).verifyPaymentSuccessful();
});

/**
 * Performs the requested browser interaction for the Gherkin step "user submits bill payment with {string} blank" using the Web page objects.
 * @param label Visible field label captured from the Gherkin step.
 */

When('user submits bill payment with {string} blank', async function (this: BillPaymentWorld, label: string) {
  const field = fieldForLabel(label);
  await submitPayment(this, { ...validBillPaymentData, [field]: '' });
});

/**
 * Verifies the expected application result for the Gherkin step "validation message should be displayed for {string}" using the Web page objects.
 * @param label Visible field label captured from the Gherkin step.
 */

Then('validation message should be displayed for {string}', async function (this: BillPaymentWorld, label: string) {
  await paymentPage(this).verifyRequiredField(fieldForLabel(label));
});

/**
 * Performs the requested browser interaction for the Gherkin step "user submits bill payment with mismatched account numbers" using the Web page objects.
 */

When('user submits bill payment with mismatched account numbers', async function (this: BillPaymentWorld) {
  await submitPayment(this, invalidBillPaymentData.mismatchedAccount);
});

/**
 * Verifies the expected application result for the Gherkin step "account mismatch validation should be displayed" using the Web page objects.
 */

Then('account mismatch validation should be displayed', async function (this: BillPaymentWorld) {
  await paymentPage(this).verifyPaymentError(billPaymentErrorPatterns.accountMismatch);
});

/**
 * Performs the requested browser interaction for the Gherkin step "user submits bill payment with amount {string}" using the Web page objects.
 * @param amount Monetary value captured from the Gherkin step.
 */

When('user submits bill payment with amount {string}', async function (this: BillPaymentWorld, amount: string) {
  await submitAmount(this, amount);
});

/**
 * Verifies the expected application result for the Gherkin step "amount validation should be displayed" using the Web page objects.
 */

Then('amount validation should be displayed', async function (this: BillPaymentWorld) {
  await paymentPage(this).verifyPaymentError(billPaymentErrorPatterns.amount);
});

/**
 * Performs the requested browser interaction for the Gherkin step "user submits bill payment with blank amount" using the Web page objects.
 */

When('user submits bill payment with blank amount', async function (this: BillPaymentWorld) {
  await submitPayment(this, invalidBillPaymentData.blankAmount);
});

/**
 * Verifies the expected application result for the Gherkin step "invalid amount error should be displayed" using the Web page objects.
 */

Then('invalid amount error should be displayed', async function (this: BillPaymentWorld) {
  await paymentPage(this).verifyPaymentError(billPaymentErrorPatterns.invalidAmount);
});

/**
 * Verifies the expected application result for the Gherkin step "Then amount cannot be empty message should be displayed" using the Web page objects.
 */

Then('Then amount cannot be empty message should be displayed', async function (this: BillPaymentWorld) {
  await paymentPage(this).verifyPaymentError(billPaymentErrorPatterns.amountEmpty);
});

/**
 * Performs the requested browser interaction for the Gherkin step "user submits bill payment with amount exceeding balance" using the Web page objects.
 */

When('user submits bill payment with amount exceeding balance', async function (this: BillPaymentWorld) {
  const page = paymentPage(this);
  const accountId = await page.selectFundingAccount();
  const balance = await new TransferFundsPage(this.page!).getAccountBalance(accountId);
  await submitPayment(this, { ...validBillPaymentData, amount: (balance + 1).toFixed(2) }, accountId);
});

/**
 * Verifies the expected application result for the Gherkin step "insufficient fund message should be displayed" using the Web page objects.
 */

Then('insufficient fund message should be displayed', async function (this: BillPaymentWorld) {
  await paymentPage(this).verifyPaymentError(billPaymentErrorPatterns.insufficientFunds);
});

/**
 * Performs the requested browser interaction for the Gherkin step "user pays the same biller twice" using the Web page objects.
 */

When('user pays the same biller twice', async function (this: BillPaymentWorld) {
  await submitPayments(this, [validBillPaymentData, validBillPaymentData]);
});

/**
 * Verifies the expected application result for the Gherkin step "both bill payments should be confirmed" using the Web page objects.
 */

Then('both bill payments should be confirmed', async function (this: BillPaymentWorld) {
  const submissions = this.billPaymentSubmissions ?? [];
  expect(submissions).toHaveLength(2);
  await verifyPaymentConfirmations(this);
});

/**
 * Performs the requested browser interaction for the Gherkin step "user performs bill payments using TypeScript data" using the Web page objects.
 */

When('user performs bill payments using TypeScript data', async function (this: BillPaymentWorld) {
  this.expectedPaymentCount = batchBillPayments.length;
  await submitPayments(this, batchBillPayments);
});

/**
 * Verifies the expected application result for the Gherkin step "all bill payments should be successful" using the Web page objects.
 */

Then('all bill payments should be successful', async function (this: BillPaymentWorld) {
  const submissions = this.billPaymentSubmissions ?? [];
  expect(submissions).toHaveLength(this.expectedPaymentCount ?? submissions.length);
  expect(submissions.length).toBeGreaterThan(0);
  expect(submissions.every((submission) => submission.success)).toBe(true);
});

/**
 * Verifies the expected application result for the Gherkin step "confirmed payment total should match batch total" using the Web page objects.
 */

Then('confirmed payment total should match batch total', async function (this: BillPaymentWorld) {
  await verifyPaymentConfirmations(this);
});
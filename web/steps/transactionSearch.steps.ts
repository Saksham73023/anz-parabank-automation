import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import { BillPaymentPage } from '../pages/billPayment.page';
import { LoginPage } from '../pages/login.page';
import { TransactionSearchPage } from '../pages/transactionSearch.page';
import { getLoginCredentials, validBillPaymentData } from '../support/testDataHelper';
import { CustomWorld } from '../support/world';

/** Returns the transaction-search page object and validates page initialization. */
function transactionPage(world: CustomWorld): TransactionSearchPage {
  if (!world.page) throw new Error('Browser page is not initialized for this scenario.');
  return new TransactionSearchPage(world.page);
}

/** Formats a date in the month-day-year format expected by ParaBank search controls. */
function formatDate(date: Date): string {
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${date.getFullYear()}`;
}

/** Returns today's date shifted by the requested number of calendar days. */
function currentDateOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

/** Resolves supported date aliases to ParaBank's expected date format. */
function resolveSearchDate(value: string): string {
  const today = new Date();
  if (value === 'TODAY') return formatDate(today);
  if (value === 'YESTERDAY') return currentDateOffset(-1);
  if (value === 'CURRENT_MONTH_START') return formatDate(new Date(today.getFullYear(), today.getMonth(), 1));
  if (value === 'CURRENT_YEAR_START') return formatDate(new Date(today.getFullYear(), 0, 1));
  return value;
}

/** Creates a minimal bill payment so date-based transaction searches have a known record. */
async function seedDateSearchTransaction(world: CustomWorld): Promise<void> {
  const payment = await new BillPaymentPage(world.page!).submitBillPayment({
    ...validBillPaymentData,
    amount: '0.01'
  });
  if (!payment.success) throw new Error(`Unable to seed a date-search transaction: ${payment.message}`);
  await transactionPage(world).selectAccount(payment.fundingAccountId);
}

/** Creates distinct payments for an amount query and selects the account used for those payments. */
async function recordPaymentsAndSearchAmount(world: CustomWorld, amount: string, count: number): Promise<void> {
  const paymentPage = new BillPaymentPage(world.page!);
  const fundingAccountId = await paymentPage.selectFundingAccount();
  const payments = Array.from({ length: count }, (_, index) => ({
    ...validBillPaymentData,
    amount,
    payeeName: `${validBillPaymentData.payeeName} ${index + 1}`,
    accountNumber: String(Number(validBillPaymentData.accountNumber) + index),
    verifyAccount: String(Number(validBillPaymentData.verifyAccount) + index)
  }));
  const submissions = await paymentPage.submitBillPayments(payments, fundingAccountId);
  const failedPayment = submissions.find((submission) => !submission.success);
  if (failedPayment) throw new Error(`Unable to seed amount-search transaction: ${failedPayment.message}`);

  const page = transactionPage(world);
  await page.selectAccount(fundingAccountId);
  await page.searchByAmount(amount);
}

/**
 * Prepares scenario state and the browser UI for the Gherkin step "user is logged into ParaBank application" using the Web page objects.
 */

Given('user is logged into ParaBank application', async function (this: CustomWorld) {
  const credentials = getLoginCredentials();
  const username = process.env.PARABANK_USERNAME?.trim() || credentials.username;
  const password = process.env.PARABANK_PASSWORD || credentials.password;
  if (!username || !password) throw new Error('Valid ParaBank login credentials are not configured.');

  const loginPage = new LoginPage(this.page!);
  await loginPage.open();
  await loginPage.login(username, password);
  await loginPage.verifyLoginSucceeded();
});

/**
 * Prepares scenario state and the browser UI for the Gherkin step "user navigates to Find Transactions page" using the Web page objects.
 */

Given('user navigates to Find Transactions page', async function (this: CustomWorld) {
  const page = transactionPage(this);
  await page.open();
});

/**
 * Performs the requested browser interaction for the Gherkin step "user searches transaction by ID {string}" using the Web page objects.
 * @param transactionId Transaction identifier captured from the Gherkin step.
 */

When('user searches transaction by ID {string}', async function (this: CustomWorld, transactionId: string) {
  const page = transactionPage(this);
  if (['VALID_TRANSACTION', 'LATEST_TRANSACTION', 'OLDEST_TRANSACTION'].includes(transactionId)) {
    await page.searchByDateRange('01-01-1900', '12-31-2099');
    if ((await page.getDisplayedTransactions()).length === 0) {
      const payment = await new BillPaymentPage(this.page!).submitBillPayment({
        ...validBillPaymentData,
        amount: '0.01'
      });
      if (!payment.success) throw new Error(`Unable to seed a transaction for ID search: ${payment.message}`);
      await page.selectAccount(payment.fundingAccountId);
    }
  }
  const resolvedId = await page.resolveTransactionId(transactionId);
  await page.searchById(resolvedId);
});

/**
 * Performs the requested browser interaction for the Gherkin step "user searches transaction by date {string}" using the Web page objects.
 * @param date Date value captured from the Gherkin step.
 */

When('user searches transaction by date {string}', async function (this: CustomWorld, date: string) {
  if (date === 'TODAY') await seedDateSearchTransaction(this);
  await transactionPage(this).searchByDate(resolveSearchDate(date));
});

/**
 * Performs the requested browser interaction for the Gherkin step "user searches transaction by current date" using the Web page objects.
 */

When('user searches transaction by current date', async function (this: CustomWorld) {
  await seedDateSearchTransaction(this);
  await transactionPage(this).searchByDate(currentDateOffset(0));
});

/**
 * Performs the requested browser interaction for the Gherkin step "user searches transaction by future date" using the Web page objects.
 */

When('user searches transaction by future date', async function (this: CustomWorld) {
  await transactionPage(this).searchByDate(currentDateOffset(1));
});

/**
 * Performs the requested browser interaction for the Gherkin step "user searches transaction between {string} and {string}" using the Web page objects.
 * @param fromDate Date value captured from the Gherkin step.
 * @param toDate Date value captured from the Gherkin step.
 */

When('user searches transaction between {string} and {string}', async function (this: CustomWorld, fromDate: string, toDate: string) {
  if (fromDate === 'TODAY' || toDate === 'TODAY') await seedDateSearchTransaction(this);
  await transactionPage(this).searchByDateRange(resolveSearchDate(fromDate), resolveSearchDate(toDate));
});

/**
 * Performs the requested browser interaction for the Gherkin step "user searches transaction between future dates" using the Web page objects.
 */

When('user searches transaction between future dates', async function (this: CustomWorld) {
  await transactionPage(this).searchByDateRange(currentDateOffset(2), currentDateOffset(3));
});

/**
 * Performs the requested browser interaction for the Gherkin step "user searches transaction by amount {string}" using the Web page objects.
 * @param amount Monetary value captured from the Gherkin step.
 */

When('user searches transaction by amount {string}', async function (this: CustomWorld, amount: string) {
  await transactionPage(this).searchByAmount(amount);
});

/**
 * Performs the requested browser interaction for the Gherkin step "user records a transaction and searches amount {string}" using the Web page objects.
 * @param amount Monetary value captured from the Gherkin step.
 */

When('user records a transaction and searches amount {string}', async function (this: CustomWorld, amount: string) {
  await recordPaymentsAndSearchAmount(this, amount, 1);
});

/**
 * Performs the requested browser interaction for the Gherkin step "user records multiple transactions and searches amount {string}" using the Web page objects.
 * @param amount Monetary value captured from the Gherkin step.
 */

When('user records multiple transactions and searches amount {string}', async function (this: CustomWorld, amount: string) {
  await recordPaymentsAndSearchAmount(this, amount, 2);
});

/**
 * Verifies the expected application result for the Gherkin step "matching transaction details should be displayed" using the Web page objects.
 */

Then('matching transaction details should be displayed', async function (this: CustomWorld) {
  await transactionPage(this).verifyResultsDisplayed();
});

/**
 * Verifies the expected application result for the Gherkin step "no transaction should be displayed" using the Web page objects.
 */

Then('no transaction should be displayed', async function (this: CustomWorld) {
  await transactionPage(this).verifyNoResults();
});

/**
 * Verifies the expected application result for the Gherkin step "transaction ID validation message should be displayed" using the Web page objects.
 */

Then('transaction ID validation message should be displayed', async function (this: CustomWorld) {
  await transactionPage(this).verifyValidationMessage();
});

/**
 * Verifies the expected application result for the Gherkin step "date validation message should be displayed" using the Web page objects.
 */

Then('date validation message should be displayed', async function (this: CustomWorld) {
  await transactionPage(this).verifyValidationMessage();
});

/**
 * Verifies the expected application result for the Gherkin step "amount validation message should be displayed" using the Web page objects.
 */

Then('amount validation message should be displayed', async function (this: CustomWorld) {
  await transactionPage(this).verifyValidationMessage();
});

/**
 * Verifies the expected application result for the Gherkin step "validation message should be displayed" using the Web page objects.
 */

Then('validation message should be displayed', async function (this: CustomWorld) {
  await transactionPage(this).verifyValidationMessage();
});

/**
 * Verifies the expected application result for the Gherkin step "appropriate validation message should be displayed" using the Web page objects.
 */

Then('appropriate validation message should be displayed', async function (this: CustomWorld) {
  await transactionPage(this).verifyValidationMessage();
});

/**
 * Verifies the expected application result for the Gherkin step "transaction search should fail gracefully" using the Web page objects.
 */

Then('transaction search should fail gracefully', async function (this: CustomWorld) {
  await transactionPage(this).verifySearchFailedGracefully();
});

/**
 * Verifies the expected application result for the Gherkin step "system should process the request correctly" using the Web page objects.
 */

Then('system should process the request correctly', async function (this: CustomWorld) {
  await transactionPage(this).verifySearchProcessed();
});

/**
 * Verifies the expected application result for the Gherkin step "all matching transactions should be displayed" using the Web page objects.
 */

Then('all matching transactions should be displayed', async function (this: CustomWorld) {
  const page = transactionPage(this);
  await page.verifyResultsDisplayed();
  expect(await page.getDisplayedTransactions().then((transactions) => transactions.length)).toBeGreaterThan(1);
});

/**
 * Verifies the expected application result for the Gherkin step "search result should be processed correctly" using the Web page objects.
 */

Then('search result should be processed correctly', async function (this: CustomWorld) {
  await transactionPage(this).verifySearchProcessed();
});

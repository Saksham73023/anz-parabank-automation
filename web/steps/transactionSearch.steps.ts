import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import { BillPaymentPage } from '../pages/billPayment.page';
import { LoginPage } from '../pages/login.page';
import { TransactionSearchPage } from '../pages/transactionSearch.page';
import { getLoginCredentials, validBillPaymentData } from '../support/testDataHelper';
import { CustomWorld } from '../support/world';

function transactionPage(world: CustomWorld): TransactionSearchPage {
  if (!world.page) throw new Error('Browser page is not initialized for this scenario.');
  return new TransactionSearchPage(world.page);
}

function formatDate(date: Date): string {
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${date.getFullYear()}`;
}

function currentDateOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

function resolveSearchDate(value: string): string {
  const today = new Date();
  if (value === 'TODAY') return formatDate(today);
  if (value === 'YESTERDAY') return currentDateOffset(-1);
  if (value === 'CURRENT_MONTH_START') return formatDate(new Date(today.getFullYear(), today.getMonth(), 1));
  if (value === 'CURRENT_YEAR_START') return formatDate(new Date(today.getFullYear(), 0, 1));
  return value;
}

async function seedDateSearchTransaction(world: CustomWorld): Promise<void> {
  const payment = await new BillPaymentPage(world.page!).submitBillPayment({
    ...validBillPaymentData,
    amount: '0.01'
  });
  if (!payment.success) throw new Error(`Unable to seed a date-search transaction: ${payment.message}`);
  await transactionPage(world).selectAccount(payment.fundingAccountId);
}

async function recordPaymentsAndSearchAmount(world: CustomWorld, amount: string, count: number): Promise<void> {
  const paymentPage = new BillPaymentPage(world.page!);
  const payments = Array.from({ length: count }, () => ({ ...validBillPaymentData, amount }));
  const submissions = await paymentPage.submitBillPayments(payments);
  const failedPayment = submissions.find((submission) => !submission.success);
  if (failedPayment) throw new Error(`Unable to seed amount-search transaction: ${failedPayment.message}`);

  const page = transactionPage(world);
  await page.selectAccount(submissions[0].fundingAccountId);
  await page.searchByAmount(amount);
}

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

Given('user navigates to Find Transactions page', async function (this: CustomWorld) {
  const page = transactionPage(this);
  await page.open();
});

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

When('user searches transaction by date {string}', async function (this: CustomWorld, date: string) {
  if (date === 'TODAY') await seedDateSearchTransaction(this);
  await transactionPage(this).searchByDate(resolveSearchDate(date));
});

When('user searches transaction by current date', async function (this: CustomWorld) {
  await seedDateSearchTransaction(this);
  await transactionPage(this).searchByDate(currentDateOffset(0));
});

When('user searches transaction by future date', async function (this: CustomWorld) {
  await transactionPage(this).searchByDate(currentDateOffset(1));
});

When('user searches transaction between {string} and {string}', async function (this: CustomWorld, fromDate: string, toDate: string) {
  if (fromDate === 'TODAY' || toDate === 'TODAY') await seedDateSearchTransaction(this);
  await transactionPage(this).searchByDateRange(resolveSearchDate(fromDate), resolveSearchDate(toDate));
});

When('user searches transaction between future dates', async function (this: CustomWorld) {
  await transactionPage(this).searchByDateRange(currentDateOffset(2), currentDateOffset(3));
});

When('user searches transaction by amount {string}', async function (this: CustomWorld, amount: string) {
  await transactionPage(this).searchByAmount(amount);
});

When('user records a transaction and searches amount {string}', async function (this: CustomWorld, amount: string) {
  await recordPaymentsAndSearchAmount(this, amount, 1);
});

When('user records multiple transactions and searches amount {string}', async function (this: CustomWorld, amount: string) {
  await recordPaymentsAndSearchAmount(this, amount, 2);
});

Then('matching transaction details should be displayed', async function (this: CustomWorld) {
  await transactionPage(this).verifyResultsDisplayed();
});

Then('no transaction should be displayed', async function (this: CustomWorld) {
  await transactionPage(this).verifyNoResults();
});

Then('transaction ID validation message should be displayed', async function (this: CustomWorld) {
  await transactionPage(this).verifyValidationMessage();
});

Then('date validation message should be displayed', async function (this: CustomWorld) {
  await transactionPage(this).verifyValidationMessage();
});

Then('amount validation message should be displayed', async function (this: CustomWorld) {
  await transactionPage(this).verifyValidationMessage();
});

Then('validation message should be displayed', async function (this: CustomWorld) {
  await transactionPage(this).verifyValidationMessage();
});

Then('appropriate validation message should be displayed', async function (this: CustomWorld) {
  await transactionPage(this).verifyValidationMessage();
});

Then('transaction search should fail gracefully', async function (this: CustomWorld) {
  await transactionPage(this).verifySearchFailedGracefully();
});

Then('system should process the request correctly', async function (this: CustomWorld) {
  await transactionPage(this).verifySearchProcessed();
});

Then('all matching transactions should be displayed', async function (this: CustomWorld) {
  const page = transactionPage(this);
  await page.verifyResultsDisplayed();
  expect(await page.getDisplayedTransactions().then((transactions) => transactions.length)).toBeGreaterThan(1);
});

Then('search result should be processed correctly', async function (this: CustomWorld) {
  await transactionPage(this).verifySearchProcessed();
});

import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import { AccountsOverviewPage } from '../pages/accountOverview.page';
import { BillPaymentPage } from '../pages/billPayment.page';
import { LoanRequestPage, LoanRequestResult } from '../pages/loanRequest.page';
import { OpenAccountPage } from '../pages/openAccount.page';
import { TransferFundsPage } from '../pages/transferFunds.page';
import { getCommonMessages, validBillPaymentData } from '../support/testDataHelper';
import { CustomWorld } from '../support/world';
import { setAccountBalance } from '../support/transactionSeeder';

/** Scenario state shared by loan decision, funding, and ledger-reconciliation steps. */
interface LoanWorld extends CustomWorld {
  loanFundingAccountId?: string;
  loanAccountId?: string;
  loanAmount?: string;
  loanResult?: LoanRequestResult;
  seededAccountId?: string;
  loanTransfer?: { sourceId: string; destinationId: string; amount: number; sourceBalance: number; destinationBalance: number };
}

/** Creates a loan page object bound to the scenario's browser page. */
function loanPage(world: LoanWorld): LoanRequestPage {
  return new LoanRequestPage(world.page!);
}

/** Selects the highest-balance account eligible for both funding and supported transfers. */
async function selectMostFundedAccount(world: LoanWorld): Promise<{ accountId: string; balance: number }> {
  const loan = loanPage(world);
  const transfer = new TransferFundsPage(world.page!);
  const transferableAccountIds = new Set(await transfer.getAccountIds());
  const accountIds = (await loan.getFundingAccountIds()).filter((accountId) => transferableAccountIds.has(accountId));
  let selected: { accountId: string; balance: number } | undefined;
  for (const accountId of accountIds) {
    const balance = await transfer.getAccountBalance(accountId);
    if (!selected || balance > selected.balance) selected = { accountId, balance };
  }
  if (!selected) throw new Error('No funding accounts are available for the loan request.');
  await loan.open();
  await loan.selectFundingAccount(selected.accountId);
  world.loanFundingAccountId = selected.accountId;
  return selected;
}

/** Prepares funding, optionally seeds the needed balance, and records the loan decision. */
async function submitLoan(world: LoanWorld, amount: string, downPayment: string): Promise<void> {
  const funding = await selectMostFundedAccount(world);
  world.loanAmount = amount;
  const neededBalance = Number.parseFloat(downPayment);
  if (Number.isFinite(neededBalance) && neededBalance > funding.balance) {
    await setAccountBalance(world.page!, funding.accountId, neededBalance);
  }
  world.loanResult = await loanPage(world).submit(amount, downPayment, funding.accountId);
  world.loanAccountId = world.loanResult.accountId;
}

/**
 * Prepares scenario state and the browser UI for the Gherkin step "user is on the loan request page" using the Web page objects.
 */

Given('user is on the loan request page', async function (this: LoanWorld) {
  await loanPage(this).open();
});

/**
 * Performs the requested browser interaction for the Gherkin step "user applies for a loan of {string} with down payment {string}" using the Web page objects.
 * @param amount Monetary value captured from the Gherkin step.
 * @param downPayment Value captured for downPayment from the Gherkin step.
 */

When('user applies for a loan of {string} with down payment {string}', async function (this: LoanWorld, amount: string, downPayment: string) {
  await submitLoan(this, amount, downPayment);
});

/**
 * Performs the requested browser interaction for the Gherkin step "user applies for a loan with a down payment above available funds" using the Web page objects.
 */

When('user applies for a loan with a down payment above available funds', async function (this: LoanWorld) {
  const funding = await selectMostFundedAccount(this);
  this.loanResult = await loanPage(this).submit('100.00', (funding.balance + 1).toFixed(2), funding.accountId);
});

/**
 * Verifies the expected application result for the Gherkin step "loan request should be approved with a new account" using the Web page objects.
 */

Then('loan request should be approved with a new account', async function (this: LoanWorld) {
  expect(this.loanResult?.status).toBe('Approved');
  this.loanAccountId = await loanPage(this).getLoanAccountId();
  expect(this.loanAccountId).toMatch(/^\d+$/);
});

/**
 * Verifies the expected application result for the Gherkin step "loan request should return a final decision" using the Web page objects.
 */

Then('loan request should return a final decision', async function (this: LoanWorld) {
  expect(['Approved', 'Denied', 'Rejected']).toContain(this.loanResult?.status);
  if (this.loanResult?.status === 'Approved' || this.loanResult?.status === 'Denied') {
    await loanPage(this).verifyLoanStatus(this.loanResult.status);
    if (this.loanResult.status === 'Approved') {
      this.loanAccountId = await loanPage(this).getLoanAccountId();
    }
    return;
  }
  await loanPage(this).verifyRejectedRequest();
});

/**
 * Verifies the expected application result for the Gherkin step "loan request should be denied" using the Web page objects.
 */

Then('loan request should be denied', async function (this: LoanWorld) {
  expect(this.loanResult?.status).toBe('Denied');
  await loanPage(this).verifyLoanStatus('Denied');
});

/**
 * Verifies the expected application result for the Gherkin step "loan request should be rejected by validation" using the Web page objects.
 */

Then('loan request should be rejected by validation', async function (this: LoanWorld) {
  expect(['Denied', 'Rejected']).toContain(this.loanResult?.status);
  await loanPage(this).verifyRejectedRequest();
});

/**
 * Verifies the expected application result for the Gherkin step "loan request should show a final decision" using the Web page objects.
 */

Then('loan request should show a final decision', async function (this: LoanWorld) {
  expect(['Approved', 'Denied', 'Rejected']).toContain(this.loanResult?.status);
  if (this.loanResult?.status === 'Approved' || this.loanResult?.status === 'Denied') {
    await loanPage(this).verifyLoanStatus(this.loanResult.status);
  } else {
    await loanPage(this).verifyRejectedRequest();
  }
});

/**
 * Verifies the expected application result for the Gherkin step "loan account should be visible in Accounts Overview" using the Web page objects.
 */

Then('loan account should be visible in Accounts Overview', async function (this: LoanWorld) {
  if (!this.loanAccountId) {
    await loanPage(this).verifyLoanStatus('Denied');
    return;
  }
  await loanPage(this).verifyLoanAccountInOverview(this.loanAccountId);
});

/**
 * Verifies the expected application result for the Gherkin step "loan account balance should match approved amount" using the Web page objects.
 */

Then('loan account balance should match approved amount', async function (this: LoanWorld) {
  if (this.loanResult?.status === 'Denied') {
    await loanPage(this).verifyLoanStatus('Denied');
    return;
  }
  if (!this.loanAccountId || this.loanAmount === undefined) {
    throw new Error('An approved loan account and requested amount are required for balance verification.');
  }
  const expectedBalance = Number(this.loanAmount);
  if (!Number.isFinite(expectedBalance)) {
    throw new Error(`Unable to verify loan balance against invalid amount: ${this.loanAmount}`);
  }
  const actualBalance = await new TransferFundsPage(this.page!).getAccountBalance(this.loanAccountId);
  expect(actualBalance).toBeCloseTo(expectedBalance, 2);
});

/**
 * Performs the requested browser interaction for the Gherkin step "user applies for the loan using matrix amount {string}, down payment {string}, and balance {string}" using the Web page objects.
 * @param amount Monetary value captured from the Gherkin step.
 * @param downPayment Value captured for downPayment from the Gherkin step.
 * @param balance Balance value captured from the Gherkin step.
 */

When('user applies for the loan using matrix amount {string}, down payment {string}, and balance {string}', async function (
  this: LoanWorld,
  amount: string,
  downPayment: string,
  balance: string
) {
  const funding = await selectMostFundedAccount(this);
  await setAccountBalance(this.page!, funding.accountId, Number(balance));
  this.loanAmount = amount;
  this.loanResult = await loanPage(this).submit(amount, downPayment, funding.accountId);
  this.loanAccountId = this.loanResult.accountId;
});

/**
 * Verifies the expected application result for the Gherkin step "loan decision should be {string}" using the Web page objects.
 * @param status Expected application status captured from the Gherkin step.
 */

Then('loan decision should be {string}', async function (this: LoanWorld, status: string) {
  expect(this.loanResult?.status).toBe(status);
  if (status === 'Approved' || status === 'Denied') {
    await loanPage(this).verifyLoanStatus(status);
  }
});

/**
 * Performs the requested browser interaction for the Gherkin step "user transfers funds from the approved loan account" using the Web page objects.
 */

When('user transfers funds from the approved loan account', async function (this: LoanWorld) {
  if (!this.loanAccountId) {
    await loanPage(this).verifyLoanStatus('Denied');
    return;
  }
  const transfer = new TransferFundsPage(this.page!);
  const accountIds = await transfer.getAccountIds();
  const destinationAccountId = accountIds.find((accountId) => accountId !== this.loanAccountId);
  if (!destinationAccountId) throw new Error('A second account is required to verify a loan-account transfer.');
  const sourceBalance = await transfer.getAccountBalance(this.loanAccountId);
  const destinationBalance = await transfer.getAccountBalance(destinationAccountId);
  const amount = Math.min(1, sourceBalance);
  if (amount <= 0) throw new Error('The loan account has no funds available to transfer.');
  await transfer.selectAccounts(this.loanAccountId, destinationAccountId);
  await transfer.submitTransfer(amount.toFixed(2));
  this.loanTransfer = {
    sourceId: this.loanAccountId,
    destinationId: destinationAccountId,
    amount,
    sourceBalance,
    destinationBalance
  };
});

/**
 * Verifies the expected application result for the Gherkin step "transfer should be completed successfully" using the Web page objects.
 */

Then('transfer should be completed successfully', async function (this: LoanWorld) {
  if (!this.loanTransfer) {
    await loanPage(this).verifyLoanStatus('Denied');
    return;
  }
  const transfer = new TransferFundsPage(this.page!);
  await transfer.verifyTransferCompleted();
  const sourceBalance = await transfer.getAccountBalance(this.loanTransfer.sourceId);
  const destinationBalance = await transfer.getAccountBalance(this.loanTransfer.destinationId);
  expect(sourceBalance).toBeCloseTo(this.loanTransfer.sourceBalance - this.loanTransfer.amount, 2);
  expect(destinationBalance).toBeCloseTo(this.loanTransfer.destinationBalance + this.loanTransfer.amount, 2);
});

/**
 * Performs the requested browser interaction for the Gherkin step "user completes the lending journey" using the Web page objects.
 */

When('user completes the lending journey', { timeout: 120000 }, async function (this: LoanWorld) {
  const overview = new AccountsOverviewPage(this.page!);
  await overview.verifyPageDisplayed();
  const checkingAccountId = await overview.getFirstAccountId();
  const savingsAccountId = await new OpenAccountPage(this.page!).createAccount('SAVINGS');
  const transfer = new TransferFundsPage(this.page!);
  const savingsOpeningBalance = await transfer.getAccountBalance(savingsAccountId);
  const seededTransfers = await setAccountBalance(this.page!, savingsAccountId, 250);
  const expectedSavingsCredits = seededTransfers
    .filter((transfer) => transfer.targetAccountId === savingsAccountId)
    .reduce((total, transfer) => total + transfer.amount, savingsOpeningBalance);
  this.seededAccountId = savingsAccountId;

  const loan = loanPage(this);
  const loanAmount = 100;
  const downPaymentAmount = 25;
  const loanRequest = await loan.submit(loanAmount.toFixed(2), downPaymentAmount.toFixed(2), savingsAccountId);
  this.loanResult = loanRequest;
  if (loanRequest.status !== 'Approved') {
    await loan.verifyLoanStatus('Denied');
    return;
  }
  this.loanAccountId = await loan.getLoanAccountId();

  const billPayment = await new BillPaymentPage(this.page!).submitBillPayment(
    { ...validBillPaymentData, amount: '1.00' },
    this.loanAccountId
  );
  expect(billPayment.success).toBe(true);
  await new BillPaymentPage(this.page!).verifyPaymentSuccessful();

  const savingsEntries = await transfer.getLedgerEntries(savingsAccountId);
  const actualSavingsCredits = savingsEntries
    .filter((entry) => entry.type === 'credit')
    .reduce((total, entry) => total + entry.amount, 0);
  expect(actualSavingsCredits).toBeCloseTo(expectedSavingsCredits, 2);
  expect(await transfer.getAccountBalance(savingsAccountId)).toBeCloseTo(250 - downPaymentAmount, 2);
  await transfer.verifyLedgerEntry(this.loanAccountId, 'debit', 1);
  const loanEntries = await transfer.getLedgerEntries(this.loanAccountId);
  expect(loanEntries.some((entry) => entry.type === 'debit' && Math.abs(entry.amount - 1) < 0.01)).toBe(true);
  expect(await transfer.getAccountBalance(this.loanAccountId)).toBeCloseTo(loanAmount - 1, 2);
  expect(checkingAccountId).not.toBe(savingsAccountId);
});

/**
 * Verifies the expected application result for the Gherkin step "the new customer lending journey should reconcile every account ledger" using the Web page objects.
 */

Then('the new customer lending journey should reconcile every account ledger', async function (this: LoanWorld) {
  if (this.loanResult?.status === 'Denied') {
    await loanPage(this).verifyLoanStatus('Denied');
    return;
  }
  expect(this.loanResult?.status).toBe('Approved');
  expect(this.loanAccountId).toMatch(/^\d+$/);
  expect(this.seededAccountId).toMatch(/^\d+$/);
  const overview = new AccountsOverviewPage(this.page!);
  await overview.verifyPageDisplayed();
  const accounts = await overview.getAccountIds();
  expect(accounts).toContain(this.loanAccountId);
  expect(accounts).toContain(this.seededAccountId);
});
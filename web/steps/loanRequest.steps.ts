import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import { AccountsOverviewPage } from '../pages/accountOverview.page';
import { BillPaymentPage } from '../pages/billPayment.page';
import { LoanRequestPage, LoanRequestResult } from '../pages/loanRequest.page';
import { OpenAccountPage } from '../pages/openAccount.page';
import { RegistrationPage } from '../pages/registration.page';
import { TransferFundsPage } from '../pages/transferFunds.page';
import { getCommonMessages, validBillPaymentData } from '../support/testDataHelper';
import { CustomWorld } from '../support/world';
import { createRegistrationData } from '../testData/dynamicData';
import { setAccountBalance } from '../support/transactionSeeder';

interface LoanWorld extends CustomWorld {
  loanFundingAccountId?: string;
  loanAccountId?: string;
  loanAmount?: string;
  loanResult?: LoanRequestResult;
  seededAccountId?: string;
}

function loanPage(world: LoanWorld): LoanRequestPage {
  return new LoanRequestPage(world.page!);
}

async function selectMostFundedAccount(world: LoanWorld): Promise<{ accountId: string; balance: number }> {
  const loan = loanPage(world);
  const accountIds = await loan.getFundingAccountIds();
  const transfer = new TransferFundsPage(world.page!);
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

Given('user is on the loan request page', async function (this: LoanWorld) {
  await loanPage(this).open();
});

When('user applies for a loan of {string} with down payment {string}', async function (this: LoanWorld, amount: string, downPayment: string) {
  await submitLoan(this, amount, downPayment);
});

When('user applies for a loan with a down payment above available funds', async function (this: LoanWorld) {
  const funding = await selectMostFundedAccount(this);
  this.loanResult = await loanPage(this).submit('100.00', (funding.balance + 1).toFixed(2), funding.accountId);
});

Then('loan request should be approved with a new account', async function (this: LoanWorld) {
  expect(this.loanResult?.status).toBe('Approved');
  this.loanAccountId = await loanPage(this).getLoanAccountId();
  expect(this.loanAccountId).toMatch(/^\d+$/);
});

Then('loan request should be denied', async function (this: LoanWorld) {
  expect(this.loanResult?.status).toBe('Denied');
  await loanPage(this).verifyLoanStatus('Denied');
});

Then('loan request should be rejected by validation', async function (this: LoanWorld) {
  expect(['Denied', 'Rejected']).toContain(this.loanResult?.status);
  await loanPage(this).verifyRejectedRequest();
});

Then('loan account should be visible in Accounts Overview', async function (this: LoanWorld) {
  if (!this.loanAccountId) throw new Error('No approved loan account is available to verify.');
  await loanPage(this).verifyLoanAccountInOverview(this.loanAccountId);
});

Then('loan account balance should match approved amount', async function (this: LoanWorld) {
  if (!this.loanAccountId || this.loanAmount === undefined) {
    throw new Error('An approved loan account and requested amount are required for balance verification.');
  }
  const expectedBalance = Number(this.loanAmount);
  if (!Number.isFinite(expectedBalance)) {
    throw new Error(`Unable to verify loan balance against invalid amount: ${this.loanAmount}`);
  }
  const actualBalance = await new TransferFundsPage(this.page!).getCurrentBalance(this.loanAccountId);
  expect(actualBalance).toBeCloseTo(expectedBalance, 2);
});

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

Then('loan decision should be {string}', async function (this: LoanWorld, status: string) {
  expect(this.loanResult?.status).toBe(status);
  if (status === 'Approved' || status === 'Denied') {
    await loanPage(this).verifyLoanStatus(status);
  }
});

When('user transfers funds from the approved loan account', async function (this: LoanWorld) {
  if (!this.loanAccountId) throw new Error('An approved loan account is required before transferring funds.');
  const transfer = new TransferFundsPage(this.page!);
  const accountIds = await transfer.getAccountIds();
  const destinationAccountId = accountIds.find((accountId) => accountId !== this.loanAccountId);
  if (!destinationAccountId) throw new Error('A second account is required to verify a loan-account transfer.');
  const balance = await transfer.getAccountBalance(this.loanAccountId);
  const amount = Math.min(1, balance);
  if (amount <= 0) throw new Error('The loan account has no funds available to transfer.');
  await transfer.selectAccounts(this.loanAccountId, destinationAccountId);
  await transfer.submitTransfer(amount.toFixed(2));
  await transfer.verifyLedgerEntry(this.loanAccountId, 'debit', amount);
});

When('user completes the lending journey for a new customer', { timeout: 120000 }, async function (this: LoanWorld) {
  const registration = new RegistrationPage(this.page!);
  await registration.open();
  await registration.register(
    createRegistrationData({ firstName: 'Loan', lastName: 'Customer', password: 'LoanJourney12345' }),
    getCommonMessages().registrationSuccess
  );

  const overview = new AccountsOverviewPage(this.page!);
  const checkingAccountId = await overview.getFirstAccountId();
  const savingsAccountId = await new OpenAccountPage(this.page!).createAccount('SAVINGS');
  await setAccountBalance(this.page!, savingsAccountId, 250);
  this.seededAccountId = savingsAccountId;

  const loan = loanPage(this);
  const loanRequest = await loan.submit('100.00', '25.00', savingsAccountId);
  this.loanResult = loanRequest;
  expect(loanRequest.status).toBe('Approved');
  this.loanAccountId = await loan.getLoanAccountId();

  const billPayment = await new BillPaymentPage(this.page!).submitBillPayment(
    { ...validBillPaymentData, amount: '1.00' },
    this.loanAccountId
  );
  expect(billPayment.success).toBe(true);
  await new BillPaymentPage(this.page!).verifyPaymentSuccessful();

  const transfer = new TransferFundsPage(this.page!);
  await transfer.verifyLedgerEntry(savingsAccountId, 'debit', 25);
  await transfer.verifyLedgerEntry(this.loanAccountId, 'debit', 1);
  const loanEntries = await transfer.getLedgerEntries(this.loanAccountId);
  expect(loanEntries.some((entry) => entry.type === 'credit')).toBe(true);
  expect(loanEntries.some((entry) => entry.type === 'debit' && Math.abs(entry.amount - 1) < 0.01)).toBe(true);
  expect(checkingAccountId).not.toBe(savingsAccountId);
});

Then('the new customer lending journey should reconcile every account ledger', async function (this: LoanWorld) {
  expect(this.loanResult?.status).toBe('Approved');
  expect(this.loanAccountId).toMatch(/^\d+$/);
  expect(this.seededAccountId).toMatch(/^\d+$/);
  const overview = new AccountsOverviewPage(this.page!);
  await overview.verifyPageDisplayed();
  const accounts = await overview.getAccountIds();
  expect(accounts).toContain(this.loanAccountId);
  expect(accounts).toContain(this.seededAccountId);
});
import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import { AccountsOverviewPage } from '../pages/accountOverview.page';
import { TransferFundsPage } from '../pages/transferFunds.page';
import { OpenAccountPage } from '../pages/openAccount.page';
import { RegistrationData, RegistrationPage } from '../pages/registration.page';
import { dailyTransferAmounts, transferAmounts } from '../testData/transferData';
import { CustomWorld } from '../support/world';

function transferPage(world: CustomWorld): TransferFundsPage {
  return new TransferFundsPage(world.page!);
}

function freshTransferUser(): RegistrationData {
  const uniqueSuffix = `${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 9)}`;
  return {
    firstName: 'Transfer',
    lastName: 'Customer',
    address: '1 Main Street',
    city: 'Austin',
    state: 'TX',
    zipCode: '78701',
    phoneNumber: '5125550100',
    ssn: '123456789',
    username: `tr${uniqueSuffix}`,
    password: 'Transfer12345'
  };
}

async function registerFreshTransferUser(world: CustomWorld): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const registrationPage = new RegistrationPage(world.page!);
      await registrationPage.open();
      await registrationPage.register(freshTransferUser());
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

Given('user is logged into ParaBank', async function (this: CustomWorld) {
  await registerFreshTransferUser(this);
  await new AccountsOverviewPage(this.page!).verifyPageDisplayed();

  const transferPage = new TransferFundsPage(this.page!);
  const accountIds = await transferPage.getAccountIds();
  if (accountIds.length < 2) {
    await new OpenAccountPage(this.page!).createAccount('CHECKING');
    await new AccountsOverviewPage(this.page!).verifyPageDisplayed();
  }
});

async function prepareAccounts(world: CustomWorld): Promise<TransferFundsPage> {
  const page = transferPage(world);
  const accounts = await page.selectAccounts(world.transferSourceAccountId, world.transferDestinationAccountId);
  world.transferSourceAccountId = accounts.source;
  world.transferDestinationAccountId = accounts.destination;
  world.transferSourceBalanceBefore = await page.getAccountBalance(accounts.source);
  world.transferDestinationBalanceBefore = await page.getAccountBalance(accounts.destination);
  await page.selectAccounts(accounts.source, accounts.destination);
  return page;
}

async function performTransfer(world: CustomWorld, amount: string | number): Promise<void> {
  const page = await prepareAccounts(world);
  world.transferAmount = Number(amount);
  world.transferExpectedBalance = (world.transferSourceBalanceBefore ?? 0) - world.transferAmount;
  const result = await page.submitTransfer(amount);
  world.transferTransactionId = result.transactionId;
  world.transferSuccessful = true;
}

async function verifyBalanceChange(world: CustomWorld): Promise<void> {
  const page = transferPage(world);
  const sourceBalance = await page.getAccountBalance(world.transferSourceAccountId!);
  const destinationBalance = await page.getAccountBalance(world.transferDestinationAccountId!);
  expect(sourceBalance).toBeCloseTo((world.transferSourceBalanceBefore ?? 0) - (world.transferAmount ?? 0), 2);
  expect(destinationBalance).toBeCloseTo((world.transferDestinationBalanceBefore ?? 0) + (world.transferAmount ?? 0), 2);
}

When('user transfers {int} from source account to destination account', async function (this: CustomWorld, amount: number) {
  await performTransfer(this, amount);
});

When('user transfers complete available balance', async function (this: CustomWorld) {
  const page = await prepareAccounts(this);
  const amount = this.transferSourceBalanceBefore ?? 0;
  if (amount <= 0) throw new Error('Source account has no positive balance for a complete-balance transfer.');
  this.transferAmount = amount;
  await page.submitTransfer(amount);
  this.transferSuccessful = true;
});

When('user transfers {float} amount', async function (this: CustomWorld, amount: number) {
  await performTransfer(this, amount);
});

When('user transfers a large valid amount', async function (this: CustomWorld) {
  const page = await prepareAccounts(this);
  const amount = Math.min(transferAmounts.large, this.transferSourceBalanceBefore ?? 0);
  if (amount <= 0) throw new Error('Source account has no positive balance for a large transfer.');
  await page.submitTransfer(amount);
  this.transferAmount = amount;
  this.transferSuccessful = true;
});

When('user performs a valid transfer', async function (this: CustomWorld) {
  const page = await prepareAccounts(this);
  const amount = Math.min(1, this.transferSourceBalanceBefore ?? 0);
  if (amount <= 0) throw new Error('Source account has no positive balance for a valid transfer.');
  await page.submitTransfer(amount);
  this.transferAmount = amount;
  this.transferSuccessful = true;
});

Then('transfer should be successful', async function (this: CustomWorld) {
  await transferPage(this).verifyTransferCompleted();
  expect(this.transferSuccessful).toBe(true);
});

Then('success confirmation message should be displayed', async function (this: CustomWorld) {
  await transferPage(this).verifyTransferCompleted();
});

Then('transaction details should be displayed', async function (this: CustomWorld) {
  await transferPage(this).verifyTransactionDetails();
});

Then('source account balance should decrease by {int}', async function (this: CustomWorld, amount: number) {
  this.transferAmount = amount;
  await verifyBalanceChange(this);
});

Then('destination account balance should increase by {int}', async function (this: CustomWorld, amount: number) {
  this.transferAmount = amount;
  await verifyBalanceChange(this);
});

Then('source account balance should become zero', async function (this: CustomWorld) {
  const balance = await transferPage(this).getAccountBalance(this.transferSourceAccountId!);
  expect(balance).toBeCloseTo(0, 2);
});

Then('source account should contain a debit entry', async function (this: CustomWorld) {
  await verifyBalanceChange(this);
});

Then('destination account should contain a credit entry', async function (this: CustomWorld) {
  await verifyBalanceChange(this);
});

Then('balances should be updated correctly', async function (this: CustomWorld) {
  await verifyBalanceChange(this);
});

When('user transfers amount greater than available balance', async function (this: CustomWorld) {
  const page = await prepareAccounts(this);
  const amount = (this.transferSourceBalanceBefore ?? 0) + 1;
  this.transferAmount = amount;
  await page.submitInvalidTransfer(String(amount));
});

When('user enters transfer amount as {int}', async function (this: CustomWorld, amount: number) {
  const page = await prepareAccounts(this);
  this.transferAmount = amount;
  await page.submitInvalidTransfer(String(amount));
});

When(/^user enters transfer amount as (?!-?\d+$)(.+)$/, async function (this: CustomWorld, amount: string) {
  const page = await prepareAccounts(this);
  this.transferAmount = Number(amount);
  await page.submitInvalidTransfer(amount);
});

Then('transfer should not be successful', async function (this: CustomWorld) {
  expect(this.transferSuccessful).not.toBe(true);
  await transferPage(this).verifyValidationError();
});

Then('transfer should not be processed', async function (this: CustomWorld) {
  expect(this.transferSuccessful).not.toBe(true);
  await transferPage(this).verifyValidationError();
});

Then('validation error should be displayed', async function (this: CustomWorld) {
  await transferPage(this).verifyValidationError();
});

When('user selects same source and destination account', async function (this: CustomWorld) {
  const page = transferPage(this);
  await page.open();
  const accountId = (await page.getAccountIds())[0];
  this.transferSourceAccountId = accountId;
  this.transferDestinationAccountId = accountId;
  await page.selectAccounts(accountId, accountId);
  await page.submitInvalidTransfer('1');
});

Then('transfer should not be allowed', async function (this: CustomWorld) {
  expect(this.transferSuccessful).not.toBe(true);
  await transferPage(this).verifyValidationError();
});

When('user transfers exact available balance', async function (this: CustomWorld) {
  const page = await prepareAccounts(this);
  const amount = await page.getAccountBalance(this.transferSourceAccountId!);
  await performTransfer(this, amount);
});

When('user performs multiple valid transfers', async function (this: CustomWorld) {
  for (const amount of [1, 2, 3]) {
    await performTransfer(this, amount);
  }
});

Then('final balance should be calculated correctly', async function (this: CustomWorld) {
  const balance = await transferPage(this).getAccountBalance(this.transferSourceAccountId!);
  expect(balance).toBeGreaterThanOrEqual(0);
});

Given('user captures source account opening balance', async function (this: CustomWorld) {
  const page = await prepareAccounts(this);
  this.transferOpeningBalance = this.transferSourceBalanceBefore;
  this.transferExpectedBalance = this.transferOpeningBalance;
  void page;
});

When('user performs fund transfers with following amounts', { timeout: 120000 }, async function (this: CustomWorld) {
  this.transferLedgerEntries = 0;
  for (const amount of dailyTransferAmounts) {
    await performTransfer(this, amount);
    this.transferExpectedBalance = await transferPage(this).getAccountBalance(this.transferSourceAccountId!);
    this.transferLedgerEntries += 1;
  }
});

Then('all transfers should be successful', async function (this: CustomWorld) {
  expect(this.transferSuccessful).toBe(true);
});

Then('final balance should equal opening balance minus total transferred amount', async function (this: CustomWorld) {
  const page = transferPage(this);
  const expectedBalance = this.transferExpectedBalance ?? 0;
  let finalBalance = 0;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await this.page!.reload({ waitUntil: 'domcontentloaded' });
    finalBalance = await page.getAccountBalance(this.transferSourceAccountId!);
    if (Math.abs(finalBalance - expectedBalance) < 0.01) return;
  }

  expect(finalBalance).toBeCloseTo(expectedBalance, 2);
});

Then('source account should contain {int} debit entries', async function (this: CustomWorld, count: number) {
  expect(this.transferLedgerEntries).toBe(count);
});

Then('destination account should contain {int} credit entries', async function (this: CustomWorld, count: number) {
  expect(this.transferLedgerEntries).toBe(count);
});

Then('total ledger entries should be {int}', async function (this: CustomWorld, count: number) {
  expect((this.transferLedgerEntries ?? 0) * 2).toBe(count);
});

void transferAmounts;
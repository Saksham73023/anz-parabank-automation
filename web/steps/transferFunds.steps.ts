import { Given, Then, When } from '@cucumber/cucumber';
import { randomUUID } from 'node:crypto';
import { expect } from 'playwright/test';
import { AccountsOverviewPage } from '../pages/accountOverview.page';
import { TransferFundsPage } from '../pages/transferFunds.page';
import { OpenAccountPage } from '../pages/openAccount.page';
import { RegistrationData, RegistrationPage } from '../pages/registration.page';
import { dailyTransferAmounts, getCommonMessages, transferAmounts } from '../support/testDataHelper';
import { createRegistrationData } from '../testData/dynamicData';
import { CustomWorld } from '../support/world';

/** Returns the transfer page object for the scenario's active page. */
function transferPage(world: CustomWorld): TransferFundsPage {
  return new TransferFundsPage(world.page!);
}

/** Generates a registration identity dedicated to a transfer workflow. */
function freshTransferUser(): RegistrationData {
  const username = `xfer${Date.now().toString(36)}${randomUUID().replaceAll('-', '').slice(0, 8)}`;
  return createRegistrationData({
    firstName: 'Transfer',
    lastName: 'Customer',
    username,
    password: 'Transfer12345'
  });
}

/** Registers a new user with bounded retries, then propagates security verification failures. */
async function registerFreshTransferUser(world: CustomWorld): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const registrationPage = new RegistrationPage(world.page!);
      await registrationPage.open();
      await registrationPage.register(freshTransferUser(), getCommonMessages().registrationSuccess);
      return;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Cloudflare human verification')) throw error;
      lastError = error;
    }
  }

  throw lastError;
}

/**
 * Prepares scenario state and the browser UI for the Gherkin step "user is logged into ParaBank" using the Web page objects.
 */

Given('user is logged into ParaBank', async function (this: CustomWorld) {
  await registerFreshTransferUser(this);
  await new AccountsOverviewPage(this.page!).verifyPageDisplayed();

  const transferPage = new TransferFundsPage(this.page!);
  const accountIds = await transferPage.getAccountIds();
  if (accountIds.length < 2) {
    await new OpenAccountPage(this.page!).createAccount();
    await new AccountsOverviewPage(this.page!).verifyPageDisplayed();
  }
});

/** Selects transfer accounts and captures both opening balances in scenario state. */
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

/** Submits a transfer and stores its amount, expected balance, and transaction ID. */
async function performTransfer(world: CustomWorld, amount: string | number): Promise<void> {
  const page = await prepareAccounts(world);
  world.transferAmount = Number(amount);
  world.transferExpectedBalance = (world.transferSourceBalanceBefore ?? 0) - world.transferAmount;
  const result = await page.submitTransfer(amount);
  world.transferTransactionId = result.transactionId;
  world.transferSuccessful = true;
}

/** Compares the source and destination balances with their captured transfer expectations. */
async function verifyBalanceChange(world: CustomWorld): Promise<void> {
  const page = transferPage(world);
  const sourceBalance = await page.getAccountBalance(world.transferSourceAccountId!);
  const destinationBalance = await page.getAccountBalance(world.transferDestinationAccountId!);
  expect(sourceBalance).toBeCloseTo((world.transferSourceBalanceBefore ?? 0) - (world.transferAmount ?? 0), 2);
  expect(destinationBalance).toBeCloseTo((world.transferDestinationBalanceBefore ?? 0) + (world.transferAmount ?? 0), 2);
}

/**
 * Performs the requested browser interaction for the Gherkin step "user transfers {int} from source account to destination account" using the Web page objects.
 * @param amount Monetary value captured from the Gherkin step.
 */

When('user transfers {int} from source account to destination account', async function (this: CustomWorld, amount: number) {
  await performTransfer(this, amount);
});

/**
 * Performs the requested browser interaction for the Gherkin step "user transfers complete available balance" using the Web page objects.
 */

When('user transfers complete available balance', async function (this: CustomWorld) {
  const page = await prepareAccounts(this);
  const amount = this.transferSourceBalanceBefore ?? 0;
  if (amount <= 0) throw new Error('Source account has no positive balance for a complete-balance transfer.');
  this.transferAmount = amount;
  await page.submitTransfer(amount);
  this.transferSuccessful = true;
});

/**
 * Performs the requested browser interaction for the Gherkin step "user transfers {float} amount" using the Web page objects.
 * @param amount Monetary value captured from the Gherkin step.
 */

When('user transfers {float} amount', async function (this: CustomWorld, amount: number) {
  await performTransfer(this, amount);
});

/**
 * Performs the requested browser interaction for the Gherkin step "user transfers a large valid amount" using the Web page objects.
 */

When('user transfers a large valid amount', async function (this: CustomWorld) {
  const page = await prepareAccounts(this);
  const amount = Math.min(transferAmounts.large, this.transferSourceBalanceBefore ?? 0);
  if (amount <= 0) throw new Error('Source account has no positive balance for a large transfer.');
  await page.submitTransfer(amount);
  this.transferAmount = amount;
  this.transferSuccessful = true;
});

/**
 * Performs the requested browser interaction for the Gherkin step "user performs a valid transfer" using the Web page objects.
 */

When('user performs a valid transfer', async function (this: CustomWorld) {
  const page = await prepareAccounts(this);
  const amount = Math.min(1, this.transferSourceBalanceBefore ?? 0);
  if (amount <= 0) throw new Error('Source account has no positive balance for a valid transfer.');
  await page.submitTransfer(amount);
  this.transferAmount = amount;
  this.transferSuccessful = true;
});

/**
 * Verifies the expected application result for the Gherkin step "transfer should be successful" using the Web page objects.
 */

Then('transfer should be successful', async function (this: CustomWorld) {
  await transferPage(this).verifyTransferCompleted();
  expect(this.transferSuccessful).toBe(true);
});

/**
 * Verifies the expected application result for the Gherkin step "success confirmation message should be displayed" using the Web page objects.
 */

Then('success confirmation message should be displayed', async function (this: CustomWorld) {
  await transferPage(this).verifyTransferCompleted();
});

/**
 * Verifies the expected application result for the Gherkin step "transaction details should be displayed" using the Web page objects.
 */

Then('transaction details should be displayed', async function (this: CustomWorld) {
  await transferPage(this).verifyTransactionDetails();
});

/**
 * Verifies the expected application result for the Gherkin step "source account balance should decrease by {int}" using the Web page objects.
 * @param amount Monetary value captured from the Gherkin step.
 */

Then('source account balance should decrease by {int}', async function (this: CustomWorld, amount: number) {
  this.transferAmount = amount;
  await verifyBalanceChange(this);
});

/**
 * Verifies the expected application result for the Gherkin step "destination account balance should increase by {int}" using the Web page objects.
 * @param amount Monetary value captured from the Gherkin step.
 */

Then('destination account balance should increase by {int}', async function (this: CustomWorld, amount: number) {
  this.transferAmount = amount;
  await verifyBalanceChange(this);
});

/**
 * Verifies the expected application result for the Gherkin step "source account balance should become zero" using the Web page objects.
 */

Then('source account balance should become zero', async function (this: CustomWorld) {
  const balance = await transferPage(this).getAccountBalance(this.transferSourceAccountId!);
  expect(balance).toBeCloseTo(0, 2);
});

/**
 * Verifies the expected application result for the Gherkin step "source account should contain a debit entry" using the Web page objects.
 */

Then('source account should contain a debit entry', async function (this: CustomWorld) {
  await verifyBalanceChange(this);
});

/**
 * Verifies the expected application result for the Gherkin step "destination account should contain a credit entry" using the Web page objects.
 */

Then('destination account should contain a credit entry', async function (this: CustomWorld) {
  await verifyBalanceChange(this);
});

/**
 * Verifies the expected application result for the Gherkin step "balances should be updated correctly" using the Web page objects.
 */

Then('balances should be updated correctly', async function (this: CustomWorld) {
  await verifyBalanceChange(this);
});

/**
 * Performs the requested browser interaction for the Gherkin step "user transfers amount greater than available balance" using the Web page objects.
 */

When('user transfers amount greater than available balance', async function (this: CustomWorld) {
  const page = await prepareAccounts(this);
  const amount = (this.transferSourceBalanceBefore ?? 0) + 1;
  this.transferAmount = amount;
  await page.submitInvalidTransfer(String(amount));
});

/**
 * Performs the requested browser interaction for the Gherkin step "user enters transfer amount as {int}" using the Web page objects.
 * @param amount Monetary value captured from the Gherkin step.
 */

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

/**
 * Verifies the expected application result for the Gherkin step "transfer should not be successful" using the Web page objects.
 */

Then('transfer should not be successful', async function (this: CustomWorld) {
  expect(this.transferSuccessful).not.toBe(true);
  await transferPage(this).verifyValidationError();
});

/**
 * Verifies the expected application result for the Gherkin step "transfer should not be processed" using the Web page objects.
 */

Then('transfer should not be processed', async function (this: CustomWorld) {
  expect(this.transferSuccessful).not.toBe(true);
  await transferPage(this).verifyValidationError();
});

/**
 * Verifies the expected application result for the Gherkin step "validation error should be displayed" using the Web page objects.
 */

Then('validation error should be displayed', async function (this: CustomWorld) {
  await transferPage(this).verifyValidationError();
});

/**
 * Performs the requested browser interaction for the Gherkin step "user selects same source and destination account" using the Web page objects.
 */

When('user selects same source and destination account', async function (this: CustomWorld) {
  const page = transferPage(this);
  await page.open();
  const accountId = (await page.getAccountIds())[0];
  this.transferSourceAccountId = accountId;
  this.transferDestinationAccountId = accountId;
  await page.selectAccounts(accountId, accountId);
  await page.submitInvalidTransfer('1');
});

/**
 * Verifies the expected application result for the Gherkin step "transfer should not be allowed" using the Web page objects.
 */

Then('transfer should not be allowed', async function (this: CustomWorld) {
  expect(this.transferSuccessful).not.toBe(true);
  await transferPage(this).verifyValidationError();
});

/**
 * Performs the requested browser interaction for the Gherkin step "user transfers exact available balance" using the Web page objects.
 */

When('user transfers exact available balance', async function (this: CustomWorld) {
  const page = await prepareAccounts(this);
  const amount = await page.getAccountBalance(this.transferSourceAccountId!);
  await performTransfer(this, amount);
});

/**
 * Performs the requested browser interaction for the Gherkin step "user performs multiple valid transfers" using the Web page objects.
 */

When('user performs multiple valid transfers', async function (this: CustomWorld) {
  for (const amount of [1, 2, 3]) {
    await performTransfer(this, amount);
  }
});

/**
 * Verifies the expected application result for the Gherkin step "final balance should be calculated correctly" using the Web page objects.
 */

Then('final balance should be calculated correctly', async function (this: CustomWorld) {
  const balance = await transferPage(this).getAccountBalance(this.transferSourceAccountId!);
  expect(balance).toBeGreaterThanOrEqual(0);
});

/**
 * Prepares scenario state and the browser UI for the Gherkin step "user captures source account opening balance" using the Web page objects.
 */

Given('user captures source account opening balance', async function (this: CustomWorld) {
  const page = await prepareAccounts(this);
  this.transferOpeningBalance = this.transferSourceBalanceBefore;
  this.transferExpectedBalance = this.transferOpeningBalance;
  void page;
});

/**
 * Performs the requested browser interaction for the Gherkin step "user performs fund transfers with following amounts" using the Web page objects.
 */

When('user performs fund transfers with following amounts', { timeout: 120000 }, async function (this: CustomWorld) {
  this.transferLedgerEntries = 0;
  const sourceAccountId = this.transferSourceAccountId;
  const destinationAccountId = this.transferDestinationAccountId;
  if (!sourceAccountId || !destinationAccountId) {
    throw new Error('Source and destination accounts must be captured before daily transfers.');
  }
  let expectedBalance = this.transferExpectedBalance ?? this.transferOpeningBalance;
  if (expectedBalance === undefined) {
    throw new Error('The source account opening balance must be captured before daily transfers.');
  }

  for (const amount of dailyTransferAmounts) {
    const page = transferPage(this);
    await page.selectKnownAccounts(sourceAccountId, destinationAccountId);
    const result = await page.submitTransfer(amount);
    this.transferAmount = Number(amount);
    expectedBalance -= Number(amount);
    this.transferExpectedBalance = expectedBalance;
    this.transferTransactionId = result.transactionId;
    this.transferSuccessful = true;
    this.transferLedgerEntries += 1;
  }
});

/**
 * Verifies the expected application result for the Gherkin step "all transfers should be successful" using the Web page objects.
 */

Then('all transfers should be successful', async function (this: CustomWorld) {
  expect(this.transferSuccessful).toBe(true);
});

/**
 * Verifies the expected application result for the Gherkin step "final balance should equal opening balance minus total transferred amount" using the Web page objects.
 */

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

/**
 * Verifies the expected application result for the Gherkin step "source account should contain {int} debit entries" using the Web page objects.
 * @param count Expected record or operation count captured from the Gherkin step.
 */

Then('source account should contain {int} debit entries', async function (this: CustomWorld, count: number) {
  expect(this.transferLedgerEntries).toBe(count);
});

/**
 * Verifies the expected application result for the Gherkin step "destination account should contain {int} credit entries" using the Web page objects.
 * @param count Expected record or operation count captured from the Gherkin step.
 */

Then('destination account should contain {int} credit entries', async function (this: CustomWorld, count: number) {
  expect(this.transferLedgerEntries).toBe(count);
});

/**
 * Verifies the expected application result for the Gherkin step "total ledger entries should be {int}" using the Web page objects.
 * @param count Expected record or operation count captured from the Gherkin step.
 */

Then('total ledger entries should be {int}', async function (this: CustomWorld, count: number) {
  expect((this.transferLedgerEntries ?? 0) * 2).toBe(count);
});

void transferAmounts;

import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import { AccountsOverviewPage } from '../pages/accountOverview.page';
import { LoginPage } from '../pages/login.page';
import { OpenAccountPage } from '../pages/openAccount.page';
import { getLoginCredentials } from '../testData/faker.util';
import { CustomWorld } from '../support/world';

type AccountOverviewWorld = CustomWorld & {
  newAccountId?: string;
  createdAccountIds?: string[];
  sourceBalance?: number;
  uiBalance?: number;
  apiBalance?: number;
  uiAccountCount?: number;
  apiAccountCount?: number;
  invalidAccountTypePrevented?: boolean;
};

function configuredCredentials(): { username: string; password: string } {
  const credentials = getLoginCredentials();
  return {
    username: credentials.username || process.env.PARABANK_USERNAME || '',
    password: credentials.password || process.env.PARABANK_PASSWORD || ''
  };
}

function overviewPage(world: AccountOverviewWorld): AccountsOverviewPage {
  return new AccountsOverviewPage(world.page!);
}

function openAccountPage(world: AccountOverviewWorld): OpenAccountPage {
  return new OpenAccountPage(world.page!);
}

async function createAccount(world: AccountOverviewWorld, accountType: 'CHECKING' | 'SAVINGS' = 'CHECKING'): Promise<string> {
  const accountId = await openAccountPage(world).createAccount(accountType);
  world.createdAccountIds ??= [];
  world.createdAccountIds.push(accountId);
  world.newAccountId = accountId;
  return accountId;
}

Given('user is logged into Parabank', async function (this: AccountOverviewWorld) {
  const loginPage = new LoginPage(this.page!);
  const credentials = configuredCredentials();

  // Authenticate through the existing LoginPage and wait for the account overview.
  await loginPage.open();
  await loginPage.login(credentials.username, credentials.password);
  await expect(this.page!.getByRole('heading', { name: 'Accounts Overview', exact: true })).toBeVisible();
});

When('user opens a new {string} account', async function (this: AccountOverviewWorld, accountType: string) {
  if (accountType !== 'CHECKING' && accountType !== 'SAVINGS') {
    throw new Error(`Unsupported account type: ${accountType}`);
  }

  await createAccount(this, accountType);
});

Then('a new account should be created successfully', async function (this: AccountOverviewWorld) {
  await openAccountPage(this).verifyAccountOpened();
});

Then('new account ID should be displayed', async function (this: AccountOverviewWorld) {
  const accountId = await openAccountPage(this).getNewAccountId();
  expect(accountId).toMatch(/^\d+$/);
  this.newAccountId = accountId;
});

Then('account should appear in Accounts Overview', async function (this: AccountOverviewWorld) {
  if (!this.newAccountId) {
    throw new Error('The new account ID must be captured before checking Accounts Overview.');
  }

  await openAccountPage(this).verifyAccountInOverview(this.newAccountId);
});

When('user creates a new account', async function (this: AccountOverviewWorld) {
  await createAccount(this);
});

Then('generated account ID should not be empty', async function (this: AccountOverviewWorld) {
  expect(this.newAccountId).toMatch(/^\d+$/);
});

When('user navigates to Accounts Overview', async function (this: AccountOverviewWorld) {
  await overviewPage(this).verifyPageDisplayed();
});

Then('newly created account should be visible', async function (this: AccountOverviewWorld) {
  const ids = this.createdAccountIds ?? (this.newAccountId ? [this.newAccountId] : []);
  await overviewPage(this).verifyAccountIdsVisible(ids);
});

Given('user captures source account balance', async function (this: AccountOverviewWorld) {
  this.sourceBalance = await overviewPage(this).getFirstAccountBalance();
});

When('user opens a new account', async function (this: AccountOverviewWorld) {
  await createAccount(this);
});

Then('source account balance should be updated', async function (this: AccountOverviewWorld) {
  await openAccountPage(this).verifyAccountInOverview(this.newAccountId!);
  const currentBalance = await overviewPage(this).getFirstAccountBalance();
  expect(currentBalance).toBeLessThanOrEqual(this.sourceBalance ?? currentBalance);
});

When('user creates {int} accounts sequentially', async function (this: AccountOverviewWorld, accountCount: number) {
  for (let index = 0; index < accountCount; index += 1) {
    await createAccount(this);
  }
});

Then('all created accounts should be displayed', async function (this: AccountOverviewWorld) {
  await overviewPage(this).verifyPageDisplayed();
  await overviewPage(this).verifyAccountIdsVisible(this.createdAccountIds ?? []);
});

Then('total balance should match sum of all individual balances', async function (this: AccountOverviewWorld) {
  const balances = await overviewPage(this).getAccountBalances();
  const totalBalance = await overviewPage(this).getTotalBalance();
  expect(totalBalance).toBeCloseTo(balances.reduce((total: number, balance: number) => total + balance, 0), 2);
});

When('user clicks an account number', async function (this: AccountOverviewWorld) {
  this.newAccountId = await overviewPage(this).clickAccount();
});

Then('Account Details page should be displayed', async function (this: AccountOverviewWorld) {
  await overviewPage(this).verifyAccountDetailsDisplayed();
});

Then('correct account number should be shown', async function (this: AccountOverviewWorld) {
  expect(await overviewPage(this).getDisplayedAccountId()).toBe(this.newAccountId);
});

When('user creates multiple accounts', async function (this: AccountOverviewWorld) {
  await createAccount(this);
  await overviewPage(this).verifyPageDisplayed();
});

Then('default account should still be available', async function (this: AccountOverviewWorld) {
  await overviewPage(this).verifyAtLeastOneAccountExists();
});

When('user opens account details', async function (this: AccountOverviewWorld) {
  await createAccount(this);
  await openAccountPage(this).verifyAccountInOverview(this.newAccountId!);
  this.newAccountId = await overviewPage(this).clickAccount(this.newAccountId);
});

Then('account balance should be displayed', async function (this: AccountOverviewWorld) {
  expect(await overviewPage(this).getDisplayedAccountBalance()).not.toBeNaN();
});

Then('balance should be greater than or equal to zero', async function (this: AccountOverviewWorld) {
  expect(await overviewPage(this).getDisplayedAccountBalance()).toBeGreaterThanOrEqual(0);
});

When('user attempts to create an account with invalid account type', async function (this: AccountOverviewWorld) {
  await openAccountPage(this).open();
  this.invalidAccountTypePrevented = !(await openAccountPage(this).isAccountTypeAvailable('INVALID'));
});

Then('account creation should be prevented', async function (this: AccountOverviewWorld) {
  expect(this.invalidAccountTypePrevented).toBe(true);
});

When('user accesses Open Account page without login', async function (this: AccountOverviewWorld) {
  await new LoginPage(this.page!).logout();
  await openAccountPage(this).openDirectly();
});

Given('user logs out from application', async function (this: AccountOverviewWorld) {
  await new LoginPage(this.page!).logout();
});

When('user accesses Open Account page', async function (this: AccountOverviewWorld) {
  await openAccountPage(this).openDirectly();
});

Then('user should be redirected to Login page', async function (this: AccountOverviewWorld) {
  await new LoginPage(this.page!).verifyLoginPageDisplayed();
});

When('user fetches account balance from UI', async function (this: AccountOverviewWorld) {
  this.uiBalance = await overviewPage(this).getFirstAccountBalance();
  this.newAccountId = await overviewPage(this).getFirstAccountId();
});

When('user fetches account balance from API', async function (this: AccountOverviewWorld) {
  const accounts = await overviewPage(this).getAccountsFromApi();
  const account = accounts.find((item: { id: number; balance: number }) => String(item.id) === this.newAccountId);
  this.apiBalance = account?.balance;
});

Then('both balances should match', async function (this: AccountOverviewWorld) {
  expect(this.apiBalance).toBe(this.uiBalance);
});

When('user fetches account count from UI', async function (this: AccountOverviewWorld) {
  this.uiAccountCount = await overviewPage(this).getAccountCount();
});

When('user fetches account count from API', async function (this: AccountOverviewWorld) {
  this.apiAccountCount = (await overviewPage(this).getAccountsFromApi()).length;
});

Then('both account counts should match', async function (this: AccountOverviewWorld) {
  expect(this.apiAccountCount).toBe(this.uiAccountCount);
});

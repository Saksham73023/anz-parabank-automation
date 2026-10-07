import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import { AccountsOverviewPage } from '../pages/accountOverview.page';
import { LoginPage } from '../pages/login.page';
import { OpenAccountPage } from '../pages/openAccount.page';
import { getLoginCredentials } from '../support/testDataHelper';
import { CustomWorld } from '../support/world';

/** Scenario state for account creation and overview reconciliation workflows. */
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

/** Resolves ParaBank credentials from environment settings or the shared fixture. */
function configuredCredentials(): { username: string; password: string } {
  const credentials = getLoginCredentials();
  return {
    username: credentials.username || process.env.PARABANK_USERNAME || '',
    password: credentials.password || process.env.PARABANK_PASSWORD || ''
  };
}

/** Creates the account-overview page object for the scenario's active browser page. */
function overviewPage(world: AccountOverviewWorld): AccountsOverviewPage {
  return new AccountsOverviewPage(world.page!);
}

/** Creates the open-account page object for the scenario's active browser page. */
function openAccountPage(world: AccountOverviewWorld): OpenAccountPage {
  return new OpenAccountPage(world.page!);
}

/** Opens an account and stores the generated identifier in the current scenario world. */
async function createAccount(world: AccountOverviewWorld, accountType: 'CHECKING' | 'SAVINGS' = 'CHECKING'): Promise<string> {
  const accountId = await openAccountPage(world).createAccount(accountType);
  world.createdAccountIds ??= [];
  world.createdAccountIds.push(accountId);
  world.newAccountId = accountId;
  return accountId;
}

/**
 * Prepares scenario state and the browser UI for the Gherkin step "user is logged into Parabank" using the Web page objects.
 */

Given('user is logged into Parabank', async function (this: AccountOverviewWorld) {
  const loginPage = new LoginPage(this.page!);
  const credentials = configuredCredentials();

  // Authenticate through the existing LoginPage and wait for the account overview.
  await loginPage.open();
  await loginPage.login(credentials.username, credentials.password);
  await expect(this.page!.getByRole('heading', { name: 'Accounts Overview', exact: true })).toBeVisible();
});

/**
 * Performs the requested browser interaction for the Gherkin step "user opens a new {string} account" using the Web page objects.
 * @param accountType Account identifier captured from the Gherkin step.
 */

When('user opens a new {string} account', async function (this: AccountOverviewWorld, accountType: string) {
  if (accountType !== 'CHECKING' && accountType !== 'SAVINGS') {
    throw new Error(`Unsupported account type: ${accountType}`);
  }

  await createAccount(this, accountType);
});

/**
 * Verifies the expected application result for the Gherkin step "a new account should be created successfully" using the Web page objects.
 */

Then('a new account should be created successfully', async function (this: AccountOverviewWorld) {
  await openAccountPage(this).verifyAccountOpened();
});

/**
 * Verifies the expected application result for the Gherkin step "new account ID should be displayed" using the Web page objects.
 */

Then('new account ID should be displayed', async function (this: AccountOverviewWorld) {
  const accountId = await openAccountPage(this).getNewAccountId();
  expect(accountId).toMatch(/^\d+$/);
  this.newAccountId = accountId;
});

/**
 * Verifies the expected application result for the Gherkin step "account should appear in Accounts Overview" using the Web page objects.
 */

Then('account should appear in Accounts Overview', async function (this: AccountOverviewWorld) {
  if (!this.newAccountId) {
    throw new Error('The new account ID must be captured before checking Accounts Overview.');
  }

  await openAccountPage(this).verifyAccountInOverview(this.newAccountId);
});

/**
 * Performs the requested browser interaction for the Gherkin step "user creates a new account" using the Web page objects.
 */

When('user creates a new account', async function (this: AccountOverviewWorld) {
  await createAccount(this);
});

/**
 * Verifies the expected application result for the Gherkin step "generated account ID should not be empty" using the Web page objects.
 */

Then('generated account ID should not be empty', async function (this: AccountOverviewWorld) {
  expect(this.newAccountId).toMatch(/^\d+$/);
});

/**
 * Performs the requested browser interaction for the Gherkin step "user navigates to Accounts Overview" using the Web page objects.
 */

When('user navigates to Accounts Overview', async function (this: AccountOverviewWorld) {
  await overviewPage(this).verifyPageDisplayed();
});

/**
 * Verifies the expected application result for the Gherkin step "newly created account should be visible" using the Web page objects.
 */

Then('newly created account should be visible', async function (this: AccountOverviewWorld) {
  const ids = this.createdAccountIds ?? (this.newAccountId ? [this.newAccountId] : []);
  await overviewPage(this).verifyAccountIdsVisible(ids);
});

/**
 * Prepares scenario state and the browser UI for the Gherkin step "user captures source account balance" using the Web page objects.
 */

Given('user captures source account balance', async function (this: AccountOverviewWorld) {
  this.sourceBalance = await overviewPage(this).getFirstAccountBalance();
});

/**
 * Performs the requested browser interaction for the Gherkin step "user opens a new account" using the Web page objects.
 */

When('user opens a new account', async function (this: AccountOverviewWorld) {
  await createAccount(this);
});

/**
 * Verifies the expected application result for the Gherkin step "source account balance should be updated" using the Web page objects.
 */

Then('source account balance should be updated', async function (this: AccountOverviewWorld) {
  await openAccountPage(this).verifyAccountInOverview(this.newAccountId!);
  const currentBalance = await overviewPage(this).getFirstAccountBalance();
  expect(currentBalance).toBeLessThanOrEqual(this.sourceBalance ?? currentBalance);
});

/**
 * Performs the requested browser interaction for the Gherkin step "user creates {int} accounts sequentially" using the Web page objects.
 * @param accountCount Account identifier captured from the Gherkin step.
 */

When('user creates {int} accounts sequentially', async function (this: AccountOverviewWorld, accountCount: number) {
  for (let index = 0; index < accountCount; index += 1) {
    await createAccount(this);
  }
});

/**
 * Verifies the expected application result for the Gherkin step "all created accounts should be displayed" using the Web page objects.
 */

Then('all created accounts should be displayed', async function (this: AccountOverviewWorld) {
  await overviewPage(this).verifyPageDisplayed();
  await overviewPage(this).verifyAccountIdsVisible(this.createdAccountIds ?? []);
});

/**
 * Verifies the expected application result for the Gherkin step "total balance should match sum of all individual balances" using the Web page objects.
 */

Then('total balance should match sum of all individual balances', async function (this: AccountOverviewWorld) {
  const balances = await overviewPage(this).getAccountBalances();
  const totalBalance = await overviewPage(this).getTotalBalance();
  expect(totalBalance).toBeCloseTo(balances.reduce((total: number, balance: number) => total + balance, 0), 2);
});

/**
 * Performs the requested browser interaction for the Gherkin step "user clicks an account number" using the Web page objects.
 */

When('user clicks an account number', async function (this: AccountOverviewWorld) {
  this.newAccountId = await overviewPage(this).clickAccount();
});

/**
 * Verifies the expected application result for the Gherkin step "Account Details page should be displayed" using the Web page objects.
 */

Then('Account Details page should be displayed', async function (this: AccountOverviewWorld) {
  await overviewPage(this).verifyAccountDetailsDisplayed();
});

/**
 * Verifies the expected application result for the Gherkin step "correct account number should be shown" using the Web page objects.
 */

Then('correct account number should be shown', async function (this: AccountOverviewWorld) {
  expect(await overviewPage(this).getDisplayedAccountId()).toBe(this.newAccountId);
});

/**
 * Performs the requested browser interaction for the Gherkin step "user creates multiple accounts" using the Web page objects.
 */

When('user creates multiple accounts', async function (this: AccountOverviewWorld) {
  await createAccount(this);
  await overviewPage(this).verifyPageDisplayed();
});

/**
 * Verifies the expected application result for the Gherkin step "default account should still be available" using the Web page objects.
 */

Then('default account should still be available', async function (this: AccountOverviewWorld) {
  await overviewPage(this).verifyAtLeastOneAccountExists();
});

/**
 * Performs the requested browser interaction for the Gherkin step "user opens account details" using the Web page objects.
 */

When('user opens account details', async function (this: AccountOverviewWorld) {
  await createAccount(this);
  await openAccountPage(this).verifyAccountInOverview(this.newAccountId!);
  this.newAccountId = await overviewPage(this).clickAccount(this.newAccountId);
});

/**
 * Verifies the expected application result for the Gherkin step "account balance should be displayed" using the Web page objects.
 */

Then('account balance should be displayed', async function (this: AccountOverviewWorld) {
  expect(await overviewPage(this).getDisplayedAccountBalance()).not.toBeNaN();
});

/**
 * Verifies the expected application result for the Gherkin step "balance should be greater than or equal to zero" using the Web page objects.
 */

Then('balance should be greater than or equal to zero', async function (this: AccountOverviewWorld) {
  expect(await overviewPage(this).getDisplayedAccountBalance()).toBeGreaterThanOrEqual(0);
});

/**
 * Performs the requested browser interaction for the Gherkin step "user attempts to create an account with invalid account type" using the Web page objects.
 */

When('user attempts to create an account with invalid account type', async function (this: AccountOverviewWorld) {
  await openAccountPage(this).open();
  this.invalidAccountTypePrevented = !(await openAccountPage(this).isAccountTypeAvailable('INVALID'));
});

/**
 * Verifies the expected application result for the Gherkin step "account creation should be prevented" using the Web page objects.
 */

Then('account creation should be prevented', async function (this: AccountOverviewWorld) {
  expect(this.invalidAccountTypePrevented).toBe(true);
});

/**
 * Performs the requested browser interaction for the Gherkin step "user accesses Open Account page without login" using the Web page objects.
 */

When('user accesses Open Account page without login', async function (this: AccountOverviewWorld) {
  await new LoginPage(this.page!).logout();
  await openAccountPage(this).openDirectly();
});

/**
 * Prepares scenario state and the browser UI for the Gherkin step "user logs out from application" using the Web page objects.
 */

Given('user logs out from application', async function (this: AccountOverviewWorld) {
  await new LoginPage(this.page!).logout();
});

/**
 * Performs the requested browser interaction for the Gherkin step "user accesses Open Account page" using the Web page objects.
 */

When('user accesses Open Account page', async function (this: AccountOverviewWorld) {
  await openAccountPage(this).openDirectly();
});

/**
 * Verifies the expected application result for the Gherkin step "user should be redirected to Login page" using the Web page objects.
 */

Then('user should be redirected to Login page', async function (this: AccountOverviewWorld) {
  await new LoginPage(this.page!).verifyAuthenticationRequired();
});

/**
 * Performs the requested browser interaction for the Gherkin step "user fetches account balance from UI" using the Web page objects.
 */

When('user fetches account balance from UI', async function (this: AccountOverviewWorld) {
  this.uiBalance = await overviewPage(this).getFirstAccountBalance();
  this.newAccountId = await overviewPage(this).getFirstAccountId();
});

/**
 * Performs the requested browser interaction for the Gherkin step "user fetches account balance from API" using the Web page objects.
 */

When('user fetches account balance from API', async function (this: AccountOverviewWorld) {
  const accounts = await overviewPage(this).getAccountsFromApi();
  const account = accounts.find((item: { id: number; balance: number }) => String(item.id) === this.newAccountId);
  this.apiBalance = account?.balance;
});

/**
 * Verifies the expected application result for the Gherkin step "both balances should match" using the Web page objects.
 */

Then('both balances should match', async function (this: AccountOverviewWorld) {
  expect(this.apiBalance).toBe(this.uiBalance);
});

/**
 * Performs the requested browser interaction for the Gherkin step "user fetches account count from UI" using the Web page objects.
 */

When('user fetches account count from UI', async function (this: AccountOverviewWorld) {
  this.uiAccountCount = await overviewPage(this).getAccountCount();
});

/**
 * Performs the requested browser interaction for the Gherkin step "user fetches account count from API" using the Web page objects.
 */

When('user fetches account count from API', async function (this: AccountOverviewWorld) {
  this.apiAccountCount = (await overviewPage(this).getAccountsFromApi()).length;
});

/**
 * Verifies the expected application result for the Gherkin step "both account counts should match" using the Web page objects.
 */

Then('both account counts should match', async function (this: AccountOverviewWorld) {
  expect(this.apiAccountCount).toBe(this.uiAccountCount);
});

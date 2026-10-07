import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import { LoginPage } from '../pages/login.page';
import { OpenAccountPage } from '../pages/openAccount.page';
import { getLoginCredentials } from '../support/testDataHelper';
import { CustomWorld } from '../support/world';

/** Scenario state for the open-account flow, including the generated account ID. */
type AccountScenarioWorld = CustomWorld & { newAccountId?: string };

/** Resolves the account-flow credentials from environment overrides or shared test data. */
function configuredCredentials(): { username: string; password: string } {
  const credentials = getLoginCredentials();
  return {
    username: process.env.PARABANK_USERNAME || credentials.username,
    password: process.env.PARABANK_PASSWORD || credentials.password
  };
}

/**
 * Prepares scenario state and the browser UI for the Gherkin step "I am logged in with the existing ParaBank user" using the Web page objects.
 */

Given('I am logged in with the existing ParaBank user', async function (this: AccountScenarioWorld) {
  const loginPage = new LoginPage(this.page!);
  const credentials = configuredCredentials();

  // Reuse the existing login page object so this scenario uses the same credentials flow.
  await loginPage.open();
  await loginPage.login(credentials.username, credentials.password);
  await expect(this.page!.getByRole('heading', { name: 'Accounts Overview', exact: true })).toBeVisible();
});

/**
 * Performs the requested browser interaction for the Gherkin step "I open the Open New Account page" using the Web page objects.
 */

When('I open the Open New Account page', async function (this: AccountScenarioWorld) {
  await new OpenAccountPage(this.page!).open();
});

/**
 * Performs the requested browser interaction for the Gherkin step "I select the CHECKING account type" using the Web page objects.
 */

When('I select the CHECKING account type', async function (this: AccountScenarioWorld) {
  await new OpenAccountPage(this.page!).selectCheckingAccount();
});

/**
 * Performs the requested browser interaction for the Gherkin step "I select the first available funding account" using the Web page objects.
 */

When('I select the first available funding account', async function (this: AccountScenarioWorld) {
  await new OpenAccountPage(this.page!).selectFirstFundingAccount();
});

/**
 * Performs the requested browser interaction for the Gherkin step "I submit the new account request" using the Web page objects.
 */

When('I submit the new account request', async function (this: AccountScenarioWorld) {
  await new OpenAccountPage(this.page!).submit();
});

/**
 * Verifies the expected application result for the Gherkin step "the account opened success message should be displayed" using the Web page objects.
 */

Then('the account opened success message should be displayed', async function (this: AccountScenarioWorld) {
  await new OpenAccountPage(this.page!).verifyAccountOpened();
});

/**
 * Verifies the expected application result for the Gherkin step "a new account ID should be generated" using the Web page objects.
 */

Then('a new account ID should be generated', async function (this: AccountScenarioWorld) {
  this.newAccountId = await new OpenAccountPage(this.page!).getNewAccountId();
  expect(this.newAccountId).toMatch(/^\d+$/);
});

/**
 * Verifies the expected application result for the Gherkin step "the new account ID should be visible in Accounts Overview" using the Web page objects.
 */

Then('the new account ID should be visible in Accounts Overview', async function (this: AccountScenarioWorld) {
  if (!this.newAccountId) {
    throw new Error('The new account ID must be generated before verifying Accounts Overview.');
  }

  await new OpenAccountPage(this.page!).verifyAccountInOverview(this.newAccountId);
});
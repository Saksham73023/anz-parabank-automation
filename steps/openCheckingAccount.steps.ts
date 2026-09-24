import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import { LoginPage } from '../pages/login.page';
import { OpenAccountPage } from '../pages/openAccount.page';
import { getLoginCredentials } from '../testData/faker.util';
import { CustomWorld } from '../support/world';

type AccountScenarioWorld = CustomWorld & { newAccountId?: string };

function configuredCredentials(): { username: string; password: string } {
  const credentials = getLoginCredentials();
  return {
    username: process.env.PARABANK_USERNAME || credentials.username,
    password: process.env.PARABANK_PASSWORD || credentials.password
  };
}

Given('I am logged in with the existing ParaBank user', async function (this: AccountScenarioWorld) {
  const loginPage = new LoginPage(this.page!);
  const credentials = configuredCredentials();

  // Reuse the existing login page object so this scenario uses the same credentials flow.
  await loginPage.open();
  await loginPage.login(credentials.username, credentials.password);
  await expect(this.page!.getByRole('heading', { name: 'Accounts Overview', exact: true })).toBeVisible();
});

When('I open the Open New Account page', async function (this: AccountScenarioWorld) {
  await new OpenAccountPage(this.page!).open();
});

When('I select the CHECKING account type', async function (this: AccountScenarioWorld) {
  await new OpenAccountPage(this.page!).selectCheckingAccount();
});

When('I select the first available funding account', async function (this: AccountScenarioWorld) {
  await new OpenAccountPage(this.page!).selectFirstFundingAccount();
});

When('I submit the new account request', async function (this: AccountScenarioWorld) {
  await new OpenAccountPage(this.page!).submit();
});

Then('the account opened success message should be displayed', async function (this: AccountScenarioWorld) {
  await new OpenAccountPage(this.page!).verifyAccountOpened();
});

Then('a new account ID should be generated', async function (this: AccountScenarioWorld) {
  this.newAccountId = await new OpenAccountPage(this.page!).getNewAccountId();
  expect(this.newAccountId).toMatch(/^\d+$/);
});

Then('the new account ID should be visible in Accounts Overview', async function (this: AccountScenarioWorld) {
  if (!this.newAccountId) {
    throw new Error('The new account ID must be generated before verifying Accounts Overview.');
  }

  await new OpenAccountPage(this.page!).verifyAccountInOverview(this.newAccountId);
});
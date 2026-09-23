import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import { CustomWorld } from '../support/world';
import { LoginPage } from '../pages/login.page';
import { getLoginCredentials } from '../testData/faker.util';

function configuredCredentials(): { username: string; password: string } {
  const credentials = getLoginCredentials();
  return {
    username: credentials.username || process.env.PARABANK_USERNAME || '',
    password: credentials.password || process.env.PARABANK_PASSWORD || ''
  };
}

Given('I am on the ParaBank login page', async function (this: CustomWorld) {
  await new LoginPage(this.page!).open();
});

When('I log in with the configured ParaBank credentials', async function (this: CustomWorld) {
  const credentials = configuredCredentials();
  await new LoginPage(this.page!).login(
    credentials.username,
    credentials.password
  );
});

Given('User is on Login page', async function (this: CustomWorld) {
  await new LoginPage(this.page!).open();
});

When('User enters valid username and invalid password', async function (this: CustomWorld) {
  const loginPage = new LoginPage(this.page!);
  await loginPage.fillCredentials(configuredCredentials().username, 'invalid-password');
});

When('User enters invalid username and valid password', async function (this: CustomWorld) {
  const loginPage = new LoginPage(this.page!);
  await loginPage.fillCredentials(`invalid-${Date.now()}`, configuredCredentials().password);
});

When('User clicks Login button', async function (this: CustomWorld) {
  await new LoginPage(this.page!).clickLogin();
});

When('User clicks Login button without entering credentials', async function (this: CustomWorld) {
  await new LoginPage(this.page!).clickLogin();
});

Then('Error message should be displayed', async function (this: CustomWorld) {
  await new LoginPage(this.page!).verifyLoginError();
});

Given('User is logged into application', async function (this: CustomWorld) {
  const loginPage = new LoginPage(this.page!);
  const credentials = configuredCredentials();
  await loginPage.open();
  await loginPage.login(credentials.username, credentials.password);
  await this.page!.getByRole('heading', { name: 'Accounts Overview', exact: true }).waitFor();
});

When('User clicks Logout', async function (this: CustomWorld) {
  await new LoginPage(this.page!).logout();
});

Then('User should be redirected to Login page', async function (this: CustomWorld) {
  await new LoginPage(this.page!).verifyLoginPageDisplayed();
});
Then('I should see the ParaBank account overview', async function (this: CustomWorld) {
  await expect(this.page!.getByRole('heading', { name: 'Accounts Overview', exact: true })).toBeVisible();
});
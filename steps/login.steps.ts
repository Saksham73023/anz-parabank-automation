import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import { CustomWorld } from '../support/world';
import { LoginPage } from '../pages/login.page';
import { getLoginCredentials } from '../testData/faker.util';

// Fetch login credentials either from test data utility
// or fallback to environment variables.
function configuredCredentials(): { username: string; password: string } {
  const credentials = getLoginCredentials();
  return {
    username: credentials.username || process.env.PARABANK_USERNAME || '',
    password: credentials.password || process.env.PARABANK_PASSWORD || ''
  };
}

// Navigate user to ParaBank login page.
Given('I am on the ParaBank login page', async function (this: CustomWorld) {
  await new LoginPage(this.page!).open();
});

// Login using configured credentials.
When('I log in with the configured ParaBank credentials', async function (this: CustomWorld) {
  const credentials = configuredCredentials();
  await new LoginPage(this.page!).login(
    credentials.username,
    credentials.password
  );
});

// Open login page before executing login-related scenarios.
Given('User is on Login page', async function (this: CustomWorld) {
  await new LoginPage(this.page!).open();
});

// Enter valid username and invalid password.
When('User enters valid username and invalid password', async function (this: CustomWorld) {
  const loginPage = new LoginPage(this.page!);
  await loginPage.fillCredentials(configuredCredentials().username, 'invalid-password');
});

// Enter invalid username and valid password.
When('User enters invalid username and valid password', async function (this: CustomWorld) {
  const loginPage = new LoginPage(this.page!);
  await loginPage.fillCredentials(`invalid-${Date.now()}`, configuredCredentials().password);
});

// Click on Login button.
When('User clicks Login button', async function (this: CustomWorld) {
  await new LoginPage(this.page!).clickLogin();
});

// Attempt login without providing credentials.
When('User clicks Login button without entering credentials', async function (this: CustomWorld) {
  await new LoginPage(this.page!).clickLogin();
});

// Verify login error message is displayed
Then('Error message should be displayed', async function (this: CustomWorld) {
  await new LoginPage(this.page!).verifyLoginError();
});

// Login with valid user and ensure application home page is displayed
Given('User is logged into application', async function (this: CustomWorld) {
  const loginPage = new LoginPage(this.page!);
  const credentials = configuredCredentials();
  await loginPage.open();
  await loginPage.login(credentials.username, credentials.password);
  await this.page!.getByRole('heading', { name: 'Accounts Overview', exact: true }).waitFor();
});

// Logout from the application.
When('User clicks Logout', async function (this: CustomWorld) {
  await new LoginPage(this.page!).logout();
});

// Verify user is redirected back to login page.
Then('User should be redirected to Login page', async function (this: CustomWorld) {
  await new LoginPage(this.page!).verifyLoginPageDisplayed();
});

// Verify Accounts Overview page is displayed after successful login.
Then('I should see the ParaBank account overview', async function (this: CustomWorld) {
  await expect(this.page!.getByRole('heading', { name: 'Accounts Overview', exact: true })).toBeVisible();
});
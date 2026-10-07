import { Given, Then, When } from '@cucumber/cucumber';
import { CustomWorld } from '../support/world';
import { LoginPage } from '../pages/login.page';
import { getLoginCredentials, getValidationMessages } from '../support/testDataHelper';
import { createRandomUsername, createRuntimeValue } from '../testData/dynamicData';

// Fetch login credentials either from test data utility
// or fallback to environment variables.
/** Resolves login credentials from environment overrides or the shared ParaBank fixture. */
function configuredCredentials(): { username: string; password: string } {
  const credentials = getLoginCredentials();
  const username = process.env.PARABANK_USERNAME?.trim() || credentials.username;
  const password = process.env.PARABANK_PASSWORD || credentials.password;

  if (!username || !password) {
    throw new Error('Valid ParaBank login credentials are not configured.');
  }

  return { username, password };
}

// Navigate user to ParaBank login page.
/**
 * Prepares scenario state and the browser UI for the Gherkin step "I am on the ParaBank login page" using the Web page objects.
 */

Given('I am on the ParaBank login page', async function (this: CustomWorld) {
  await new LoginPage(this.page!).open();
});

// Login using configured credentials.
/**
 * Performs the requested browser interaction for the Gherkin step "I log in with the configured ParaBank credentials" using the Web page objects.
 */

When('I log in with the configured ParaBank credentials', async function (this: CustomWorld) {
  const credentials = configuredCredentials();
  await new LoginPage(this.page!).login(
    credentials.username,
    credentials.password
  );
});

// Open login page before executing login-related scenarios.
/**
 * Prepares scenario state and the browser UI for the Gherkin step "User is on Login page" using the Web page objects.
 */

Given('User is on Login page', async function (this: CustomWorld) {
  await new LoginPage(this.page!).open();
});

// Enter valid username and invalid password.
/**
 * Performs the requested browser interaction for the Gherkin step "User enters valid username and invalid password" using the Web page objects.
 */

When('User enters valid username and invalid password', async function (this: CustomWorld) {
  const loginPage = new LoginPage(this.page!);
  const credentials = configuredCredentials();
  await loginPage.fillCredentials(credentials.username, createRuntimeValue());
});

// Enter invalid username and valid password.
/**
 * Performs the requested browser interaction for the Gherkin step "User enters invalid username and valid password" using the Web page objects.
 */

When('User enters invalid username and valid password', async function (this: CustomWorld) {
  const loginPage = new LoginPage(this.page!);
  const credentials = configuredCredentials();
  await loginPage.fillCredentials(createRandomUsername('invalid'), credentials.password);
});

/**
 * Performs the requested browser interaction for the Gherkin step "User enters invalid username and invalid password" using the Web page objects.
 */

When('User enters invalid username and invalid password', async function (this: CustomWorld) {
  const loginPage = new LoginPage(this.page!);
  const credentials = configuredCredentials();
  await loginPage.fillCredentials(
    createRandomUsername('invalid'),
    `${credentials.password}-${createRuntimeValue()}`
  );
});

// Click on Login button.
/**
 * Performs the requested browser interaction for the Gherkin step "User clicks Login button" using the Web page objects.
 */

When('User clicks Login button', async function (this: CustomWorld) {
  await new LoginPage(this.page!).clickLogin();
});

// Attempt login without providing credentials.
/**
 * Performs the requested browser interaction for the Gherkin step "User clicks Login button without entering credentials" using the Web page objects.
 */

When('User clicks Login button without entering credentials', async function (this: CustomWorld) {
  await new LoginPage(this.page!).clickLogin();
});

// Verify login error message is displayed
/**
 * Verifies the expected application result for the Gherkin step "Invalid login error should be displayed" using the Web page objects.
 */

Then('Invalid login error should be displayed', async function (this: CustomWorld) {
  await new LoginPage(this.page!).verifyLoginRejected(
    getValidationMessages().login.invalidCredentials
  );
});

/**
 * Verifies the expected application result for the Gherkin step "Login should remain unauthenticated" using the Web page objects.
 */

Then('Login should remain unauthenticated', async function (this: CustomWorld) {
  await new LoginPage(this.page!).verifyBlankLoginRemainsUnauthenticated();
});

// Login with valid user and ensure application home page is displayed
/**
 * Prepares scenario state and the browser UI for the Gherkin step "User is logged into application" using the Web page objects.
 */

Given('User is logged into application', async function (this: CustomWorld) {
  const loginPage = new LoginPage(this.page!);
  const credentials = configuredCredentials();
  await loginPage.open();
  await loginPage.login(credentials.username, credentials.password);
  await loginPage.verifyLoginSucceeded();
});

// Logout from the application.
/**
 * Performs the requested browser interaction for the Gherkin step "User clicks Logout" using the Web page objects.
 */

When('User clicks Logout', async function (this: CustomWorld) {
  await new LoginPage(this.page!).logout();
});

// Verify user is redirected back to login page.
/**
 * Verifies the expected application result for the Gherkin step "User should be redirected to Login page" using the Web page objects.
 */

Then('User should be redirected to Login page', async function (this: CustomWorld) {
  await new LoginPage(this.page!).verifyLoginPageDisplayed();
});

/**
 * Verifies the expected application result for the Gherkin step "protected account pages should require login" using the Web page objects.
 */

Then('protected account pages should require login', async function (this: CustomWorld) {
  await new LoginPage(this.page!).verifyProtectedPageRequiresLogin();
});

// Verify Accounts Overview page is displayed after successful login.
/**
 * Verifies the expected application result for the Gherkin step "I should see the ParaBank account overview" using the Web page objects.
 */

Then('I should see the ParaBank account overview', async function (this: CustomWorld) {
  await new LoginPage(this.page!).verifyLoginSucceeded();
});
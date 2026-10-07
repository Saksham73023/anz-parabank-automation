import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import { AccountsOverviewPage } from '../pages/accountOverview.page';
import { LoginPage } from '../pages/login.page';
import { RegistrationPage } from '../pages/registration.page';
import { createRegistrationData } from '../testData/dynamicData';
import { getCommonMessages, getLoginCredentials, getRegistrationData, getRegistrationValidation, getValidationMessages } from '../support/testDataHelper';
import { CustomWorld } from '../support/world';

/**
 * Prepares scenario state and the browser UI for the Gherkin step "I am on the ParaBank registration page" using the Web page objects.
 */

Given('I am on the ParaBank registration page', async function (this: CustomWorld) {
    await new RegistrationPage(this.page!).open();
});

/**
 * Performs the requested browser interaction for the Gherkin step "I register a new ParaBank customer with Faker data" using the Web page objects.
 */

When('I register a new ParaBank customer with Faker data', async function (this: CustomWorld) {
    const registrationPage = new RegistrationPage(this.page!);
    await registrationPage.register(createRegistrationData(), getCommonMessages().registrationSuccess);
});

/**
 * Verifies the expected application result for the Gherkin step "the new customer should be automatically logged in" using the Web page objects.
 */

Then('the new customer should be automatically logged in', async function (this: CustomWorld) {
    await expect(this.page!.getByRole('link', { name: 'Log Out' })).toBeVisible();
    await expect(this.page!.getByText(getCommonMessages().registrationSuccess)).toBeVisible();
});

/**
 * Verifies the expected application result for the Gherkin step "the Accounts Overview page should be displayed" using the Web page objects.
 */

Then('the Accounts Overview page should be displayed', async function (this: CustomWorld) {
    await new AccountsOverviewPage(this.page!).verifyPageDisplayed();
});

/**
 * Verifies the expected application result for the Gherkin step "at least one default account should be created" using the Web page objects.
 */

Then('at least one default account should be created', async function (this: CustomWorld) {
    await new AccountsOverviewPage(this.page!).verifyAtLeastOneAccountExists();
});

/**
 * Verifies the expected application result for the Gherkin step "the account number should be visible" using the Web page objects.
 */

Then('the account number should be visible', async function (this: CustomWorld) {
    await new AccountsOverviewPage(this.page!).verifyAccountNumberIsVisible();
});

/**
 * Verifies the expected application result for the Gherkin step "the account balance should not be empty or zero" using the Web page objects.
 */

Then('the account balance should not be empty or zero', async function (this: CustomWorld) {
    await new AccountsOverviewPage(this.page!).verifyAccountBalanceIsValid();
});

/**
 * Prepares scenario state and the browser UI for the Gherkin step "Existing user already exists" using the Web page objects.
 */

Given('Existing user already exists', async function (this: CustomWorld) {
    const credentials = getLoginCredentials();
    const loginPage = new LoginPage(this.page!);
    await loginPage.open();
    await loginPage.login(credentials.username, credentials.password);
    await expect(this.page!.getByRole('link', { name: 'Log Out' })).toBeVisible();
    await loginPage.logout();

    const registrationPage = new RegistrationPage(this.page!);
    await registrationPage.open();
    this.registrationData = createRegistrationData({ username: credentials.username });
});

/**
 * Performs the requested browser interaction for the Gherkin step "User registers with same username" using the Web page objects.
 */

When('User registers with same username', async function (this: CustomWorld) {
    const registrationPage = new RegistrationPage(this.page!);
    await registrationPage.fillRegistrationForm(this.registrationData!);
    await registrationPage.submit();
});

/**
 * Verifies the expected application result for the Gherkin step "Username already exists error should be displayed" using the Web page objects.
 */

Then('Username already exists error should be displayed', async function (this: CustomWorld) {
    await expect(this.page!.locator('.error:visible')).toContainText(getValidationMessages().usernameAlreadyExists);
});

/**
 * Prepares scenario state and the browser UI for the Gherkin step "User is on Registration page" using the Web page objects.
 */

Given('User is on Registration page', async function (this: CustomWorld) {
    await new RegistrationPage(this.page!).open();
});

/**
 * Performs the requested browser interaction for the Gherkin step "User submits registration form without entering mandatory data" using the Web page objects.
 */

When('User submits registration form without entering mandatory data', async function (this: CustomWorld) {
    await new RegistrationPage(this.page!).submit();
});

/**
 * Verifies the expected application result for the Gherkin step "Required field validation messages should be displayed" using the Web page objects.
 */

Then('Required field validation messages should be displayed', async function (this: CustomWorld) {
    const errors = this.page!.locator('.error:visible');
    await expect(errors).toContainText(getRegistrationValidation().requiredFields);
});

/**
 * Performs the requested browser interaction for the Gherkin step "User enters different password and confirm password" using the Web page objects.
 */

When('User enters different password and confirm password', async function (this: CustomWorld) {
    const registrationPage = new RegistrationPage(this.page!);
    const data = createRegistrationData();
    await registrationPage.fillRegistrationForm(data, `${data.password}-different`);
    await registrationPage.submit();
});

/**
 * Verifies the expected application result for the Gherkin step "Password mismatch error should be displayed" using the Web page objects.
 */

Then('Password mismatch error should be displayed', async function (this: CustomWorld) {
    await expect(this.page!.locator('.error:visible'))
        .toContainText(getRegistrationValidation().passwordMismatch);
});

/**
 * Prepares scenario state and the browser UI for the Gherkin step "User has registered successfully" using the Web page objects.
 */

Given('User has registered successfully', async function (this: CustomWorld) {
    const registrationPage = new RegistrationPage(this.page!);
    await registrationPage.open();
    await registrationPage.register(createRegistrationData(), getCommonMessages().registrationSuccess);
});

/**
 * Verifies the expected application result for the Gherkin step "Accounts Overview page should display" using the Web page objects.
 */

Then('Accounts Overview page should display', async function (this: CustomWorld) {
    await new AccountsOverviewPage(this.page!).verifyPageDisplayed();
});

/**
 * Verifies the expected application result for the Gherkin step "At least one account should exist" using the Web page objects.
 */

Then('At least one account should exist', async function (this: CustomWorld) {
    await new AccountsOverviewPage(this.page!).verifyAtLeastOneAccountExists();
});

/**
 * Verifies the expected application result for the Gherkin step "Account number should be visible" using the Web page objects.
 */

Then('Account number should be visible', async function (this: CustomWorld) {
    await new AccountsOverviewPage(this.page!).verifyAccountNumberIsVisible();
});

/**
 * Verifies the expected application result for the Gherkin step "Account balance should not be empty" using the Web page objects.
 */

Then('Account balance should not be empty', async function (this: CustomWorld) {
    await new AccountsOverviewPage(this.page!).verifyAccountBalanceIsValid();
});

/**
 * Performs the requested browser interaction for the Gherkin step "User enters username with more than allowed characters" using the Web page objects.
 */

When('User enters username with more than allowed characters', async function (this: CustomWorld) {
    const registrationPage = new RegistrationPage(this.page!);
    await registrationPage.open();
    const data = createRegistrationData();
    const maxLength = getRegistrationValidation().usernameMaxLength;
    const uniqueUsername = `${data.username}${Date.now().toString(36)}`;
    await registrationPage.fillRegistrationForm({
        ...data,
        username: uniqueUsername.slice(0, maxLength).padEnd(maxLength + 1, 'x')
    });
});

/**
 * Performs the requested browser interaction for the Gherkin step "User submits registration form" using the Web page objects.
 */

When('User submits registration form', async function (this: CustomWorld) {
    await new RegistrationPage(this.page!).submit();
});

/**
 * Verifies the expected application result for the Gherkin step "Registration should not be successful" using the Web page objects.
 */

Then('Registration should not be successful', async function (this: CustomWorld) {
    await expect(this.page!.getByText(getCommonMessages().registrationSuccess)).not.toBeVisible();
    await expect(this.page!.getByRole('link', { name: 'Log Out' })).not.toBeVisible();
});

/**
 * Verifies the expected application result for the Gherkin step "Registration error should be displayed" using the Web page objects.
 */

Then('Registration error should be displayed', async function (this: CustomWorld) {
    await expect(this.page!.locator('.error:visible').first()).toBeVisible();
});

/**
 * Performs the requested browser interaction for the Gherkin step "User enters special characters in username field" using the Web page objects.
 */

When('User enters special characters in username field', async function (this: CustomWorld) {
    const registrationPage = new RegistrationPage(this.page!);
    await registrationPage.open();
    const data = createRegistrationData();
    await registrationPage.fillRegistrationForm({
        ...data,
        username: getRegistrationData().invalid.specialCharactersUsername
    });
});

/**
 * Performs the requested browser interaction for the Gherkin step "User enters SQL Injection payload in username field" using the Web page objects.
 */

When('User enters SQL Injection payload in username field', async function (this: CustomWorld) {
    const registrationPage = new RegistrationPage(this.page!);
    await registrationPage.open();
    const data = createRegistrationData();
    await registrationPage.fillRegistrationForm({
        ...data,
        username: getRegistrationData().invalid.sqlInjectionUsername
    });
});

/**
 * Verifies the expected application result for the Gherkin step "Application should handle the request securely" using the Web page objects.
 */

Then('Application should handle the request securely', async function (this: CustomWorld) {
    await expect(this.page!.getByRole('link', { name: 'Log Out' })).not.toBeVisible();
    await expect(this.page!.getByText(getCommonMessages().registrationSuccess)).not.toBeVisible();
});

/**
 * Performs the requested browser interaction for the Gherkin step "User enters XSS payload in registration fields" using the Web page objects.
 */

When('User enters XSS payload in registration fields', async function (this: CustomWorld) {
    const registrationPage = new RegistrationPage(this.page!);
    await registrationPage.open();
    const data = createRegistrationData();
    await registrationPage.fillRegistrationForm({
        ...data,
        username: getRegistrationData().invalid.xssUsername
    });

    const testWorld = this as CustomWorld & { xssScriptExecuted?: boolean };
    testWorld.xssScriptExecuted = false;
    this.page!.on('dialog', async dialog => {
        testWorld.xssScriptExecuted = true;
        await dialog.dismiss();
    });
});

/**
 * Verifies the expected application result for the Gherkin step "Script should not execute" using the Web page objects.
 */

Then('Script should not execute', async function (this: CustomWorld) {
    const testWorld = this as CustomWorld & { xssScriptExecuted?: boolean };
    expect(testWorld.xssScriptExecuted).toBe(false);
});
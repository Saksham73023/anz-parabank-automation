import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import { AccountsOverviewPage } from '../pages/accountOverview.page';
import { RegistrationPage } from '../pages/registration.page';
import { createRegistrationData } from '../testData/faker.util';
import { CustomWorld } from '../support/world';

Given('I am on the ParaBank registration page', async function (this: CustomWorld) {
    await new RegistrationPage(this.page!).open();
});

When('I register a new ParaBank customer with Faker data', async function (this: CustomWorld) {
    const registrationPage = new RegistrationPage(this.page!);
    await registrationPage.register(createRegistrationData());
});

Then('the new customer should be automatically logged in', async function (this: CustomWorld) {
    await expect(this.page!.getByRole('link', { name: 'Log Out' })).toBeVisible();
    await expect(this.page!.getByText('Your account was created successfully. You are now logged in.')).toBeVisible();
});

Then('the Accounts Overview page should be displayed', async function (this: CustomWorld) {
    await new AccountsOverviewPage(this.page!).verifyPageDisplayed();
});

Then('at least one default account should be created', async function (this: CustomWorld) {
    await new AccountsOverviewPage(this.page!).verifyAtLeastOneAccountExists();
});

Then('the account number should be visible', async function (this: CustomWorld) {
    await new AccountsOverviewPage(this.page!).verifyAccountNumberIsVisible();
});

Then('the account balance should not be empty or zero', async function (this: CustomWorld) {
    await new AccountsOverviewPage(this.page!).verifyAccountBalanceIsValid();
});

Given('Existing user already exists', async function (this: CustomWorld) {
    const registrationPage = new RegistrationPage(this.page!);
    await registrationPage.open();
    this.registrationData = createRegistrationData();
    await registrationPage.register(this.registrationData);
    await registrationPage.open();
});

When('User registers with same username', async function (this: CustomWorld) {
    const registrationPage = new RegistrationPage(this.page!);
    await registrationPage.fillRegistrationForm(this.registrationData!);
    await registrationPage.submit();
    await registrationPage.open();
    await registrationPage.fillRegistrationForm(this.registrationData!);
    await registrationPage.submit();
});

Then('Username already exists error should be displayed', async function (this: CustomWorld) {
    await expect(this.page!.locator('.error:visible')).toContainText('already exists');
});

Given('User is on Registration page', async function (this: CustomWorld) {
    await new RegistrationPage(this.page!).open();
});

When('User submits registration form without entering mandatory data', async function (this: CustomWorld) {
    await new RegistrationPage(this.page!).submit();
});

Then('Required field validation messages should be displayed', async function (this: CustomWorld) {
    const errors = this.page!.locator('.error:visible');
    await errors.first().waitFor({ state: 'visible' });
    expect(await errors.count()).toBeGreaterThan(0);
});

When('User enters different password and confirm password', async function (this: CustomWorld) {
    const registrationPage = new RegistrationPage(this.page!);
    const data = createRegistrationData();
    await registrationPage.fillRegistrationForm(data, `${data.password}-different`);
    await registrationPage.submit();
});

Then('Password mismatch error should be displayed', async function (this: CustomWorld) {
    await expect(this.page!.locator('.error:visible')).toContainText('Passwords did not match');
});

Given('User has registered successfully', async function (this: CustomWorld) {
    const registrationPage = new RegistrationPage(this.page!);
    await registrationPage.open();
    await registrationPage.register(createRegistrationData());
});

Then('Accounts Overview page should display', async function (this: CustomWorld) {
    await new AccountsOverviewPage(this.page!).verifyPageDisplayed();
});

Then('At least one account should exist', async function (this: CustomWorld) {
    await new AccountsOverviewPage(this.page!).verifyAtLeastOneAccountExists();
});

Then('Account number should be visible', async function (this: CustomWorld) {
    await new AccountsOverviewPage(this.page!).verifyAccountNumberIsVisible();
});

Then('Account balance should not be empty', async function (this: CustomWorld) {
    await new AccountsOverviewPage(this.page!).verifyAccountBalanceIsValid();
});

When('User enters username with more than allowed characters', async function (this: CustomWorld) {
    const registrationPage = new RegistrationPage(this.page!);
    await registrationPage.open();
    const data = createRegistrationData();
    await registrationPage.fillRegistrationForm({
        ...data,
        username: `${data.username}${'x'.repeat(60)}`
    });
});

When('User submits registration form', async function (this: CustomWorld) {
    await new RegistrationPage(this.page!).submit();
});

Then('Registration should not be successful', async function (this: CustomWorld) {
    await expect(this.page!.getByText('Your account was created successfully. You are now logged in.')).not.toBeVisible();
    await expect(this.page!.getByRole('link', { name: 'Log Out' })).not.toBeVisible();
});

Then('Appropriate validation message should be displayed', async function (this: CustomWorld) {
    await expect(this.page!.locator('.error:visible').first()).toBeVisible();
});

When('User enters special characters in username field', async function (this: CustomWorld) {
    const registrationPage = new RegistrationPage(this.page!);
    await registrationPage.open();
    const data = createRegistrationData();
    await registrationPage.fillRegistrationForm({
        ...data,
        username: 'user<>/&%$#@!'
    });
});

When('User enters SQL Injection payload in username field', async function (this: CustomWorld) {
    const registrationPage = new RegistrationPage(this.page!);
    await registrationPage.open();
    const data = createRegistrationData();
    await registrationPage.fillRegistrationForm({
        ...data,
        username: "' OR '1'='1"
    });
});

Then('Application should handle the request securely', async function (this: CustomWorld) {
    await expect(this.page!.getByRole('link', { name: 'Log Out' })).not.toBeVisible();
    await expect(this.page!.getByText('Your account was created successfully. You are now logged in.')).not.toBeVisible();
});

When('User enters XSS payload in registration fields', async function (this: CustomWorld) {
    const registrationPage = new RegistrationPage(this.page!);
    await registrationPage.open();
    const data = createRegistrationData();
    await registrationPage.fillRegistrationForm({
        ...data,
        username: '<script>alert("xss")</script>'
    });

    const testWorld = this as CustomWorld & { xssScriptExecuted?: boolean };
    testWorld.xssScriptExecuted = false;
    this.page!.on('dialog', async dialog => {
        testWorld.xssScriptExecuted = true;
        await dialog.dismiss();
    });
});

Then('Script should not execute', async function (this: CustomWorld) {
    const testWorld = this as CustomWorld & { xssScriptExecuted?: boolean };
    expect(testWorld.xssScriptExecuted).toBe(false);
});
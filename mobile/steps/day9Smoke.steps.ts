import { Given, Then, When, World } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import { mobileSessionFor } from '../pages/mobileHelper';
import { MobileAccountOverviewPage } from '../pages/accountOverviewPage';
import { MobileBillPayPage } from '../pages/billPayPage';
import { MobileLoginPage } from '../pages/loginPage';
import { MobileTransferFundsPage } from '../pages/transferFundsPage';

function credentials(): { username: string; password: string } {
  const username = process.env.PARABANK_USERNAME?.trim();
  const password = process.env.PARABANK_PASSWORD;
  if (!username || !password) {
    throw new Error('Set PARABANK_USERNAME and PARABANK_PASSWORD to run the Day 9 smoke scenarios.');
  }
  return { username, password };
}

function smokeAmount(environmentKey: string, fallback: number): number {
  const amount = Number(process.env[environmentKey] ?? fallback);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new RangeError(`${environmentKey} must be a finite number greater than zero.`);
  }
  return amount;
}

Given('Day 9 user opens the ParaBank login page', async function (this: World) {
  await new MobileLoginPage(mobileSessionFor(this).page).open();
});

When('Day 9 user logs in with configured credentials', async function (this: World) {
  const { username, password } = credentials();
  await new MobileLoginPage(mobileSessionFor(this).page).login(username, password);
});

Then('Day 9 account overview should be displayed', async function (this: World) {
  await new MobileLoginPage(mobileSessionFor(this).page).verifyLoggedIn();
});

When('Day 9 user opens the account overview', async function (this: World) {
  await new MobileAccountOverviewPage(mobileSessionFor(this).page).open();
});

Then('Day 9 account list should be displayed', async function (this: World) {
  await new MobileAccountOverviewPage(mobileSessionFor(this).page).verifyAccountsVisible();
});

When('Day 9 user transfers the configured amount', async function (this: World) {
  const amount = smokeAmount('MOBILE_TRANSFER_AMOUNT', 1);
  await new MobileTransferFundsPage(mobileSessionFor(this).page).transfer(amount);
});

Then('Day 9 transfer confirmation should be displayed', async function (this: World) {
  await new MobileTransferFundsPage(mobileSessionFor(this).page).verifyTransferComplete();
});

When('Day 9 user pays a bill', async function (this: World) {
  const amount = smokeAmount('MOBILE_BILLPAY_AMOUNT', 1);
  await new MobileBillPayPage(mobileSessionFor(this).page).payBill(amount);
});

Then('Day 9 bill payment confirmation should be displayed', async function (this: World) {
  await new MobileBillPayPage(mobileSessionFor(this).page).verifyPaymentComplete();
});

When('Day 9 user logs out', async function (this: World) {
  await new MobileLoginPage(mobileSessionFor(this).page).logout();
});

Then('Day 9 login form should be displayed', async function (this: World) {
  await new MobileLoginPage(mobileSessionFor(this).page).verifyLoggedOut();
});

Then('the current viewport should be {int} by {int}', async function (this: World, width: number, height: number) {
  const viewport = mobileSessionFor(this).page.viewportSize();
  expect(viewport).toEqual({ width, height });
});

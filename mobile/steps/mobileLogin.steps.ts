import { Given, Then, When, World } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import { mobileSessionFor } from '../pages/mobileHelper';

const DEFAULT_BASE_URL = 'https://parabank.parasoft.com/parabank/index.htm';

function mobileCredentials(): { username: string; password: string } {
  const username = process.env.PARABANK_USERNAME?.trim();
  const password = process.env.PARABANK_PASSWORD;
  if (!username || !password) {
    throw new Error('Set PARABANK_USERNAME and PARABANK_PASSWORD to run mobile scenarios.');
  }
  return { username, password };
}

Given('mobile user opens the ParaBank login page', async function (this: World) {
  await mobileSessionFor(this).page.goto(process.env.BASE_URL ?? DEFAULT_BASE_URL, { waitUntil: 'domcontentloaded' });
});

When('mobile user logs in with configured credentials', async function (this: World) {
  const { page } = mobileSessionFor(this);
  const { username, password } = mobileCredentials();
  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[type="submit"][value="Log In"]').click();
});

Then('the mobile account overview should be displayed', async function (this: World) {
  const { page } = mobileSessionFor(this);
  await expect(page).toHaveURL(/\/overview\.htm(?:;[^/?#]+)?(?:\?[^#]*)?$/);
  await expect(page.getByRole('heading', { name: 'Accounts Overview', exact: true })).toBeVisible();
});
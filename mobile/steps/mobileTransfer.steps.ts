import { Then, When, World } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import { mobileSessionFor } from '../pages/mobileHelper';

When('mobile user transfers the configured amount between accounts', async function (this: World) {
  const { page } = mobileSessionFor(this);
  await page.getByRole('link', { name: 'Transfer Funds', exact: true }).click();
  const sourceSelect = page.locator('#fromAccountId');
  const destinationSelect = page.locator('#toAccountId');
  await sourceSelect.waitFor({ state: 'visible' });

  const sourceIds = await sourceSelect.locator('option[value]:not([value=""])').evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value)
  );
  const destinationIds = await destinationSelect.locator('option[value]:not([value=""])').evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value)
  );
  const sourceId = sourceIds[0];
  const destinationId = destinationIds.find((id) => id !== sourceId);
  if (!sourceId || !destinationId) {
    throw new Error('The mobile transfer scenario requires at least two available accounts.');
  }

  const amount = Number(process.env.MOBILE_TRANSFER_AMOUNT ?? 1);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new RangeError('MOBILE_TRANSFER_AMOUNT must be a finite number greater than zero.');
  }

  await sourceSelect.selectOption(sourceId);
  await destinationSelect.selectOption(destinationId);
  await page.locator('#amount').fill(String(amount));
  await page.locator('input[value="Transfer"]').click();
});

Then('mobile transfer confirmation should be displayed', async function (this: World) {
  const { page } = mobileSessionFor(this);
  await expect(page.getByRole('heading', { name: 'Transfer Complete!', exact: true })).toBeVisible();
});
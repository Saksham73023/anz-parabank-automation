import { expect } from 'playwright/test';
import type { Page } from 'playwright';
import { accountWithSufficientBalance } from './accountSelection';

export class MobileTransferFundsPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    const heading = this.page.getByRole('heading', { name: 'Transfer Funds', exact: true });
    if (!(await heading.isVisible())) {
      await this.page.getByRole('link', { name: 'Transfer Funds', exact: true }).click();
    }
    await expect(heading).toBeVisible();
  }

  async transfer(amount: number): Promise<void> {
    const sourceId = await accountWithSufficientBalance(this.page, amount);
    const overviewRows = this.page.locator('#accountTable tbody tr');
    const overviewAccountIds = await overviewRows.locator('td a').allTextContents();
    const destinationId = overviewAccountIds.map((id) => id.trim()).find((id) => id && id !== sourceId);
    if (!destinationId) {
      throw new Error('The Day 9 transfer smoke flow requires at least two available accounts.');
    }

    await this.open();
    const source = this.page.locator('#fromAccountId');
    const destination = this.page.locator('#toAccountId');
    await expect(source).toBeVisible();
    await expect.poll(async () => source.locator('option[value]:not([value=""])').count()).toBeGreaterThan(0);

    const sourceIds = await source.locator('option[value]:not([value=""])').evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value)
    );
    const destinationIds = await destination.locator('option[value]:not([value=""])').evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value)
    );
    if (!sourceIds.includes(sourceId) || !destinationIds.includes(destinationId)) {
      throw new Error(`Accounts ${sourceId} and ${destinationId} are not available for the Day 9 transfer.`);
    }

    await source.selectOption(sourceId);
    await destination.selectOption(destinationId);
    await this.page.locator('#amount').fill(String(amount));
    await this.page.locator('input[value="Transfer"]').click();
  }

  async verifyTransferComplete(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Transfer Complete!', exact: true })).toBeVisible();
  }
}

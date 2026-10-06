import { expect } from 'playwright/test';
import type { Page } from 'playwright';

export class MobileAccountOverviewPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    const heading = this.page.getByRole('heading', { name: 'Accounts Overview', exact: true });
    if (!(await heading.isVisible())) {
      await this.page.getByRole('link', { name: 'Accounts Overview', exact: true }).click();
    }
    await expect(heading).toBeVisible();
  }

  async verifyAccountsVisible(): Promise<void> {
    await this.open();
    await expect(this.page.locator('#accountTable tbody tr').first()).toBeVisible();
  }
}

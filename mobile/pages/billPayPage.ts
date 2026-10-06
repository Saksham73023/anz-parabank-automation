import { expect } from 'playwright/test';
import type { Page } from 'playwright';
import { accountWithSufficientBalance } from './accountSelection';

export class MobileBillPayPage {
  constructor(private readonly page: Page) {}

  async payBill(amount: number): Promise<void> {
    await this.page.getByRole('link', { name: 'Accounts Overview', exact: true }).click();
    const fundingAccountId = await accountWithSufficientBalance(this.page, amount);
    await this.page.getByRole('link', { name: /bill pay/i }).click();
    await expect(this.page.getByRole('heading', { name: /bill payment service/i })).toBeVisible();

    const fields: Record<string, string> = {
      'payee.name': 'Day 9 Utilities',
      'payee.address.street': '100 Main Street',
      'payee.address.city': 'Austin',
      'payee.address.state': 'TX',
      'payee.address.zipCode': '78701',
      'payee.phoneNumber': '5125550100',
      'payee.accountNumber': '123456789',
      verifyAccount: '123456789',
      amount: String(amount)
    };
    for (const [name, value] of Object.entries(fields)) {
      await this.page.locator(`input[name="${name}"]`).fill(value);
    }

    const fundingAccount = this.page.locator('select[name="fromAccountId"]');
    await expect.poll(async () => fundingAccount.locator('option[value]:not([value=""])').count()).toBeGreaterThan(0);
    await fundingAccount.selectOption(fundingAccountId);
    await this.page.locator('input[value="Send Payment"]').click();
  }

  async verifyPaymentComplete(): Promise<void> {
    await expect(this.page.locator('#billpayResult h1')).toContainText(/bill payment complete/i);
    await expect(this.page.locator('#billpayResult')).toContainText(/successful/i);
  }
}

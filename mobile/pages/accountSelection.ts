import { expect } from 'playwright/test';
import type { Page } from 'playwright';

export async function accountWithSufficientBalance(page: Page, minimumBalance: number): Promise<string> {
  const rows = page.locator('#accountTable tbody tr');
  await expect(rows.first()).toBeVisible();

  for (let index = 0; index < await rows.count(); index += 1) {
    const row = rows.nth(index);
    const accountId = (await row.locator('td a').textContent())?.trim() ?? '';
    const balanceText = (await row.locator('td').nth(1).textContent()) ?? '';
    const balance = Number.parseFloat(balanceText.replace(/[^\d.-]/g, ''));
    if (accountId && Number.isFinite(balance) && balance >= minimumBalance) return accountId;
  }

  throw new Error(`No account with an available balance of at least ${minimumBalance.toFixed(2)} is available.`);
}

import { expect } from 'playwright/test';
import type { Page } from 'playwright';
import { installPayIdMock } from '../utils/payIdMock';
import type { MockPaymentOutcome } from '../utils/payIdMock';

export type { MockPaymentOutcome } from '../utils/payIdMock';

export class MockPaymentPage {
  constructor(private readonly page: Page) {}

  async open(outcome: MockPaymentOutcome): Promise<void> {
    await installPayIdMock(this.page, outcome);

    const baseUrl = process.env.BASE_URL?.trim() || 'https://parabank.parasoft.com/parabank/index.htm';
    const mockUrl = new URL('/__test__/mock-payment/npp-payid', baseUrl);
    await this.page.goto(mockUrl.toString(), { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByRole('heading', { name: 'PayID Payment' })).toBeVisible();
  }

  async submitPayment(): Promise<void> {
    await this.page.getByRole('button', { name: 'Pay now' }).click();
  }

  async verifyOutcome(outcome: MockPaymentOutcome): Promise<void> {
    const status = this.page.getByRole('status');
    await expect(status).toHaveAttribute('data-outcome', outcome);
    const expectedMessages: Record<MockPaymentOutcome, RegExp> = {
      SETTLED: /settled successfully/i,
      FAILED: /payment failed/i,
      TIMEOUT: /payment timed out/i
    };
    await expect(status).toContainText(expectedMessages[outcome]);
  }
}

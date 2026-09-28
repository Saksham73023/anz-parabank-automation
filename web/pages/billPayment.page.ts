import { expect, Locator, Page } from 'playwright/test';
import { BasePage } from './basepage';
import type { BillPaymentData, BillPaymentField } from '../support/testDataHelper';

export interface BillPaymentSubmission {
  success: boolean;
  message: string;
  amount: number;
  fundingAccountId: string;
}

export class BillPaymentPage extends BasePage {
  private readonly billPayLink = this.page.getByRole('link', { name: /bill pay/i });
  private readonly pageHeading = this.page.getByRole('heading', { name: /bill payment service/i });
  private readonly resultHeading = this.page.locator('#billpayResult h1');
  private readonly resultPanel = this.page.locator('#billpayResult');
  private readonly fundingAccount = this.page.locator('select[name="fromAccountId"]');
  private readonly submitButton = this.page.locator('input[value="Send Payment"]');
  private readonly visibleErrors = this.page.locator('.error:visible').filter({ hasText: /\S/ });
  private readonly fieldLocators: Record<BillPaymentField, Locator>;

  constructor(page: Page) {
    super(page);
    this.fieldLocators = {
      payeeName: this.page.locator('input[name="payee.name"]'),
      address: this.page.locator('input[name="payee.address.street"]'),
      city: this.page.locator('input[name="payee.address.city"]'),
      state: this.page.locator('input[name="payee.address.state"]'),
      zipCode: this.page.locator('input[name="payee.address.zipCode"]'),
      phoneNumber: this.page.locator('input[name="payee.phoneNumber"]'),
      accountNumber: this.page.locator('input[name="payee.accountNumber"]'),
      verifyAccount: this.page.locator('input[name="verifyAccount"]'),
      amount: this.page.locator('input[name="amount"]')
    };
  }

  async open(): Promise<void> {
    if (!(await this.pageHeading.isVisible())) {
      await this.billPayLink.click();
    }
    await expect(this.pageHeading).toBeVisible();
    await expect(this.fieldLocators.payeeName).toBeVisible();
  }

  async selectFundingAccount(accountId?: string): Promise<string> {
    await this.open();
    const accountIds = await this.fundingAccount.locator('option').evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value).filter(Boolean)
    );
    if (accountIds.length === 0) {
      throw new Error('No funding account is available for bill payment.');
    }

    const currentAccountId = await this.fundingAccount.inputValue();
    const selectedAccountId = accountId ?? (accountIds.includes(currentAccountId) ? currentAccountId : accountIds[0]);
    if (!accountIds.includes(selectedAccountId)) {
      throw new Error(`Funding account ${selectedAccountId} is not available for bill payment.`);
    }

    await this.fundingAccount.selectOption(selectedAccountId);
    return selectedAccountId;
  }

  async submitBillPayment(data: Partial<BillPaymentData>, accountId?: string): Promise<BillPaymentSubmission> {
    await this.open();
    await this.fillForm(data);
    const fundingAccountId = await this.selectFundingAccount(accountId);
    await this.click(this.submitButton);

    await Promise.race([
      this.resultHeading.waitFor({ state: 'visible' }).then(() => 'success'),
      this.visibleErrors.first().waitFor({ state: 'visible' }).then(() => 'error')
    ]);

    const success = await this.resultHeading.isVisible();
    const message = success
      ? (await this.getText(this.resultPanel)).trim()
      : (await this.visibleErrors.allTextContents()).map((text) => text.trim()).filter(Boolean).join(' ');

    return {
      success,
      message,
      amount: Number(data.amount ?? 0),
      fundingAccountId
    };
  }

  async submitBillPayments(
    payments: readonly Partial<BillPaymentData>[],
    accountId?: string
  ): Promise<BillPaymentSubmission[]> {
    const submissions: BillPaymentSubmission[] = [];
    for (const payment of payments) {
      submissions.push(await this.submitBillPayment(payment, accountId));
    }
    return submissions;
  }

  async verifyPaymentSuccessful(): Promise<void> {
    await expect(this.resultHeading).toContainText(/bill payment complete/i);
    await expect(this.resultPanel).toContainText(/successful/i);
  }

  async verifyRequiredField(field: BillPaymentField): Promise<void> {
    const fieldError = this.fieldLocators[field]
      .locator('xpath=ancestor::tr')
      .locator('.error:visible')
      .filter({ hasText: /\S/ });
    await this.verifyError(fieldError, /required|cannot be empty|must be provided/i);
  }

  async verifyPaymentError(expectedMessage: RegExp): Promise<void> {
    const matchingError = this.page.locator('.error:visible').filter({ hasText: expectedMessage }).first();
    await this.verifyError(matchingError, expectedMessage);
  }

  private async fillForm(data: Partial<BillPaymentData>): Promise<void> {
    for (const [field, locator] of Object.entries(this.fieldLocators) as Array<[BillPaymentField, Locator]>) {
      const value = data[field];
      if (value === undefined) continue;
      if (field === 'amount') {
        await this.setAmount(value);
      } else {
        await this.fill(locator, String(value));
      }
    }
  }

  private async setAmount(amount: string | number): Promise<void> {
    await this.fill(this.fieldLocators.amount, String(amount));
  }

  private async verifyError(locator: Locator, expectedMessage: RegExp): Promise<void> {
    await expect(locator).toBeVisible();
    await expect(locator).toContainText(expectedMessage);
  }
}
import { expect, Locator, Page } from 'playwright/test';
import { BasePage } from './basepage';
import type { BillPaymentData, BillPaymentField } from '../support/testDataHelper';

/** Captures the outcome, confirmation message, amount, and funding account for a bill payment. */
export interface BillPaymentSubmission {
  success: boolean;
  message: string;
  amount: number;
  fundingAccountId: string;
}

/** Models bill-payment form entry, funding-account selection, submission, and validation outcomes. */
export class BillPaymentPage extends BasePage {
  private readonly billPayLink = this.page.getByRole('link', { name: /bill pay/i });
  private readonly pageHeading = this.page.getByRole('heading', { name: /bill payment service/i });
  private readonly resultHeading = this.page.locator('#billpayResult h1');
  private readonly resultPanel = this.page.locator('#billpayResult');
  private readonly fundingAccount = this.page.locator('select[name="fromAccountId"]');
  private readonly submitButton = this.page.locator('input[value="Send Payment"]');
  private readonly visibleErrors = this.page.locator('.error:visible').filter({ hasText: /\S/ });
  private readonly fieldLocators: Record<BillPaymentField, Locator>;

  /** Initializes payee form, funding-account selector, and result/error locators. */
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

  /** Opens the Bill Pay screen and verifies its form is ready for interaction. */
  async open(): Promise<void> {
    if (!(await this.pageHeading.isVisible())) {
      await this.billPayLink.click();
    }
    await expect(this.pageHeading).toBeVisible();
    await expect(this.fieldLocators.payeeName).toBeVisible();
  }

  /** Selects the requested available funding account or the current/first available account. */
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

  /**
   * Fills and submits a bill payment, then returns either its confirmation or validation message.
   * @param data Payee and payment fields; omitted values are left unchanged.
   * @param accountId Optional funding account to select.
   * @returns Submission outcome including displayed message and selected account.
   */
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

  /** Submits a sequence of payments and returns each individual UI result. */
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

  /** Asserts that the page displays ParaBank's successful bill-payment confirmation. */
  async verifyPaymentSuccessful(): Promise<void> {
    await expect(this.resultHeading).toContainText(/bill payment complete/i);
    await expect(this.resultPanel).toContainText(/successful/i);
  }

  /** Verifies a required-field message associated with the specified form field. */
  async verifyRequiredField(field: BillPaymentField): Promise<void> {
    const fieldError = this.fieldLocators[field]
      .locator('xpath=ancestor::tr')
      .locator('.error:visible')
      .filter({ hasText: /\S/ });
    await this.verifyError(fieldError, /required|cannot be empty|must be provided/i);
  }

  /** Verifies that a visible payment validation message matches the expected pattern. */
  async verifyPaymentError(expectedMessage: RegExp): Promise<void> {
    const matchingError = this.page.locator('.error:visible').filter({ hasText: expectedMessage }).first();
    await this.verifyError(matchingError, expectedMessage);
  }

  /** Fills supplied payee fields while leaving unspecified values untouched. */
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

  /** Converts the amount to text and fills the amount control. */
  private async setAmount(amount: string | number): Promise<void> {
    await this.fill(this.fieldLocators.amount, String(amount));
  }

  /** Asserts a validation locator is visible and contains the expected message. */
  private async verifyError(locator: Locator, expectedMessage: RegExp): Promise<void> {
    await expect(locator).toBeVisible();
    await expect(locator).toContainText(expectedMessage);
  }
}
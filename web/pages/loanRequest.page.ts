import { expect, Locator, Page } from 'playwright/test';
import { BasePage } from './basepage';

/** Normalized status and confirmation details returned by a loan application submission. */
export interface LoanRequestResult {
  status: 'Approved' | 'Denied' | 'Rejected';
  message: string;
  accountId?: string;
}

/** Models ParaBank loan application, lender decision, funding, and approved-account verification. */
export class LoanRequestPage extends BasePage {
  private readonly requestLink = this.page.getByRole('link', { name: 'Request Loan', exact: true });
  private readonly pageHeading = this.page.getByRole('heading', { name: 'Apply for a Loan', exact: true });
  private readonly amountInput = this.page.locator('#amount');
  private readonly downPaymentInput = this.page.locator('#downPayment');
  private readonly fundingAccountSelect = this.page.locator('#fromAccountId');
  private readonly applyButton = this.page.locator('input[value="Apply Now"]');
  private readonly resultPanel = this.page.locator('#requestLoanResult');
  private readonly statusValue = this.page.locator('#loanStatus');
  private readonly loanAccountLink = this.page.locator('#newAccountId');
  private readonly visibleError: Locator = this.page.locator('.error:visible').filter({ hasText: /\S/ }).first();

  /** Initializes loan form, decision, error, and new-account locators. */
  constructor(page: Page) {
    super(page);
  }

  /** Opens the loan request page and waits for the application form. */
  async open(): Promise<void> {
    if (!(await this.pageHeading.isVisible())) {
      await this.requestLink.click();
    }
    await expect(this.pageHeading).toBeVisible();
    await expect(this.amountInput).toBeVisible();
  }

  /** Returns available account IDs from the loan funding selector. */
  async getFundingAccountIds(): Promise<string[]> {
    await this.open();
    return this.fundingAccountSelect.locator('option[value]:not([value=""])').evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value)
    );
  }

  /** Selects the supplied funding account for the loan request. */
  async selectFundingAccount(accountId: string): Promise<void> {
    await this.open();
    await this.fundingAccountSelect.selectOption(accountId);
  }

  /**
   * Enters loan and down-payment values, submits the application, and normalizes the result.
   * @param amount Requested loan amount.
   * @param downPayment Applicant's down payment.
   * @param accountId Optional account to fund the down payment.
   * @returns Approved, denied, or rejected status with message and optional loan account ID.
   */
  async submit(amount: string, downPayment: string, accountId?: string): Promise<LoanRequestResult> {
    await this.open();
    await this.fill(this.amountInput, amount);
    await this.fill(this.downPaymentInput, downPayment);
    if (accountId) await this.selectFundingAccount(accountId);
    await this.click(this.applyButton);

    await Promise.race([
      this.resultPanel.waitFor({ state: 'visible' }),
      this.visibleError.waitFor({ state: 'visible' })
    ]);

    if (!(await this.resultPanel.isVisible())) {
      return { status: 'Rejected', message: (await this.visibleError.textContent())?.trim() ?? '' };
    }

    const message = (await this.resultPanel.textContent())?.trim() ?? '';
    const statusText = (await this.statusValue.textContent().catch(() => ''))?.trim() ?? '';
    const status = /approved/i.test(statusText || message)
      ? 'Approved'
      : /denied/i.test(statusText || message)
        ? 'Denied'
        : 'Rejected';
    const accountIdValue = await this.loanAccountLink.textContent().catch(() => '');
    return {
      status,
      message,
      accountId: accountIdValue?.trim() || undefined
    };
  }

  /** Verifies the requested final lender decision in the result panel. */
  async verifyLoanStatus(status: 'Approved' | 'Denied'): Promise<void> {
    await expect(this.resultPanel).toBeVisible();
    await expect(this.statusValue).toContainText(new RegExp(`^${status}$`, 'i'));
  }

  /** Verifies a denied/rejected result or a visible form-validation error. */
  async verifyRejectedRequest(): Promise<void> {
    if (await this.resultPanel.isVisible()) {
      await expect(this.statusValue).toHaveText(/^(Denied|Rejected)$/i);
      return;
    }
    await expect(this.visibleError).toBeVisible();
  }

  /** Reads and validates the new account ID created for an approved loan. */
  async getLoanAccountId(): Promise<string> {
    await expect(this.loanAccountLink).toBeVisible();
    const accountId = (await this.loanAccountLink.textContent())?.trim() ?? '';
    if (!accountId) throw new Error('Approved loan did not expose a new account ID.');
    return accountId;
  }

  /** Opens Accounts Overview and verifies that the approved loan account is listed. */
  async verifyLoanAccountInOverview(accountId: string): Promise<void> {
    await this.page.getByRole('link', { name: 'Accounts Overview', exact: true }).click();
    await expect(this.page.getByRole('heading', { name: 'Accounts Overview', exact: true })).toBeVisible();
    await expect(this.page.getByRole('link', { name: accountId, exact: true })).toBeVisible();
  }
}
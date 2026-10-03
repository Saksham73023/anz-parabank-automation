import { expect, Locator, Page } from 'playwright/test';
import { BasePage } from './basepage';

export interface LoanRequestResult {
  status: 'Approved' | 'Denied' | 'Rejected';
  message: string;
  accountId?: string;
}

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

  constructor(page: Page) {
    super(page);
  }

  async open(): Promise<void> {
    if (!(await this.pageHeading.isVisible())) {
      await this.requestLink.click();
    }
    await expect(this.pageHeading).toBeVisible();
    await expect(this.amountInput).toBeVisible();
  }

  async getFundingAccountIds(): Promise<string[]> {
    await this.open();
    return this.fundingAccountSelect.locator('option[value]:not([value=""])').evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value)
    );
  }

  async selectFundingAccount(accountId: string): Promise<void> {
    await this.open();
    await this.fundingAccountSelect.selectOption(accountId);
  }

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

  async verifyLoanStatus(status: 'Approved' | 'Denied'): Promise<void> {
    await expect(this.resultPanel).toBeVisible();
    await expect(this.statusValue).toContainText(new RegExp(`^${status}$`, 'i'));
  }

  async verifyRejectedRequest(): Promise<void> {
    if (await this.resultPanel.isVisible()) {
      await expect(this.statusValue).toHaveText(/^(Denied|Rejected)$/i);
      return;
    }
    await expect(this.visibleError).toBeVisible();
  }

  async getLoanAccountId(): Promise<string> {
    await expect(this.loanAccountLink).toBeVisible();
    const accountId = (await this.loanAccountLink.textContent())?.trim() ?? '';
    if (!accountId) throw new Error('Approved loan did not expose a new account ID.');
    return accountId;
  }

  async verifyLoanAccountInOverview(accountId: string): Promise<void> {
    await this.page.getByRole('link', { name: 'Accounts Overview', exact: true }).click();
    await expect(this.page.getByRole('heading', { name: 'Accounts Overview', exact: true })).toBeVisible();
    await expect(this.page.getByRole('link', { name: accountId, exact: true })).toBeVisible();
  }
}
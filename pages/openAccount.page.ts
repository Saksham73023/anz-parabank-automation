import { expect, Locator, Page } from 'playwright/test';
import { BasePage } from './basepage';

export class OpenAccountPage extends BasePage {
  private readonly openNewAccountLink: Locator;
  private readonly accountTypeSelect: Locator;
  private readonly fundingAccountSelect: Locator;
  private readonly openAccountButton: Locator;
  private readonly accountOpenedHeading: Locator;
  private readonly newAccountIdLink: Locator;
  private readonly accountsOverviewLink: Locator;

  constructor(page: Page) {
    super(page);
    this.openNewAccountLink = page.getByRole('link', { name: 'Open New Account' });
    this.accountTypeSelect = page.locator('select#type');
    this.fundingAccountSelect = page.locator('select#fromAccountId');
    this.openAccountButton = page.locator('input[value="Open New Account"]');
    this.accountOpenedHeading = page.getByRole('heading', { name: 'Account Opened!' });
    this.newAccountIdLink = page.locator('a[href*="activity.htm?id="]').first();
    this.accountsOverviewLink = page.getByRole('link', { name: 'Accounts Overview' });
  }

  async open(): Promise<void> {
    await this.openNewAccountLink.click();
    await this.accountTypeSelect.waitFor({ state: 'visible' });
  }

  async selectCheckingAccount(): Promise<void> {
    await this.selectAccountType('CHECKING');
  }

  async selectAccountType(accountType: string): Promise<void> {
    await this.accountTypeSelect.selectOption({ label: accountType });
  }

  async isAccountTypeAvailable(accountType: string): Promise<boolean> {
    return (await this.accountTypeSelect.locator('option').allTextContents())
      .some((option) => option.trim() === accountType);
  }

  async openDirectly(): Promise<void> {
    await this.navigate(`${process.env.BASE_URL ?? 'https://parabank.parasoft.com/parabank/index.htm'}`.replace(/index\.htm$/, 'openaccount.htm'));
  }

  async selectFirstFundingAccount(): Promise<void> {
    const firstAvailableAccount = this.fundingAccountSelect.locator('option[value]:not([value=""])').first();
    const accountValue = await firstAvailableAccount.getAttribute('value');

    if (!accountValue) {
      throw new Error('No funding account is available for the new account.');
    }

    await this.fundingAccountSelect.selectOption(accountValue);
  }

  async submit(): Promise<void> {
    await this.openAccountButton.click();
  }

  async createAccount(accountType: 'CHECKING' | 'SAVINGS' = 'CHECKING'): Promise<string> {
    await this.open();
    await this.selectAccountType(accountType);
    await this.selectFirstFundingAccount();
    await this.submit();
    await this.verifyAccountOpened();
    return this.getNewAccountId();
  }

  async verifyAccountOpened(): Promise<void> {
    await expect(this.accountOpenedHeading).toBeVisible();
    await expect(this.page.getByText('Congratulations, your account is now open.')).toBeVisible();
  }

  async getNewAccountId(): Promise<string> {
    await expect(this.newAccountIdLink).toBeVisible();
    const accountId = (await this.newAccountIdLink.textContent())?.trim() ?? '';

    if (!accountId) {
      throw new Error('The newly created account ID is empty.');
    }

    return accountId;
  }

  async verifyAccountInOverview(accountId: string): Promise<void> {
    await this.accountsOverviewLink.click();
    await expect(this.page.getByRole('heading', { name: 'Accounts Overview' })).toBeVisible();
    await expect(this.page.getByRole('link', { name: accountId, exact: true })).toBeVisible();
  }
}
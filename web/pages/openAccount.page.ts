import { expect, Locator, Page } from 'playwright/test';
import { getAccountData, getCommonMessages, type AccountType } from '../support/testDataHelper';
import { BasePage } from './basepage';

/** Models account opening, funding-account selection, and confirmation in ParaBank. */
export class OpenAccountPage extends BasePage {
  private readonly openNewAccountLink: Locator;
  private readonly accountTypeSelect: Locator;
  private readonly fundingAccountSelect: Locator;
  private readonly openAccountButton: Locator;
  private readonly accountOpenedHeading: Locator;
  private readonly newAccountIdLink: Locator;
  private readonly accountsOverviewLink: Locator;

  /** Initializes account-opening navigation, form, and confirmation locators. */
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

  /** Opens the account-creation workflow and waits for its account-type selector. */
  async open(): Promise<void> {
    await this.openNewAccountLink.click();
    await this.accountTypeSelect.waitFor({ state: 'visible' });
  }

  /** Selects the configured default account type. */
  async selectCheckingAccount(): Promise<void> {
    await this.selectAccountType(getAccountData().defaultType);
  }

  /** Selects an account type by the visible option label. */
  async selectAccountType(accountType: string): Promise<void> {
    await this.accountTypeSelect.selectOption({ label: accountType });
  }

  /** Checks whether the account-type selector contains the requested option. */
  async isAccountTypeAvailable(accountType: string): Promise<boolean> {
    return (await this.accountTypeSelect.locator('option').allTextContents())
      .some((option) => option.trim() === accountType);
  }

  /** Navigates directly to the account-opening route for access-control scenarios. */
  async openDirectly(): Promise<void> {
    await this.navigate(`${process.env.BASE_URL ?? 'https://parabank.parasoft.com/parabank/index.htm'}`.replace(/index\.htm$/, 'openaccount.htm'));
  }

  /** Selects the first available source account or reports that no funding account exists. */
  async selectFirstFundingAccount(): Promise<void> {
    const firstAvailableAccount = this.fundingAccountSelect.locator('option[value]:not([value=""])').first();
    const accountValue = await firstAvailableAccount.getAttribute('value');

    if (!accountValue) {
      throw new Error('No funding account is available for the new account.');
    }

    await this.fundingAccountSelect.selectOption(accountValue);
  }

  /** Submits the current account-opening form. */
  async submit(): Promise<void> {
    await this.openAccountButton.click();
  }

  /**
   * Executes the account-opening workflow using a selected funding account.
   * @param accountType Requested checking or savings type; defaults to configured test data.
   * @returns The newly created account identifier.
   */
  async createAccount(accountType: AccountType = getAccountData().defaultType): Promise<string> {
    await this.open();
    await this.selectAccountType(accountType);
    await this.selectFirstFundingAccount();
    await this.submit();
    await this.verifyAccountOpened();
    return this.getNewAccountId();
  }

  /** Verifies that ParaBank displays its account-opened confirmation. */
  async verifyAccountOpened(): Promise<void> {
    await expect(this.accountOpenedHeading).toBeVisible();
    await expect(this.page.getByText(getCommonMessages().accountOpenedSuccess)).toBeVisible();
  }

  /** Reads and validates the generated account ID from the success page. */
  async getNewAccountId(): Promise<string> {
    await expect(this.newAccountIdLink).toBeVisible();
    const accountId = (await this.newAccountIdLink.textContent())?.trim() ?? '';

    if (!accountId) {
      throw new Error('The newly created account ID is empty.');
    }

    return accountId;
  }

  /** Navigates to Accounts Overview and verifies the new account link is listed. */
  async verifyAccountInOverview(accountId: string): Promise<void> {
    await this.accountsOverviewLink.click();
    await expect(this.page.getByRole('heading', { name: 'Accounts Overview' })).toBeVisible();
    await expect(this.page.getByRole('link', { name: accountId, exact: true })).toBeVisible();
  }
}
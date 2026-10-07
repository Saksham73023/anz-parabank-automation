import { expect, Locator, Page } from 'playwright/test';
import { getCommonMessages } from '../support/testDataHelper';
import { BasePage } from './basepage';

/** Transfer confirmation details returned after submitting the funds-transfer form. */
export interface TransferResult {
  amount: number;
  transactionId?: string;
  confirmationText: string;
}

/** Normalized account ledger row classified as a debit, credit, or unknown entry. */
export interface LedgerEntry {
  amount: number;
  type: 'debit' | 'credit' | 'unknown';
  description: string;
}

/** Models account selection, funds transfer, confirmation, balance checks, and ledger verification. */
export class TransferFundsPage extends BasePage {
  private readonly transferLink = this.page.getByRole('link', { name: 'Transfer Funds', exact: true });
  private readonly transferHeading = this.page.getByRole('heading', { name: 'Transfer Funds', exact: true });
  private readonly fromAccountSelect = this.page.locator('#fromAccountId');
  private readonly toAccountSelect = this.page.locator('#toAccountId');
  private readonly amountInput = this.page.locator('#amount');
  private readonly transferButton = this.page.locator('input[value="Transfer"]');
  private readonly confirmationHeading = this.page.getByRole('heading', { name: getCommonMessages().transferCompleteHeading, exact: true });
  private readonly confirmationPanel = this.page.locator('#showResult');
  private readonly validationError = this.page.locator('.error:visible').first();
  private readonly transactionLink = this.page.locator('#showResult a').first();
  private readonly activityTable = this.page.locator('#transactionTable');

  /** Initializes transfer form, confirmation, validation, and transaction-history locators. */
  constructor(page: Page) {
    super(page);
  }

  /** Opens Transfer Funds and waits for account selection controls. */
  async open(): Promise<void> {
    if (!(await this.transferHeading.isVisible())) {
      await this.transferLink.click();
    }
    await this.transferHeading.waitFor({ state: 'visible' });
    await this.fromAccountSelect.waitFor({ state: 'visible' });
  }

  /** Reads distinct available account IDs from both transfer selectors. */
  async getAccountIds(): Promise<string[]> {
    await this.open();
    await this.page.waitForFunction(() =>
      document.querySelectorAll('#fromAccountId option[value]:not([value=""]), #toAccountId option[value]:not([value=""])').length > 0
    );
    const accountIds = await Promise.all([
      this.fromAccountSelect.locator('option[value]:not([value=""])').evaluateAll((options) =>
        options.map((option) => (option as HTMLOptionElement).value)
      ),
      this.toAccountSelect.locator('option[value]:not([value=""])').evaluateAll((options) =>
        options.map((option) => (option as HTMLOptionElement).value)
      )
    ]);
    return [...new Set(accountIds.flat())];
  }

  /** Selects two available accounts, defaulting to the first distinct pair. */
  async selectAccounts(sourceAccountId?: string, destinationAccountId?: string): Promise<{ source: string; destination: string }> {
    await this.open();
    const accountIds = await this.getAccountIds();
    if (accountIds.length < 2) {
      throw new Error('At least two accounts are required for fund transfer scenarios.');
    }

    const source = sourceAccountId ?? accountIds[0];
    const destination = destinationAccountId ?? accountIds.find((accountId) => accountId !== source) ?? accountIds[1];
    if (!accountIds.includes(source) || !accountIds.includes(destination)) {
      throw new Error(`Transfer accounts are not available. Source: ${source}, destination: ${destination}`);
    }

    await this.fromAccountSelect.selectOption(source);
    await this.toAccountSelect.selectOption(destination);
    return { source, destination };
  }

  /** Selects explicitly supplied source and destination accounts and verifies selection. */
  async selectKnownAccounts(source: string, destination: string): Promise<void> {
    await this.open();
    const selectedSource = await this.fromAccountSelect.selectOption(source);
    const selectedDestination = await this.toAccountSelect.selectOption(destination);
    if (!selectedSource.includes(source) || !selectedDestination.includes(destination)) {
      throw new Error(`Transfer accounts could not be selected. Source: ${source}, destination: ${destination}`);
    }
  }

  /** Returns the currently selected source and destination account identifiers. */
  async getSelectedAccounts(): Promise<{ source: string; destination: string }> {
    await this.open();
    return {
      source: (await this.fromAccountSelect.inputValue()).trim(),
      destination: (await this.toAccountSelect.inputValue()).trim()
    };
  }

  /** Navigates to overview if necessary and parses the requested account's displayed balance. */
  async getAccountBalance(accountId: string): Promise<number> {
    const accountLink = this.page.getByRole('link', { name: accountId, exact: true });
    const row = this.page.locator(`#accountTable tbody tr`).filter({ has: this.page.getByRole('link', { name: accountId, exact: true }) });
    if (!(await row.isVisible().catch(() => false))) {
      await this.page.getByRole('link', { name: 'Accounts Overview', exact: true }).click();
    }
    await row.waitFor({ state: 'visible' });
    return this.parseAmount((await row.locator('td').nth(1).textContent()) ?? '');
  }

  /** Returns the balance of the currently selected transfer source. */
  async getAvailableBalance(): Promise<number> {
    const { source } = await this.getSelectedAccounts();
    return this.getAccountBalance(source);
  }

  /**
   * Submits a transfer and returns its displayed confirmation and optional transaction ID.
   * @param amount Amount entered into the transfer form.
   * @returns Parsed amount, transaction ID when available, and confirmation text.
   * @throws Error when the UI displays a transfer validation error.
   */
  async submitTransfer(amount: string | number): Promise<TransferResult> {
    await this.open();
    await this.fill(this.amountInput, String(amount));
    await this.click(this.transferButton);
    await Promise.race([
      this.confirmationHeading.waitFor({ state: 'visible' }),
      this.validationError.waitFor({ state: 'visible' })
    ]);

    if (await this.validationError.isVisible()) {
      throw new Error(`Transfer validation failed: ${(await this.validationError.textContent())?.trim() ?? ''}`);
    }

    const confirmationText = (await this.confirmationPanel.textContent())?.trim() ?? '';
    const transactionId = await this.transactionLink.count() > 0
      ? (await this.transactionLink.textContent())?.trim() || undefined
      : undefined;
    return { amount: this.parseAmount(String(amount)), transactionId, confirmationText };
  }

  /** Submits a supplied amount without requiring a successful transfer confirmation. */
  async submitInvalidTransfer(amount: string): Promise<void> {
    await this.open();
    await this.fill(this.amountInput, amount);
    await this.click(this.transferButton);
  }

  /** Verifies the transfer-completed heading and result panel. */
  async verifyTransferCompleted(): Promise<void> {
    await expect(this.confirmationHeading).toBeVisible();
    await expect(this.confirmationPanel).toContainText('Transfer');
  }

  /** Verifies transfer completion and, when present, the transaction link. */
  async verifyTransactionDetails(): Promise<void> {
    await this.verifyTransferCompleted();
    if (await this.transactionLink.count() > 0) {
      await expect(this.transactionLink).toBeVisible();
    }
  }

  /** Confirms transfer validation is visible or that no success confirmation was shown. */
  async verifyValidationError(): Promise<void> {
    if (await this.validationError.isVisible()) {
      return;
    }

    await expect(this.confirmationHeading).not.toBeVisible();
  }

  /** Opens the selected account detail page to inspect its transaction ledger. */
  async openAccountActivity(accountId: string): Promise<void> {
    const accountLink = this.page.getByRole('link', { name: accountId, exact: true });
    if (!(await accountLink.isVisible())) {
      await this.page.getByRole('link', { name: 'Accounts Overview', exact: true }).click();
    }
    await accountLink.click();
    await this.page.getByRole('heading', { name: 'Account Details', exact: true }).waitFor({ state: 'visible' });
  }

  /** Parses the account activity table into debit/credit ledger records. */
  async getLedgerEntries(accountId: string): Promise<LedgerEntry[]> {
    await this.openAccountActivity(accountId);
    await expect.poll(() => this.activityTable.locator('tbody tr').count()).toBeGreaterThan(0);
    const rows = this.activityTable.locator('tr');
    const entries: LedgerEntry[] = [];
    for (let index = 1; index < await rows.count(); index += 1) {
      const cells = rows.nth(index).locator('td');
      const cellTexts = (await cells.allTextContents()).map((cell) => cell.trim());
      const text = cellTexts.join(' ').trim();
      if (!text) continue;
      const debitText = cellTexts[2] ?? '';
      const creditText = cellTexts[3] ?? '';
      const type = debitText ? 'debit' : creditText ? 'credit' : 'unknown';
      const amountText = debitText || creditText;
      if (!amountText || !/^\$?-?\d[\d,]*(?:\.\d{2})?$/.test(amountText)) continue;
      entries.push({
        amount: this.parseAmount(amountText),
        type,
        description: text
      });
    }
    return entries;
  }

  /** Asserts that account activity includes a matching debit or credit entry. */
  async verifyLedgerEntry(accountId: string, type: 'debit' | 'credit', amount?: number): Promise<void> {
    const entries = await this.getLedgerEntries(accountId);
    const matchingEntry = entries.find((entry) => entry.type === type && (amount === undefined || Math.abs(entry.amount - amount) < 0.01));
    expect(matchingEntry, `Expected ${type} ledger entry for ${amount ?? 'any amount'} on account ${accountId}`).toBeDefined();
  }

  /** Returns the account's current displayed balance. */
  async getCurrentBalance(accountId: string): Promise<number> {
    return this.getAccountBalance(accountId);
  }

  /** Removes currency symbols and parses a displayed monetary amount. */
  private parseAmount(value: string): number {
    const parsed = Number.parseFloat(value.replace(/[^\d.-]/g, ''));
    if (Number.isNaN(parsed)) throw new Error(`Unable to parse monetary value: ${value}`);
    return parsed;
  }
}
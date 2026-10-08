import { expect } from 'playwright/test';
import type { Locator, Page } from 'playwright';
import { BasePage } from './basepage';

/** Normalized transaction values parsed from the ParaBank search-results table. */
export interface DisplayedTransaction {
  id?: number;
  date: string;
  description: string;
  amount: number;
}

/** Models transaction lookup by ID, date, date range, and amount, including results and validation. */
export class TransactionSearchPage extends BasePage {
  private readonly findTransactionsLink = this.page.getByRole('link', { name: 'Find Transactions', exact: true });
  private readonly heading = this.page.getByRole('heading', { name: 'Find Transactions', exact: true });
  private readonly accountSelect = this.page.locator('#accountId');
  private readonly transactionIdInput = this.page.locator('#transactionId');
  private readonly transactionDateInput = this.page.locator('#transactionDate');
  private readonly fromDateInput = this.page.locator('#fromDate');
  private readonly toDateInput = this.page.locator('#toDate');
  private readonly amountInput = this.page.locator('#amount');
  private readonly findByIdButton = this.page.locator('#findById');
  private readonly findByDateButton = this.page.locator('#findByDate');
  private readonly findByDateRangeButton = this.page.locator('#findByDateRange');
  private readonly findByAmountButton = this.page.locator('#findByAmount');
  private readonly resultsTable = this.page.locator('#transactionTable');
  private readonly resultRows = this.page.locator('#transactionTable tbody tr');
  private readonly validationMessages = this.page.locator('.error:visible');

  /** Initializes transaction-search controls and result locators. */
  constructor(page: Page) {
    super(page);
  }

  /** Opens Find Transactions and waits until account options are populated. */
  async open(): Promise<void> {
    if (!(await this.heading.isVisible())) {
      await this.click(this.findTransactionsLink);
    }
    await expect(this.heading).toBeVisible();
    await this.accountSelect.waitFor({ state: 'visible' });
    await this.page.waitForFunction(() => {
      const select = document.querySelector<HTMLSelectElement>('#accountId');
      return Boolean(select && [...select.options].some((option) => option.value.trim() !== ''));
    });
  }

  /**
   * Searches the selected account's history using a transaction identifier.
   * @param transactionId Transaction ID submitted to the search form.
   */
  async searchById(transactionId: string): Promise<void> {
    await this.open();
    await this.fill(this.transactionIdInput, transactionId);
    await this.submitSearch(this.findByIdButton);
  }

  /**
   * Selects the account whose history will be searched.
   * @param accountId Available account identifier.
   */
  async selectAccount(accountId: string): Promise<void> {
    await this.open();
    await this.accountSelect.selectOption(accountId);
  }

  /**
   * Submits a transaction search for one date.
   * @param date Date value in the format accepted by ParaBank.
   */
  async searchByDate(date: string): Promise<void> {
    await this.open();
    await this.fill(this.transactionDateInput, date);
    await this.submitSearch(this.findByDateButton);
  }

  /**
   * Submits a transaction search between inclusive start and end date inputs.
   * @param fromDate Start date.
   * @param toDate End date.
   */
  async searchByDateRange(fromDate: string, toDate: string): Promise<void> {
    await this.open();
    await this.fill(this.fromDateInput, fromDate);
    await this.fill(this.toDateInput, toDate);
    await this.submitSearch(this.findByDateRangeButton);
  }

  /**
   * Submits a transaction search using an amount string.
   * @param amount Amount text entered in the search field.
   */
  async searchByAmount(amount: string): Promise<void> {
    await this.open();
    await this.fill(this.amountInput, amount);
    await this.submitSearch(this.findByAmountButton);
  }

  /**
   * Resolves symbolic transaction selectors from displayed history; literal IDs pass through.
   * @param value Literal ID or VALID_TRANSACTION/LATEST_TRANSACTION/OLDEST_TRANSACTION token.
   * @returns The transaction ID to use in a subsequent ID search.
   */
  async resolveTransactionId(value: string): Promise<string> {
    if (!['VALID_TRANSACTION', 'LATEST_TRANSACTION', 'OLDEST_TRANSACTION'].includes(value)) return value;

    await this.searchByDateRange('01-01-1900', '12-31-2099');
    await expect.poll(() => this.resultRows.count()).toBeGreaterThan(0);
    const transactions = (await this.getDisplayedTransactions())
      .filter((transaction): transaction is DisplayedTransaction & { id: number } => transaction.id !== undefined)
      .sort((left, right) => {
        const dateOrder = this.toIsoDate(left.date).localeCompare(this.toIsoDate(right.date));
        return dateOrder || left.id - right.id;
      });
    if (transactions.length === 0) {
      throw new Error(`Cannot resolve ${value}: no transaction IDs were found in the UI results.`);
    }
    return String(value === 'OLDEST_TRANSACTION' ? transactions[0].id : transactions[transactions.length - 1].id);
  }

  /** Parses visible result rows into normalized transaction records. */
  async getDisplayedTransactions(): Promise<DisplayedTransaction[]> {
    const rowCount = await this.resultRows.count();
    const transactions: DisplayedTransaction[] = [];

    for (let index = 0; index < rowCount; index += 1) {
      const row = this.resultRows.nth(index);
      const cells = row.locator('td');
      const cellCount = await cells.count();
      const values = (await cells.allTextContents()).map((value) => value.trim());
      const rowText = values.join(' ').trim();
      if (cellCount < 2 || !rowText || /no transactions found/i.test(rowText)) continue;

      const link = row.locator('a').first();
      const linkText = (await link.textContent().catch(() => ''))?.trim() ?? '';
      const href = await link.getAttribute('href').catch(() => null);
      const hrefId = href ? new URL(href, this.page.url()).searchParams.get('id') : null;
      const transactionId = hrefId && /^\d+$/.test(hrefId)
        ? Number(hrefId)
        : /^\d+$/.test(linkText) ? Number(linkText) : undefined;
      const amountText = values[2] || values[3] || '';

      transactions.push({
        id: transactionId,
        date: values[0] ?? '',
        description: values[1] ?? '',
        amount: this.parseAmount(amountText)
      });
    }

    return transactions;
  }

  /** Asserts that a non-empty transaction result table is visible. */
  async verifyResultsDisplayed(): Promise<void> {
    await expect(this.resultsTable).toBeVisible();
    await expect.poll(() => this.resultRows.count()).toBeGreaterThan(0);
    expect(await this.getDisplayedTransactions()).not.toHaveLength(0);
  }

  /** Asserts that the displayed transaction results contain no records. */
  async verifyNoResults(): Promise<void> {
    expect(await this.getDisplayedTransactions()).toHaveLength(0);
  }

  /** Asserts that a non-empty visible search validation message is displayed. */
  async verifyValidationMessage(): Promise<void> {
    await expect(this.validationMessages.first()).toBeVisible();
    await expect(this.validationMessages.first()).not.toHaveText('');
  }

  /** Verifies that an invalid search reports validation or returns no results. */
  async verifySearchFailedGracefully(): Promise<void> {
    const errorCount = await this.validationMessages.count();
    if (errorCount > 0) {
      await expect(this.validationMessages.first()).toBeVisible();
      await expect(this.validationMessages.first()).not.toHaveText('');
      return;
    }
    await this.verifyNoResults();
  }

  /** Confirms the results table is displayed after processing a search. */
  async verifySearchProcessed(): Promise<void> {
    await expect(this.resultsTable).toBeVisible();
    expect(await this.getDisplayedTransactions()).toBeDefined();
  }

  /**
   * Submits a search and waits for its transaction response unless UI validation blocks it.
   * @param button Search action corresponding to the populated criteria.
   */
  private async submitSearch(button: Locator): Promise<void> {
    const response = this.page.waitForResponse((candidate) => {
      try {
        return new URL(candidate.url()).pathname.includes('/transactions');
      } catch {
        return false;
      }
    });
    await this.click(button);
    try {
      await response;
    } catch (error) {
      if (await this.validationMessages.count() === 0) throw error;
    }
  }

  /**
   * Removes currency formatting and parses the displayed amount as a finite number.
   * @param value Displayed amount text.
   * @returns Parsed numeric amount.
   */
  private parseAmount(value: string): number {
    const normalized = value.replace(/[^\d.-]/g, '');
    if (!normalized) return 0;
    const amount = Number.parseFloat(normalized);
    if (!Number.isFinite(amount)) throw new Error(`Unable to parse transaction amount: ${value}`);
    return amount;
  }

  /**
   * Normalizes supported date values to ISO date text for stable chronological sorting.
   * @param value Numeric timestamp or displayed date.
   * @returns ISO date string.
   */
  private toIsoDate(value: number | string): string {
    if (typeof value === 'number') return new Date(value).toISOString().slice(0, 10);
    const match = value.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (match) return `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) throw new Error(`Unable to parse transaction date: ${value}`);
    return parsed.toISOString().slice(0, 10);
  }

}
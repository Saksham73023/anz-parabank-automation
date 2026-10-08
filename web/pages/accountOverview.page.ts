import { expect } from 'playwright/test';
import { Page, request } from 'playwright';
import { BasePage } from './basepage';

/** Provides account-list and account-detail operations for the logged-in customer's overview. */
export class AccountsOverviewPage extends BasePage {
	private readonly pageHeading = this.page.getByRole('heading', { name: 'Accounts Overview', exact: true });
	private readonly accountRows = this.page.locator('#accountTable tbody tr');
	private readonly accountNumberLinks = this.page.locator('#accountTable tbody tr td a');
	private readonly accountBalanceCells = this.page.locator('#accountTable tbody tr td:nth-child(2)');
	private readonly accountDetailsHeading = this.page.getByRole('heading', { name: 'Account Details', exact: true });
	private readonly accountIdValue = this.page.locator('#accountId');
	private readonly accountDetailsBalance = this.page.locator('#balance');

	/** Binds account overview locators to the scenario page. */
	constructor(page: Page) {
		super(page);
	}

	/** Opens Accounts Overview when needed and verifies its heading is visible. */
	async verifyPageDisplayed(): Promise<void> {
		if (!(await this.pageHeading.isVisible())) {
			await this.click(this.page.getByRole('link', { name: 'Accounts Overview', exact: true }));
		}
		await expect(this.pageHeading).toBeVisible();
	}

	/** Waits for account rows and asserts that at least one account is listed. */
	async verifyAtLeastOneAccountExists(): Promise<void> {
		await this.accountRows.first().waitFor({ state: 'visible', timeout: 10000 });
		expect(await this.accountRows.count()).toBeGreaterThan(0);
	}

	/** Returns the visible account identifiers after confirming the list is populated. */
	async getAccountIds(): Promise<string[]> {
		await this.verifyAtLeastOneAccountExists();
		return (await this.accountNumberLinks.allTextContents()).map((id) => id.trim());
	}

	/** Returns parsed numeric balances for all visible account rows. */
	async getAccountBalances(): Promise<number[]> {
		await this.verifyAtLeastOneAccountExists();
		const balances = await this.accountBalanceCells.allTextContents();
		return balances.map((balance) => Number.parseFloat(balance.replace(/[$,]/g, '').trim()));
	}

	/** Returns the first visible account ID. */
	async getFirstAccountId(): Promise<string> {
		return (await this.getAccountIds())[0];
	}

	/** Returns the first visible account's numeric balance. */
	async getFirstAccountBalance(): Promise<number> {
		return (await this.getAccountBalances())[0];
	}

	/** Returns the number of accounts shown in the overview. */
	async getAccountCount(): Promise<number> {
		return (await this.getAccountIds()).length;
	}

	/** Calculates the total of all parsed account balances. */
	async getTotalBalance(): Promise<number> {
		const balances = await this.getAccountBalances();
		return balances.reduce((total, balance) => total + balance, 0);
	}

	/**
	 * Asserts that each supplied account identifier is visible as a link.
	 * @param accountIds Account IDs expected in the overview.
	 */
	async verifyAccountIdsVisible(accountIds: string[]): Promise<void> {
		for (const accountId of accountIds) {
			await expect(this.page.getByRole('link', { name: accountId, exact: true })).toBeVisible();
		}
	}

	/**
	 * Opens the requested account, or the first account when no ID is supplied.
	 * @param accountId Optional account ID; empty selects the first visible account.
	 * @returns The account ID opened.
	 */
	async clickAccount(accountId = ''): Promise<string> {
		const selectedAccountId = accountId || await this.getFirstAccountId();
		await this.click(this.page.getByRole('link', { name: selectedAccountId, exact: true }));
		return selectedAccountId;
	}

	/**
	 * Opens and returns the first account with a non-negative displayed balance.
	 * @returns The selected account ID.
	 */
	async clickAccountWithNonNegativeBalance(): Promise<string> {
		const rowCount = await this.accountRows.count();
		for (let index = 0; index < rowCount; index += 1) {
			const row = this.accountRows.nth(index);
			const balance = Number.parseFloat((await row.locator('td').nth(1).textContent() ?? '').replace(/[$,]/g, '').trim());
			if (balance >= 0) {
				const accountId = (await row.locator('td a').textContent() ?? '').trim();
				await this.click(row.locator('td a'));
				return accountId;
			}
		}
		throw new Error('No account with a non-negative balance is available.');
	}

	/** Verifies that account details include a heading, ID, and balance. */
	async verifyAccountDetailsDisplayed(): Promise<void> {
		await expect(this.accountDetailsHeading).toBeVisible();
		await expect(this.accountIdValue).not.toHaveText('');
		await expect(this.accountDetailsBalance).not.toHaveText('');
	}

	/**
	 * Reads the account ID from the detail page after validating its display.
	 * @returns The trimmed account identifier.
	 */
	async getDisplayedAccountId(): Promise<string> {
		await this.verifyAccountDetailsDisplayed();
		return ((await this.accountIdValue.getAttribute('value')) ?? (await this.accountIdValue.textContent()) ?? '').trim();
	}

	/**
	 * Reads and parses the account detail balance after validating the detail view.
	 * @returns Numeric account balance.
	 */
	async getDisplayedAccountBalance(): Promise<number> {
		await this.verifyAccountDetailsDisplayed();
		const balance = (await this.accountDetailsBalance.getAttribute('value')) ?? (await this.accountDetailsBalance.textContent()) ?? '';
		return Number.parseFloat(balance.replace(/[$,]/g, '').trim());
	}

	/** Reuses the authenticated browser cookies to retrieve the account list for UI/API comparison. */
	async getAccountsFromApi(): Promise<Array<{ id: number; balance: number }>> {
		const resourceUrls = await this.page.evaluate(() => performance.getEntriesByType('resource').map((entry) => entry.name));
		const accountsUrl = resourceUrls.find((url) => url.includes('/services_proxy/bank/customers/') && url.endsWith('/accounts'));
		if (!accountsUrl) {
			throw new Error('Authenticated account API response was not found.');
		}

		const cookies = await this.page.context().cookies(accountsUrl);
		const apiContext = await request.newContext({
			ignoreHTTPSErrors: true,
			extraHTTPHeaders: {
				Cookie: cookies.map(({ name, value }) => `${name}=${value}`).join('; ')
			}
		});

		try {
			const response = await apiContext.get(accountsUrl);
			if (!response.ok()) {
				throw new Error(`Account API request failed with status ${response.status()}.`);
			}

			return await response.json() as Array<{ id: number; balance: number }>;
		} finally {
			await apiContext.dispose();
		}
	}

	/** Asserts that an account number link is visible and non-empty. */
	async verifyAccountNumberIsVisible(): Promise<void> {
		await expect(this.accountNumberLinks.first()).toBeVisible();
		await expect(this.accountNumberLinks.first()).not.toHaveText('');
	}

	/** Parses and validates the first displayed account balance as a positive finite value. */
	async verifyAccountBalanceIsValid(): Promise<void> {
		const balanceText = (await this.getText(this.accountBalanceCells.first())).trim();
		const normalizedBalance = balanceText.replace(/[$,]/g, '').trim();
		const balance = Number(normalizedBalance);

		expect(normalizedBalance).not.toBe('');
		expect(Number.isFinite(balance)).toBe(true);
		expect(balance).toBeGreaterThan(0);
	}
}

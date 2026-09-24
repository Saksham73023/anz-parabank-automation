import { expect } from 'playwright/test';
import { Page, request } from 'playwright';
import { BasePage } from './basepage';

export class AccountsOverviewPage extends BasePage {
	private readonly pageHeading = this.page.getByRole('heading', { name: 'Accounts Overview', exact: true });
	private readonly accountRows = this.page.locator('#accountTable tbody tr');
	private readonly accountNumberLinks = this.page.locator('#accountTable tbody tr td a');
	private readonly accountBalanceCells = this.page.locator('#accountTable tbody tr td:nth-child(2)');
	private readonly accountDetailsHeading = this.page.getByRole('heading', { name: 'Account Details', exact: true });
	private readonly accountIdValue = this.page.locator('#accountId');
	private readonly accountDetailsBalance = this.page.locator('#balance');

	constructor(page: Page) {
		super(page);
	}

	async verifyPageDisplayed(): Promise<void> {
		if (!(await this.pageHeading.isVisible())) {
			await this.page.getByRole('link', { name: 'Accounts Overview', exact: true }).click();
		}
		await expect(this.pageHeading).toBeVisible();
	}

	async verifyAtLeastOneAccountExists(): Promise<void> {
		await this.accountRows.first().waitFor({ state: 'visible', timeout: 10000 });
		expect(await this.accountRows.count()).toBeGreaterThan(0);
	}

	async getAccountIds(): Promise<string[]> {
		await this.verifyAtLeastOneAccountExists();
		return (await this.accountNumberLinks.allTextContents()).map((id) => id.trim());
	}

	async getAccountBalances(): Promise<number[]> {
		await this.verifyAtLeastOneAccountExists();
		const balances = await this.accountBalanceCells.allTextContents();
		return balances.map((balance) => Number.parseFloat(balance.replace(/[$,]/g, '').trim()));
	}

	async getFirstAccountId(): Promise<string> {
		return (await this.getAccountIds())[0];
	}

	async getFirstAccountBalance(): Promise<number> {
		return (await this.getAccountBalances())[0];
	}

	async getAccountCount(): Promise<number> {
		return (await this.getAccountIds()).length;
	}

	async getTotalBalance(): Promise<number> {
		const balances = await this.getAccountBalances();
		return balances.reduce((total, balance) => total + balance, 0);
	}

	async verifyAccountIdsVisible(accountIds: string[]): Promise<void> {
		for (const accountId of accountIds) {
			await expect(this.page.getByRole('link', { name: accountId, exact: true })).toBeVisible();
		}
	}

	async clickAccount(accountId = ''): Promise<string> {
		const selectedAccountId = accountId || await this.getFirstAccountId();
		await this.page.getByRole('link', { name: selectedAccountId, exact: true }).click();
		return selectedAccountId;
	}

	async clickAccountWithNonNegativeBalance(): Promise<string> {
		const rowCount = await this.accountRows.count();
		for (let index = 0; index < rowCount; index += 1) {
			const row = this.accountRows.nth(index);
			const balance = Number.parseFloat((await row.locator('td').nth(1).textContent() ?? '').replace(/[$,]/g, '').trim());
			if (balance >= 0) {
				const accountId = (await row.locator('td a').textContent() ?? '').trim();
				await row.locator('td a').click();
				return accountId;
			}
		}
		throw new Error('No account with a non-negative balance is available.');
	}

	async verifyAccountDetailsDisplayed(): Promise<void> {
		await expect(this.accountDetailsHeading).toBeVisible();
		await expect(this.accountIdValue).not.toHaveText('');
		await expect(this.accountDetailsBalance).not.toHaveText('');
	}

	async getDisplayedAccountId(): Promise<string> {
		await this.verifyAccountDetailsDisplayed();
		return ((await this.accountIdValue.getAttribute('value')) ?? (await this.accountIdValue.textContent()) ?? '').trim();
	}

	async getDisplayedAccountBalance(): Promise<number> {
		await this.verifyAccountDetailsDisplayed();
		const balance = (await this.accountDetailsBalance.getAttribute('value')) ?? (await this.accountDetailsBalance.textContent()) ?? '';
		return Number.parseFloat(balance.replace(/[$,]/g, '').trim());
	}

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

	async verifyAccountNumberIsVisible(): Promise<void> {
		await expect(this.accountNumberLinks.first()).toBeVisible();
		await expect(this.accountNumberLinks.first()).not.toHaveText('');
	}

	async verifyAccountBalanceIsValid(): Promise<void> {
		const balance = (await this.getText(this.accountBalanceCells.first())).trim();
		expect(balance).not.toBe('');
		expect(balance).not.toBe('$0.00');
	}
}

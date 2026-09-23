import { expect } from 'playwright/test';
import { Page } from 'playwright';
import { BasePage } from './basepage';

export class AccountsOverviewPage extends BasePage {
	private readonly pageHeading = this.page.getByRole('heading', { name: 'Accounts Overview', exact: true });
	private readonly accountRows = this.page.locator('#accountTable tbody tr');
	private readonly accountNumberLinks = this.page.locator('#accountTable tbody tr td a');
	private readonly accountBalanceCells = this.page.locator('#accountTable tbody tr td:nth-child(2)');

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

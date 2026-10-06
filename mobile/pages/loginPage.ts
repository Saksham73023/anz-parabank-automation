import { expect } from 'playwright/test';
import type { Page } from 'playwright';

const defaultBaseUrl = 'https://parabank.parasoft.com/parabank/index.htm';

export class MobileLoginPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto(process.env.BASE_URL?.trim() || defaultBaseUrl, { waitUntil: 'domcontentloaded' });
    await expect(this.page.locator('input[name="username"]')).toBeVisible();
  }

  async login(username: string, password: string): Promise<void> {
    await this.page.locator('input[name="username"]').fill(username);
    await this.page.locator('input[name="password"]').fill(password);
    await this.page.locator('input[type="submit"][value="Log In"]').click();
  }

  async verifyLoggedIn(): Promise<void> {
    await expect(this.page).toHaveURL(/\/overview\.htm(?:;[^/?#]+)?(?:\?[^#]*)?$/);
    await expect(this.page.getByRole('heading', { name: 'Accounts Overview', exact: true })).toBeVisible();
  }

  async logout(): Promise<void> {
    await this.page.getByRole('link', { name: 'Log Out', exact: true }).click();
  }

  async verifyLoggedOut(): Promise<void> {
    await expect(this.page.locator('input[name="username"]')).toBeVisible();
    await expect(this.page.locator('input[name="password"]')).toBeVisible();
  }
}

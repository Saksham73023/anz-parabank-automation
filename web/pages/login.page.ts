import { expect } from 'playwright/test';
import type { Locator, Page } from 'playwright';
import { BasePage } from './basepage';

const DEFAULT_BASE_URL = 'https://parabank.parasoft.com/parabank/index.htm';

export class LoginPage extends BasePage {
  private readonly usernameInput: Locator;
  private readonly passwordInput: Locator;
  private readonly loginButton: Locator;
  private readonly loginError: Locator;
  private readonly logoutLink: Locator;
  private readonly accountOverviewHeading: Locator;
  private readonly loginRoute = /\/(?:index|login)\.htm(?:;[^/?#]+)?(?:\?[^#]*)?$/;

  constructor(page: Page) {
    super(page);
    this.usernameInput = page.locator('input[name="username"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.loginButton = page.locator('input[type="submit"][value="Log In"]');
    this.loginError = page.locator('.error:visible');
    this.logoutLink = page.getByRole('link', { name: 'Log Out' });
    this.accountOverviewHeading = page.getByRole('heading', {
      name: 'Accounts Overview',
      exact: true
    });
  }

  async open(): Promise<void> {
    await this.navigate(process.env.BASE_URL ?? DEFAULT_BASE_URL);
    await this.verifyLoginPageDisplayed();
  }

  async login(username: string, password: string): Promise<void> {
    await this.fillCredentials(username, password);
    await this.loginButton.click();
  }

  async fillCredentials(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
  }

  async clickLogin(): Promise<void> {
    await this.loginButton.click();
  }

  async verifyLoginSucceeded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/overview\.htm(?:;[^/?#]+)?(?:\?[^#]*)?$/);
    await expect(this.accountOverviewHeading).toBeVisible();
    await expect(this.logoutLink).toBeVisible();
    await expect(this.usernameInput).toBeHidden();
  }

  async verifyLoginRejected(expectedMessage: string): Promise<void> {
    await expect(this.loginError.first()).toHaveText(expectedMessage);
    await expect(this.page).toHaveURL(this.loginRoute);
    await expect(this.logoutLink).toBeHidden();
    await expect(this.accountOverviewHeading).toBeHidden();
  }

  async verifyBlankLoginRemainsUnauthenticated(): Promise<void> {
    await expect(this.page).toHaveURL(this.loginRoute);
    await expect(this.usernameInput).toBeVisible();
    await expect(this.usernameInput).toHaveValue('');
    await expect(this.passwordInput).toBeVisible();
    await expect(this.passwordInput).toHaveValue('');
    await expect(this.logoutLink).toBeHidden();
    await expect(this.accountOverviewHeading).toBeHidden();
  }

  async logout(): Promise<void> {
    await expect(this.logoutLink).toBeVisible();
    await this.logoutLink.click();
  }

  async verifyLoginPageDisplayed(): Promise<void> {
    await expect(this.page).toHaveURL(this.loginRoute);
    await expect(this.usernameInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
    await expect(this.logoutLink).toBeHidden();
    await expect(this.accountOverviewHeading).toBeHidden();
  }

  async verifyAuthenticationRequired(): Promise<void> {
    await expect(this.page).toHaveURL(/\/(?:index|login|openaccount)\.htm(?:;[^/?#]+)?(?:\?[^#]*)?$/);
    await expect(this.usernameInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
    await expect(this.logoutLink).toBeHidden();
    await expect(this.accountOverviewHeading).toBeHidden();
    await expect(this.page.locator('select#type')).toBeHidden();
  }

  async verifyProtectedPageRequiresLogin(): Promise<void> {
    const overviewUrl = new URL('overview.htm', process.env.BASE_URL ?? DEFAULT_BASE_URL);
    await this.page.goto(overviewUrl.toString(), { waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveURL(/\/overview\.htm(?:;[^/?#]+)?(?:\?[^#]*)?$/);
    await expect(this.usernameInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
    await expect(this.logoutLink).toBeHidden();
    await expect(this.accountOverviewHeading).toBeHidden();
  }
}
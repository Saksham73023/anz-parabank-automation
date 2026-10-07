import { expect } from 'playwright/test';
import type { Locator, Page } from 'playwright';
import { BasePage } from './basepage';

const DEFAULT_BASE_URL = 'https://parabank.parasoft.com/parabank/index.htm';

/** Models ParaBank sign-in, authentication-state validation, protected-page access, and logout. */
export class LoginPage extends BasePage {
  private readonly usernameInput: Locator;
  private readonly passwordInput: Locator;
  private readonly loginButton: Locator;
  private readonly loginError: Locator;
  private readonly logoutLink: Locator;
  private readonly accountOverviewHeading: Locator;
  private readonly loginRoute = /\/(?:index|login)\.htm(?:;[^/?#]+)?(?:\?[^#]*)?$/;

  /** Initializes login form, navigation, error, and authenticated-state locators. */
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

  /** Opens the configured ParaBank entry page and verifies the unauthenticated login form. */
  async open(): Promise<void> {
    await this.navigate(process.env.BASE_URL ?? DEFAULT_BASE_URL);
    await this.verifyLoginPageDisplayed();
  }

  /**
   * Enters credentials and submits the login form.
   * @param username ParaBank user name.
   * @param password ParaBank password.
   */
  async login(username: string, password: string): Promise<void> {
    await this.fillCredentials(username, password);
    await this.loginButton.click();
  }

  /** Fills username and password fields without submitting the form. */
  async fillCredentials(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
  }

  /** Submits the currently populated login form. */
  async clickLogin(): Promise<void> {
    await this.loginButton.click();
  }

  /** Verifies overview navigation and authenticated controls after successful login. */
  async verifyLoginSucceeded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/overview\.htm(?:;[^/?#]+)?(?:\?[^#]*)?$/);
    await expect(this.accountOverviewHeading).toBeVisible();
    await expect(this.logoutLink).toBeVisible();
    await expect(this.usernameInput).toBeHidden();
  }

  /** Verifies the expected error and confirms the application remains unauthenticated. */
  async verifyLoginRejected(expectedMessage: string): Promise<void> {
    await expect(this.loginError.first()).toHaveText(expectedMessage);
    await expect(this.page).toHaveURL(this.loginRoute);
    await expect(this.logoutLink).toBeHidden();
    await expect(this.accountOverviewHeading).toBeHidden();
  }

  /** Confirms blank credentials leave the user on the unauthenticated login page. */
  async verifyBlankLoginRemainsUnauthenticated(): Promise<void> {
    await expect(this.page).toHaveURL(this.loginRoute);
    await expect(this.usernameInput).toBeVisible();
    await expect(this.usernameInput).toHaveValue('');
    await expect(this.passwordInput).toBeVisible();
    await expect(this.passwordInput).toHaveValue('');
    await expect(this.logoutLink).toBeHidden();
    await expect(this.accountOverviewHeading).toBeHidden();
  }

  /** Clicks the logout link after confirming it is available. */
  async logout(): Promise<void> {
    await expect(this.logoutLink).toBeVisible();
    await this.logoutLink.click();
  }

  /** Verifies the login page controls are visible and authenticated controls are absent. */
  async verifyLoginPageDisplayed(): Promise<void> {
    await expect(this.page).toHaveURL(this.loginRoute);
    await expect(this.usernameInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
    await expect(this.logoutLink).toBeHidden();
    await expect(this.accountOverviewHeading).toBeHidden();
  }

  /** Confirms an unauthenticated visitor is returned to a login-required page state. */
  async verifyAuthenticationRequired(): Promise<void> {
    await expect(this.page).toHaveURL(/\/(?:index|login|openaccount)\.htm(?:;[^/?#]+)?(?:\?[^#]*)?$/);
    await expect(this.usernameInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
    await expect(this.logoutLink).toBeHidden();
    await expect(this.accountOverviewHeading).toBeHidden();
    await expect(this.page.locator('select#type')).toBeHidden();
  }

  /** Directly opens account overview and verifies access is redirected to login. */
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
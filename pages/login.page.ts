import { Page } from 'playwright';

export class LoginPage {
  private readonly usernameInput;
  private readonly passwordInput;
  private readonly loginButton;
  private readonly loginError;
  private readonly logoutLink;

  constructor(private readonly page: Page) {
    this.usernameInput = page.locator('input[name="username"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.loginButton = page.locator('input[value="Log In"]');
    this.loginError = page.locator('.error:visible').first();
    this.logoutLink = page.getByRole('link', { name: 'Log Out' });
  }

  async open(): Promise<void> {
    await this.page.goto(process.env.BASE_URL ?? 'https://parabank.parasoft.com/parabank/index.htm');
    await this.usernameInput.waitFor({ state: 'visible' });
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

  async verifyLoginError(): Promise<void> {
    await this.loginError.waitFor({ state: 'visible' });
  }

  async logout(): Promise<void> {
    await this.logoutLink.click();
  }

  async verifyLoginPageDisplayed(): Promise<void> {
    await this.usernameInput.waitFor({ state: 'visible' });
    await this.passwordInput.waitFor({ state: 'visible' });
    await this.loginButton.waitFor({ state: 'visible' });
  }
}
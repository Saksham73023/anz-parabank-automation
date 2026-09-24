import { Page } from 'playwright';

export class LoginPage {
  // Login page locators
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
  
  //Navigate to ParaBank login page
  async open(): Promise<void> {
    await this.page.goto(
      process.env.BASE_URL ?? 'https://parabank.parasoft.com/parabank/index.htm',
      { waitUntil: 'domcontentloaded' }
    );
    await this.usernameInput.waitFor({ state: 'visible' });
  }

 // Perform user login
  async login(username: string, password: string): Promise<void> {
    await this.fillCredentials(username, password);
    await this.loginButton.click();
  }

  //Enter username and password
  async fillCredentials(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
  }

  //Click Login button
  async clickLogin(): Promise<void> {
    await this.loginButton.click();
  }
  //Verify login error is displayed
  async verifyLoginError(): Promise<void> {
    await this.loginError.waitFor({ state: 'visible' });
  }

  // Verify login error is displayed
  async logout(): Promise<void> {
    await this.logoutLink.click();
  }

  // Verify user is navigated back to login page
  async verifyLoginPageDisplayed(): Promise<void> {
    await this.usernameInput.waitFor({ state: 'visible' });
    await this.passwordInput.waitFor({ state: 'visible' });
    await this.loginButton.waitFor({ state: 'visible' });
  }
}
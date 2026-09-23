import { Page } from 'playwright';
import { BasePage } from './basepage';

export interface RegistrationData {
	firstName: string;
	lastName: string;
	address: string;
	city: string;
	state: string;
	zipCode: string;
	phoneNumber: string;
	ssn: string;
	username: string;
	password: string;
}

export class RegistrationPage extends BasePage {
	// ParaBank exposes stable name attributes for every registration field.
	private readonly registerLink = this.page.getByRole('link', { name: 'Register' });
	private readonly firstNameInput = this.page.locator('input[name="customer.firstName"]');
	private readonly lastNameInput = this.page.locator('input[name="customer.lastName"]');
	private readonly addressInput = this.page.locator('input[name="customer.address.street"]');
	private readonly cityInput = this.page.locator('input[name="customer.address.city"]');
	private readonly stateInput = this.page.locator('input[name="customer.address.state"]');
	private readonly zipCodeInput = this.page.locator('input[name="customer.address.zipCode"]');
	private readonly phoneInput = this.page.locator('input[name="customer.phoneNumber"]');
	private readonly ssnInput = this.page.locator('input[name="customer.ssn"]');
	private readonly usernameInput = this.page.locator('input[name="customer.username"]');
	private readonly passwordInput = this.page.locator('input[name="customer.password"]');
	private readonly confirmPasswordInput = this.page.locator('input[name="repeatedPassword"]');
	private readonly registerButton = this.page.locator('input[value="Register"]');
	private readonly registrationError = this.page.locator('.error:visible').first();

	constructor(page: Page) {
		super(page);
	}

	async open(): Promise<void> {
		await this.navigate(process.env.BASE_URL ?? 'https://parabank.parasoft.com/parabank/index.htm');
		const logoutLink = this.page.getByRole('link', { name: 'Log Out' });
		if (await logoutLink.isVisible()) {
			await logoutLink.click();
		}
		await this.click(this.registerLink);
		await this.waitForElement(this.usernameInput);
	}

	async register(data: RegistrationData): Promise<void> {
		await this.fillRegistrationForm(data);
		await this.submit();

		const successMessage = this.page.getByText('Your account was created successfully. You are now logged in.');
		await Promise.race([
			successMessage.waitFor({ state: 'visible' }),
			this.registrationError.waitFor({ state: 'visible' })
		]);

		if (await this.registrationError.isVisible()) {
			throw new Error(`Registration failed: ${(await this.registrationError.textContent())?.trim()}`);
		}
	}

	async fillRegistrationForm(data: RegistrationData, confirmationPassword = data.password): Promise<void> {
		await this.fill(this.firstNameInput, data.firstName);
		await this.fill(this.lastNameInput, data.lastName);
		await this.fill(this.addressInput, data.address);
		await this.fill(this.cityInput, data.city);
		await this.fill(this.stateInput, data.state);
		await this.fill(this.zipCodeInput, data.zipCode);
		await this.fill(this.phoneInput, data.phoneNumber);
		await this.fill(this.ssnInput, data.ssn);
		await this.fill(this.usernameInput, data.username);
		await this.fill(this.passwordInput, data.password);
		await this.fill(this.confirmPasswordInput, confirmationPassword);
	}

	async submit(): Promise<void> {
		await this.click(this.registerButton);
	}

	async isRegistrationSuccessful(): Promise<boolean> {
		return this.isVisible(this.page.getByText('Your account was created successfully. You are now logged in.'));
	}
}

import { Page } from 'playwright';
import { BasePage } from './basepage';

const registrationResultTimeout = Number(process.env.REGISTRATION_RESULT_TIMEOUT_MS ?? 20000);

/** Customer identity and credential fields submitted through the registration form. */
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

/** Models customer registration, form validation, and the post-registration outcome. */
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

	/** Initializes registration form controls on the active page. */
	constructor(page: Page) {
		super(page);
	}

	/** Opens registration, handles an existing session, and waits for security verification or the form. */
	async open(): Promise<void> {
		await this.navigate(process.env.BASE_URL ?? 'https://parabank.parasoft.com/parabank/index.htm');
		const logoutLink = this.page.getByRole('link', { name: 'Log Out' });
		if (await logoutLink.isVisible()) {
			await this.click(logoutLink);
		}
		const verificationPage = this.page.getByText(/performing security verification|verify you are human/i).first();
		if (await verificationPage.isVisible().catch(() => false)) {
			if (process.env.HEADLESS !== 'false') {
				throw new Error('Cloudflare human verification is blocking ParaBank. Rerun this scenario headed and complete the verification manually.');
			}
			await this.registerLink.waitFor({
				state: 'visible',
				timeout: Number(process.env.CLOUDFLARE_TIMEOUT_MS ?? 120000)
			});
		} else {
			await this.registerLink.waitFor({ state: 'visible' });
		}
		await this.click(this.registerLink);
		await this.waitForElement(this.usernameInput);
	}

	/**
	 * Fills and submits registration data, then resolves success or visible validation failure.
	 * @param data Customer details and credentials to submit.
	 * @param expectedSuccessMessage Confirmation text required for successful registration.
	 */
	async register(data: RegistrationData, expectedSuccessMessage: string): Promise<void> {
		await this.fillRegistrationForm(data);
		await this.submit();

		const successMessage = this.page.getByText(expectedSuccessMessage);
		await Promise.race([
			successMessage.waitFor({ state: 'visible', timeout: registrationResultTimeout }),
			this.registrationError.waitFor({ state: 'visible', timeout: registrationResultTimeout })
		]);

		if (await this.registrationError.isVisible()) {
			throw new Error(`Registration failed: ${(await this.registrationError.textContent())?.trim()}`);
		}
	}

	/**
	 * Populates all registration fields, optionally using a separate confirmation password.
	 * @param data Customer details and credentials for the registration form.
	 * @param confirmationPassword Value entered in the password-confirmation field.
	 */
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

	/** Submits the registration form. */
	async submit(): Promise<void> {
		if ((process.env.BROWSER ?? '').toLowerCase() === 'firefox') {
			await this.confirmPasswordInput.press('Enter');
		} else {
			await this.click(this.registerButton);
		}
	}

	/**
	 * Reports whether the expected registration confirmation is currently visible.
	 * @param expectedSuccessMessage Confirmation text to locate.
	 * @returns True when the success message is visible.
	 */
	async isRegistrationSuccessful(expectedSuccessMessage: string): Promise<boolean> {
		return this.isVisible(this.page.getByText(expectedSuccessMessage));
	}
}

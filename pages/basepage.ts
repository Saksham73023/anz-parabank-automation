import { expect } from 'playwright/test';
import { Locator, Page } from 'playwright';

export class BasePage {
    protected page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async navigate(url: string): Promise<void> {
        await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    }

    async click(locator: Locator): Promise<void> {
        await locator.click();
    }

    async fill(locator: Locator, value: string): Promise<void> {
        await locator.fill(value);
    }

    async type(locator: Locator, value: string): Promise<void> {
        await locator.type(value);
    }

    async getText(locator: Locator): Promise<string> {
        return (await locator.textContent()) || '';
    }

    async isVisible(locator: Locator): Promise<boolean> {
        return await locator.isVisible();
    }

    async waitForElement(locator: Locator): Promise<void> {
        await locator.waitFor({ state: 'visible' });
    }

    async getAttribute(locator: Locator, attribute: string): Promise<string | null> {
        return locator.getAttribute(attribute);
    }

    async getPageTitle(): Promise<string> {
        return await this.page.title();
    }

    async verifyPageTitle(expectedTitle: string): Promise<void> {
        await expect(this.page).toHaveTitle(expectedTitle);
    }

    async verifyText(locator: Locator, expectedText: string): Promise<void> {
        await expect(locator).toContainText(expectedText);
    }
}
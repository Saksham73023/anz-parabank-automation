import { expect } from 'playwright/test';
import type { Locator, Page } from 'playwright';

/** Provides common Playwright navigation, interaction, and assertion services for Web page objects. */
export class BasePage {
    protected readonly page: Page;

    /** Binds shared page operations to the scenario's active browser page. */
    constructor(page: Page) {
        this.page = page;
    }

    /**
     * Navigates to a URL and waits for the initial document content to load.
     * @param url Destination URL.
     */
    async navigate(url: string): Promise<void> {
        await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    }

    /**
     * Clicks the supplied locator after Playwright's built-in actionability checks.
     * @param locator Playwright locator for the target control.
     */
    async click(locator: Locator): Promise<void> {
        if ((process.env.BROWSER ?? '').toLowerCase() === 'firefox') {
            await locator.press('Enter');
            return;
        }
        await locator.click();
    }

    /**
     * Replaces the input value with the supplied text.
     * @param locator Playwright locator for the input control.
     * @param value Text to enter.
     */
    async fill(locator: Locator, value: string): Promise<void> {
        await locator.fill(value);
    }

    /**
     * Types text into the selected locator using Playwright keyboard input.
     * @param locator Playwright locator for the target control.
     * @param value Text to type.
     */
    async type(locator: Locator, value: string): Promise<void> {
        await locator.type(value);
    }

    /**
     * Returns locator text, normalizing a missing text node to an empty string.
     * @param locator Playwright locator whose text is read.
     * @returns Visible text content or an empty string.
     */
    async getText(locator: Locator): Promise<string> {
        return (await locator.textContent()) || '';
    }

    /**
     * Reports whether the target locator is currently visible.
     * @param locator Playwright locator to inspect.
     * @returns True when the locator is visible.
     */
    async isVisible(locator: Locator): Promise<boolean> {
        return await locator.isVisible();
    }

    /** Waits until the target locator reaches the visible state. */
    async waitForElement(locator: Locator): Promise<void> {
        await locator.waitFor({ state: 'visible' });
    }

    /** Asserts that the target locator is visible. */
    async expectVisible(locator: Locator): Promise<void> {
        await expect(locator).toBeVisible();
    }

    /**
     * Reads an HTML attribute, returning null when it is not present.
     * @param locator Element whose attribute is read.
     * @param attribute Attribute name.
     * @returns Attribute value or null.
     */
    async getAttribute(locator: Locator, attribute: string): Promise<string | null> {
        return locator.getAttribute(attribute);
    }

    /** Returns the active document title. */
    async getPageTitle(): Promise<string> {
        return await this.page.title();
    }

    /**
     * Asserts that the active document title matches the expected value.
     * @param expectedTitle Expected browser document title.
     */
    async verifyPageTitle(expectedTitle: string): Promise<void> {
        await expect(this.page).toHaveTitle(expectedTitle);
    }

    /**
     * Asserts that the locator contains the expected text.
     * @param locator Playwright locator to inspect.
     * @param expectedText Required text fragment.
     */
    async verifyText(locator: Locator, expectedText: string): Promise<void> {
        await expect(locator).toContainText(expectedText);
    }
}
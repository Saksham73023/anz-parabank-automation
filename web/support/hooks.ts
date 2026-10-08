import { After, Before, Status, setDefaultTimeout } from '@cucumber/cucumber';
import { mkdir } from 'node:fs/promises';
import { chromium, firefox, webkit, BrowserType } from 'playwright';
import { CustomWorld } from './world';

const stepTimeout = Number(process.env.CUCUMBER_TIMEOUT ?? 30000);
const verificationTimeout = Number(process.env.CLOUDFLARE_TIMEOUT_MS ?? 120000);
setDefaultTimeout(stepTimeout + (process.env.HEADLESS === 'false' ? verificationTimeout : 0));

/** Resolves the configured browser engine for Web scenarios, defaulting to Chromium. */
function selectedBrowser(): BrowserType {
  const browserName = (process.env.BROWSER ?? 'chromium').toLowerCase();
  const browsers: Record<string, BrowserType> = { chromium, firefox };
  const browser = browsers[browserName];
  if (!browser) {
    throw new Error(`Unsupported BROWSER "${browserName}". Supported browsers: ${Object.keys(browsers).join(', ')}.`);
  }
  return browser;
}

/** Launches the browser and initializes isolated context/page state for a scenario. */
Before(async function (this: CustomWorld, { pickle }) {
  this.browser = await selectedBrowser().launch({
    headless: process.env.HEADLESS !== 'false'
  });
  const hasMobileTag = pickle.tags.some(({ name }) => name === '@mobile');
  const isMobileScenario = process.env.MOBILE_VIEWPORT === 'true'
    || (process.env.MOBILE_VIEWPORT !== 'false' && hasMobileTag);
  this.context = await this.browser.newContext({
    ...(isMobileScenario
      ? {
          viewport: { width: 390, height: 844 }
        }
      : {})
  });
  this.page = await this.context.newPage();
  this.page.setDefaultTimeout(Number(process.env.DEFAULT_TIMEOUT ?? 30000));
  this.page.setDefaultNavigationTimeout(Number(process.env.NAVIGATION_TIMEOUT ?? 45000));
});

/** Captures a full-page failure screenshot outside the reports folder and closes browser resources. */
After(async function (this: CustomWorld, scenario) {
  if (scenario.result?.status === Status.FAILED && this.page && !this.page.isClosed()) {
    await mkdir('test-results', { recursive: true });
    await this.page.screenshot({ path: `test-results/${Date.now()}-failure.png`, fullPage: true });
  }
  await this.context?.close();
  await this.browser?.close();
});
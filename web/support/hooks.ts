import { After, Before, Status, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium, firefox, webkit, BrowserType } from 'playwright';
import { CustomWorld } from './world';

setDefaultTimeout(Number(process.env.CUCUMBER_TIMEOUT ?? 30000));

function selectedBrowser(): BrowserType {
  const browserName = (process.env.BROWSER ?? 'chromium').toLowerCase();
  if (browserName === 'firefox') return firefox;
  if (browserName === 'webkit') return webkit;
  return chromium;
}

Before(async function (this: CustomWorld) {
  this.browser = await selectedBrowser().launch({
    headless: process.env.HEADLESS !== 'false'
  });
  this.context = await this.browser.newContext();
  this.page = await this.context.newPage();
  this.page.setDefaultTimeout(Number(process.env.DEFAULT_TIMEOUT ?? 30000));
  this.page.setDefaultNavigationTimeout(Number(process.env.NAVIGATION_TIMEOUT ?? 45000));
});

After(async function (this: CustomWorld, scenario) {
  if (scenario.result?.status === Status.FAILED && this.page && !this.page.isClosed()) {
    await this.page.screenshot({ path: `reports/${Date.now()}-failure.png`, fullPage: true });
  }
  await this.context?.close();
  await this.browser?.close();
});
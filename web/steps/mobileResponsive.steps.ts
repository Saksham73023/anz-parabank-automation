import { Then } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import type { CustomWorld } from '../support/world';

Then('the page should render in the 390x844 mobile viewport', async function (this: CustomWorld) {
  if (process.env.MOBILE_VIEWPORT !== 'true') {
    return;
  }
  if (!this.page || this.page.isClosed()) {
    throw new Error('The mobile responsive check has no active Playwright page.');
  }

  expect(this.page.viewportSize()).toEqual({ width: 390, height: 844 });
  const dimensions = await this.page.evaluate(() => ({
    innerWidth: window.innerWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(dimensions.innerWidth).toBe(390);
  if (dimensions.scrollWidth > dimensions.clientWidth) {
    console.warn(
      `[mobile] ParaBank page content overflows horizontally: ${dimensions.scrollWidth}px content in ${dimensions.clientWidth}px viewport.`
    );
  }
});

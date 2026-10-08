import { Given, Then, When, World } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import type { Page } from 'playwright';
import { AccountsOverviewPage } from '../pages/accountOverview.page';
import { LoginPage } from '../pages/login.page';
import { TransferFundsPage } from '../pages/transferFunds.page';
import { AccessibilityReport, scanPageAccessibility } from '../support/axeHelper';
import { getLoginCredentials } from '../support/testDataHelper';
import { CustomWorld } from '../support/world';

const reportsByWorld = new WeakMap<World, Map<string, AccessibilityReport>>();

function currentPage(world: CustomWorld): Page {
  if (!world.page || world.page.isClosed()) {
    throw new Error('The accessibility scenario has no active Playwright page.');
  }
  return world.page;
}

function configuredCredentials(): { username: string; password: string } {
  const fixture = getLoginCredentials();
  const username = process.env.PARABANK_USERNAME?.trim() || fixture.username;
  const password = process.env.PARABANK_PASSWORD || fixture.password;

  if (!username || !password) {
    throw new Error('Valid ParaBank login credentials are not configured for the accessibility scenario.');
  }

  return { username, password };
}

async function logIn(world: CustomWorld): Promise<void> {
  const loginPage = new LoginPage(currentPage(world));
  const { username, password } = configuredCredentials();
  await loginPage.open();
  await loginPage.login(username, password);
  await loginPage.verifyLoginSucceeded();
}

Given('I am logged in to ParaBank', async function (this: CustomWorld) {
  await logIn(this);
  await new AccountsOverviewPage(currentPage(this)).verifyPageDisplayed();
});

When('I open the Transfer Funds page', async function (this: CustomWorld) {
  await new TransferFundsPage(currentPage(this)).open();
});

When('I scan the current page for accessibility as {string}', async function (this: CustomWorld, pageName: string) {
  const report = await scanPageAccessibility(currentPage(this), pageName);
  const reports = reportsByWorld.get(this) ?? new Map<string, AccessibilityReport>();
  reports.set(pageName, report);
  reportsByWorld.set(this, reports);
  await this.attach(JSON.stringify(report, null, 2), 'application/json');
});

Then('an accessibility report for {string} should be generated', function (this: CustomWorld, pageName: string) {
  const report = reportsByWorld.get(this)?.get(pageName);
  expect(report, `No accessibility report was generated for ${pageName}.`).toBeDefined();
  expect(report?.url, `The accessibility report for ${pageName} has no page URL.`).toBeTruthy();
  expect(report?.violationCount).toBe(report?.violations.length);
});

Then('accessibility violations should be reported for analysis', function (this: CustomWorld) {
  const reports = reportsByWorld.get(this);
  const scenarioReports = [...(reports?.values() ?? [])];

  // This POC reports violations for analysis; detected application defects do not block test execution.
  for (const report of scenarioReports) {
    console.info(`[a11y] ${report.page}: ${report.violationCount} violation(s) reported; findings are non-blocking.`);
  }
});

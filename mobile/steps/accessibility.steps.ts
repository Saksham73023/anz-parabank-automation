import { Given, Then, When, World } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import { scanPageAccessibility } from '../utils/axeHelper';
import { mobileSessionFor } from '../pages/mobileHelper';
import { MobileLoginPage } from '../pages/loginPage';
import { MobileTransferFundsPage } from '../pages/transferFundsPage';

interface AccessibilityIssue {
  page: string;
  impact?: string | null;
  id: string;
  help: string;
}

const issuesByWorld = new WeakMap<World, AccessibilityIssue[]>();

function credentials(): { username: string; password: string } {
  const username = process.env.PARABANK_USERNAME?.trim();
  const password = process.env.PARABANK_PASSWORD;
  if (!username || !password) {
    throw new Error('Set PARABANK_USERNAME and PARABANK_PASSWORD to run accessibility scenarios.');
  }
  return { username, password };
}

async function scanCurrentPage(world: World, pageName: string): Promise<void> {
  const { page } = mobileSessionFor(world);
  const report = await scanPageAccessibility(page, pageName);
  const issues = issuesByWorld.get(world) ?? [];
  issues.push(...report.violations.map(({ impact, id, help }) => ({ page: pageName, impact, id, help })));
  issuesByWorld.set(world, issues);

  console.log(`[a11y] ${pageName}: ${report.violationCount} violation(s)`);
  for (const violation of report.violations) {
    console.log(`[a11y] ${violation.impact ?? 'unknown'} ${violation.id}: ${violation.help}`);
    for (const node of violation.nodes) {
      console.log(`[a11y] target=${node.target.join(', ')} ${node.failureSummary ?? ''}`);
    }
  }
  await world.attach(JSON.stringify(report, null, 2), 'application/json');
}

Given('accessibility user opens the ParaBank login page', async function (this: World) {
  await new MobileLoginPage(mobileSessionFor(this).page).open();
});

When('accessibility scan runs on the login page', async function (this: World) {
  await scanCurrentPage(this, 'Login Page');
});

When('accessibility user logs in', async function (this: World) {
  const { username, password } = credentials();
  const loginPage = new MobileLoginPage(mobileSessionFor(this).page);
  await loginPage.login(username, password);
  await loginPage.verifyLoggedIn();
});

Then('accessibility scan runs on the account overview page', async function (this: World) {
  await scanCurrentPage(this, 'Account Overview');
});

When('accessibility user opens the transfer funds page', async function (this: World) {
  await new MobileTransferFundsPage(mobileSessionFor(this).page).open();
});

Then('accessibility scan runs on the transfer funds page', async function (this: World) {
  await scanCurrentPage(this, 'Transfer Funds');
});

Then('serious and critical accessibility violations should not be present', function (this: World) {
  const releaseBlockingViolations = (issuesByWorld.get(this) ?? []).filter(
    (issue) => issue.impact === 'critical' || issue.impact === 'serious'
  );
  expect(
    releaseBlockingViolations,
    `Accessibility scans found serious or critical violations: ${JSON.stringify(releaseBlockingViolations)}. Full axe details are attached to the report.`
  ).toHaveLength(0);
});

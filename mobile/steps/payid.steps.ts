import { Given, When, Then, World } from '@cucumber/cucumber';
import { MockPaymentOutcome, MockPaymentPage } from '../pages/mockPaymentPage';
import { mobileSessionFor } from '../pages/mobileHelper';

function mockPaymentPage(world: World): MockPaymentPage {
  return new MockPaymentPage(mobileSessionFor(world).page);
}

function outcome(value: string): MockPaymentOutcome {
  if (value === 'SETTLED' || value === 'FAILED' || value === 'TIMEOUT') return value;
  throw new Error(`Unsupported mocked NPP payment outcome: ${value}`);
}

Given('NPP mock payment is configured to return {string}', async function (this: World, value: string) {
  await mockPaymentPage(this).open(outcome(value));
});

When('user submits a PayID payment', async function (this: World) {
  await mockPaymentPage(this).submitPayment();
});

Then('PayID payment UI displays the {string} outcome', async function (this: World, value: string) {
  await mockPaymentPage(this).verifyOutcome(outcome(value));
});

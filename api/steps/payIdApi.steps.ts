import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import {
  closePayIdMockServer,
  payIdHttpStatus,
  startPayIdMockServer,
  type PayIdFlow,
  type PayIdOutcome,
  type PayIdSimulation
} from '../support/payIdMock';
import type { ApiWorld } from '../support/world';

interface PayIdApiWorld extends ApiWorld {
  payIdMockOutcome?: PayIdOutcome;
  payIdSimulation?: PayIdSimulation;
  payIdHttpStatus?: number;
  payIdRequestReceived?: boolean;
}

Given('the PayID API mock is configured to return {string}', function (this: PayIdApiWorld, value: string) {
  this.payIdMockOutcome = parsePayIdOutcome(value);
});

When('the client submits a PayID payment request', async function (this: PayIdApiWorld) {
  const outcome = this.payIdMockOutcome;
  if (!outcome) {
    throw new Error('PayID API outcome must be configured before submitting a payment.');
  }

  const mockServer = await startPayIdMockServer(outcome);
  try {
    const response = await fetch(mockServer.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ payId: 'alex@example.com', amount: 25.5, currency: 'AUD' })
    });
    const payload: unknown = await response.json();
    if (!isPayIdSimulation(payload)) {
      throw new Error('The PayID mock API returned an invalid simulation response.');
    }

    this.payIdHttpStatus = response.status;
    this.payIdSimulation = payload;
    this.payIdRequestReceived = true;
  } finally {
    await closePayIdMockServer(mockServer.server);
  }
});

Then('the PayID API response should show a successful payment', function (this: PayIdApiWorld) {
  verifyPayIdFlow(this, 'SETTLED', 'SUCCESS');
});

Then('the PayID API response should show a failed payment', function (this: PayIdApiWorld) {
  verifyPayIdFlow(this, 'FAILED', 'FAILURE');
});

Then('the PayID API response should show a timed-out payment', function (this: PayIdApiWorld) {
  verifyPayIdFlow(this, 'TIMEOUT', 'TIMEOUT');
});

function parsePayIdOutcome(value: string): PayIdOutcome {
  if (value === 'SETTLED' || value === 'FAILED' || value === 'TIMEOUT') {
    return value;
  }
  throw new Error(`Unsupported mocked PayID API outcome: ${value}`);
}

function isPayIdSimulation(value: unknown): value is PayIdSimulation {
  if (typeof value !== 'object' || value === null || !('response' in value) || !('flow' in value) || !('message' in value)) {
    return false;
  }
  const simulation = value as Record<string, unknown>;
  const paymentResponse = simulation.response;
  return typeof paymentResponse === 'object' && paymentResponse !== null && 'status' in paymentResponse &&
    (paymentResponse.status === 'SETTLED' || paymentResponse.status === 'FAILED' || paymentResponse.status === 'TIMEOUT') &&
    (simulation.flow === 'SUCCESS' || simulation.flow === 'FAILURE' || simulation.flow === 'TIMEOUT') &&
    typeof simulation.message === 'string';
}

function verifyPayIdFlow(
  world: PayIdApiWorld,
  expectedOutcome: PayIdOutcome,
  expectedFlow: PayIdFlow
): void {
  const simulation = world.payIdSimulation;
  if (!simulation) {
    throw new Error('PayID payment must be submitted before its API response can be verified.');
  }

  expect(world.payIdRequestReceived).toBe(true);
  expect(world.payIdHttpStatus).toBe(payIdHttpStatus(expectedOutcome));
  expect(simulation.response.status).toBe(expectedOutcome);
  expect(simulation.flow).toBe(expectedFlow);
  expect(simulation.message).toBe(PAY_ID_FLOW_MESSAGES[expectedOutcome]);
}

const PAY_ID_FLOW_MESSAGES: Record<PayIdOutcome, string> = {
  SETTLED: 'Payment settled successfully',
  FAILED: 'Payment failed. Please try again.',
  TIMEOUT: 'Payment timed out. Check your account before retrying.'
};

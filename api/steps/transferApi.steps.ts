import { Then, When, World } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import type { APIResponse } from 'playwright';
import { apiClientFor, getApiTestData } from '../services/apiHelpers';
import { TransferApi } from '../services/transferApi';

interface TransferApiWorld extends World {
  transferApiResponse?: APIResponse;
}

When('I submit the configured account transfer', async function (this: TransferApiWorld) {
  const { transfer } = getApiTestData();
  if (!transfer.sourceAccountId || !transfer.destinationAccountId) {
    throw new Error('Configure API_TRANSFER_SOURCE_ACCOUNT_ID and API_TRANSFER_DESTINATION_ACCOUNT_ID or update api/apiTestData.json.');
  }
  this.transferApiResponse = await new TransferApi(apiClientFor(this)).transfer(transfer);
});

Then('the transfer API response status should be {int}', function (this: TransferApiWorld, status: number) {
  expect(this.transferApiResponse, 'The transfer API request was not sent.').toBeDefined();
  expect(this.transferApiResponse!.status()).toBe(status);
});
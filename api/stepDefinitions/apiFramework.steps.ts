import { Then, When, World } from '@cucumber/cucumber';
import type { APIResponse } from 'playwright';
import { ApiAssertions } from '../assertions/apiAssertions';
import { apiClientFor, getApiTestData } from '../services/apiHelpers';
import { readJsonResponse } from '../utils/apiUtils';
import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

interface ApiFrameworkWorld extends World {
  frameworkApiResponse?: APIResponse;
  requestedAccountId?: string;
}

When('I request the configured account using a path parameter', async function (this: ApiFrameworkWorld) {
  const accountId = getApiTestData().accountId.trim();
  if (!accountId) throw new Error('Configure API_ACCOUNT_ID or api/testData/apiTestData.json before running this scenario.');

  this.requestedAccountId = accountId;
  this.frameworkApiResponse = await apiClientFor(this).get('/accounts/{accountId}', {
    pathParams: { accountId }
  });
});

Then('the API framework response status should be {int}', function (this: ApiFrameworkWorld, status: number) {
  if (!this.frameworkApiResponse) throw new Error('The API request was not sent.');
  ApiAssertions.assertStatus(this.frameworkApiResponse, status);
});

Then('the API framework response should match schema {string}', async function (this: ApiFrameworkWorld, schemaFile: string) {
  if (!this.frameworkApiResponse) throw new Error('The API request was not sent.');

  const safeFileName = basename(schemaFile);
  if (safeFileName !== schemaFile || !safeFileName.endsWith('.schema.json')) {
    throw new Error('Schema steps must use a .schema.json file name from api/schemas.');
  }
  const schemaPath = join(__dirname, '..', 'schemas', safeFileName);
  const schema: unknown = JSON.parse(readFileSync(schemaPath, 'utf8'));
  await ApiAssertions.assertSchema(this.frameworkApiResponse, schema as object);

  const account = await readJsonResponse<{ id?: string | number; accountId?: string | number }>(this.frameworkApiResponse);
  const actualId = account.id ?? account.accountId;
  if (String(actualId) !== this.requestedAccountId) {
    throw new Error(`Expected account ${this.requestedAccountId}, received ${String(actualId)}.`);
  }
});
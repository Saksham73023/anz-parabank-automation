import { Then, When } from '@cucumber/cucumber';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect } from 'playwright/test';
import { ApiAssertions } from '../utils/apiAssertions';
import { apiClientFor, getApiTestData } from '../services/apiHelpers';
import type { ApiWorld } from '../support/world';
import { readJsonResponse } from '../utils/apiUtils';
import { basename } from 'node:path';

When('api client is initialized', function (this: ApiWorld) {
  apiClientFor(this);
});

Then('api context should be available', function (this: ApiWorld) {
  expect(apiClientFor(this)).toBeTruthy();
});

When('user sends an api request', async function (this: ApiWorld) {
  const customerId = getApiTestData().customerId;
  const path = `/customers/${customerId}`;
  this.frameworkRequestLog = { method: 'GET', path };
  console.info(`[API request] ${this.frameworkRequestLog.method} ${this.frameworkRequestLog.path}`);
  this.frameworkApiResponse = await apiClientFor(this).get(path);
});

Then('request details should be logged', function (this: ApiWorld) {
  expect(this.frameworkRequestLog).toEqual({
    method: 'GET',
    path: `/customers/${getApiTestData().customerId}`
  });
});

When('user receives response', async function (this: ApiWorld) {
  const customerId = getApiTestData().customerId;
  this.frameworkApiResponse = await apiClientFor(this).get(`/customers/${customerId}`);
  this.frameworkResponseLog = {
    status: this.frameworkApiResponse.status(),
    contentType: this.frameworkApiResponse.headers()['content-type'] ?? ''
  };
  console.info(`[API response] status=${this.frameworkResponseLog.status} content-type=${this.frameworkResponseLog.contentType}`);
});

Then('response details should be logged', function (this: ApiWorld) {
  expect(this.frameworkResponseLog).toBeTruthy();
  expect(this.frameworkResponseLog?.status).toBeGreaterThanOrEqual(200);
  expect(this.frameworkResponseLog?.status).toBeLessThan(300);
  expect(this.frameworkResponseLog?.contentType).toContain('application/json');
});

When('test execution is completed', function (this: ApiWorld) {
  this.frameworkExecutionCompleted = true;
});

Then('report should be generated successfully', function (this: ApiWorld) {
  expect(this.frameworkExecutionCompleted).toBe(true);
  const reportPath = join(process.cwd(), 'reports', 'cucumber-report.html');
  if (!existsSync(reportPath)) {
    throw new Error(`Cucumber HTML report was not generated at ${reportPath}.`);
  }
  if (statSync(reportPath).size === 0) {
    throw new Error(`Cucumber HTML report is empty: ${reportPath}.`);
  }
});

When('I request the configured account using a path parameter', async function (this: ApiWorld) {
  const accountId = getApiTestData().accountId.trim();
  if (!accountId) throw new Error('Configure API_ACCOUNT_ID or api/testData/apiTestData.json before running this scenario.');

  this.requestedAccountId = accountId;
  this.frameworkApiResponse = await apiClientFor(this).get('/accounts/{accountId}', {
    pathParams: { accountId }
  });
});

Then('the API framework response status should be {int}', function (this: ApiWorld, status: number) {
  if (!this.frameworkApiResponse) throw new Error('The API request was not sent.');
  ApiAssertions.assertStatus(this.frameworkApiResponse, status);
});

Then('the API framework response should match schema {string}', async function (this: ApiWorld, schemaFile: string) {
  if (!this.frameworkApiResponse) throw new Error('The API request was not sent.');

  const safeFileName = basename(schemaFile);
  if (safeFileName !== schemaFile || !safeFileName.endsWith('.schema.json')) {
    throw new Error('Schema steps must use a .schema.json file name from api/payloads/schemas.');
  }
  const schemaPath = join(__dirname, '..', 'payloads', 'schemas', safeFileName);
  const schema: unknown = JSON.parse(readFileSync(schemaPath, 'utf8'));
  await ApiAssertions.assertSchema(this.frameworkApiResponse, schema as object);

  const account = await readJsonResponse<{ id?: string | number; accountId?: string | number }>(this.frameworkApiResponse);
  const actualId = account.id ?? account.accountId;
  if (String(actualId) !== this.requestedAccountId) {
    throw new Error(`Expected account ${this.requestedAccountId}, received ${String(actualId)}.`);
  }
});
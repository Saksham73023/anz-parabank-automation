/** Shared API test-data loading, scenario-client access, and SOAP endpoint resolution helpers. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ApiWorld } from '../support/world';

/** Fixture shape for customer/account identifiers and transfer/bill-payment requests. */
export interface ApiTestData {
  customerId: string;
  accountId: string;
  transfer: {
    sourceAccountId: string;
    destinationAccountId: string;
    amount: number;
  };
  billPay: {
    accountId: string;
    payeeName: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    phoneNumber: string;
    amount: number;
    memo: string;
  };
}

/**
 * Loads API fixture data and overlays supported environment-variable values.
 * Validates the configured transfer amount before returning the scenario data.
 * @returns Resolved customer, account, transfer, and bill-payment test data.
 */
export function getApiTestData(): ApiTestData {
  const dataPath = join(__dirname, '..', 'testData', 'apiTestData.json');
  const data = JSON.parse(readFileSync(dataPath, 'utf8').replace(/^\uFEFF/, '')) as ApiTestData;
  const amount = Number(process.env.API_TRANSFER_AMOUNT ?? data.transfer.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new RangeError('API_TRANSFER_AMOUNT must be a finite number greater than zero.');
  }

  return {
    customerId: process.env.API_CUSTOMER_ID?.trim() || data.customerId,
    accountId: process.env.API_ACCOUNT_ID?.trim() || data.accountId,
    transfer: {
      sourceAccountId: process.env.API_TRANSFER_SOURCE_ACCOUNT_ID?.trim() || data.transfer.sourceAccountId,
      destinationAccountId: process.env.API_TRANSFER_DESTINATION_ACCOUNT_ID?.trim() || data.transfer.destinationAccountId,
      amount
    },
    billPay: {
      accountId: process.env.API_BILLPAY_ACCOUNT_ID?.trim() || data.billPay.accountId,
      payeeName: process.env.API_BILLPAY_PAYEE_NAME?.trim() || data.billPay.payeeName,
      address: process.env.API_BILLPAY_ADDRESS?.trim() || data.billPay.address,
      city: process.env.API_BILLPAY_CITY?.trim() || data.billPay.city,
      state: process.env.API_BILLPAY_STATE?.trim() || data.billPay.state,
      zipCode: process.env.API_BILLPAY_ZIP_CODE?.trim() || data.billPay.zipCode,
      phoneNumber: process.env.API_BILLPAY_PHONE?.trim() || data.billPay.phoneNumber,
      amount: Number(process.env.API_BILLPAY_AMOUNT ?? data.billPay.amount),
      memo: process.env.API_BILLPAY_MEMO?.trim() || data.billPay.memo
    }
  };
}

/** Returns the API client owned by the current Cucumber scenario. */
export function apiClientFor(world: ApiWorld) {
  if (!world.apiClient) {
    throw new Error('API client is not initialized for this scenario.');
  }
  return world.apiClient;
}

/**
 * Resolves the ParaBank SOAP endpoint from API_SOAP_URL or the configured REST base URL.
 * Validates explicit URLs and derives the SOAP path only from a recognized service base path.
 * @returns An absolute HTTP or HTTPS SOAP service URL.
 */
export function getSoapEndpoint(): string {
  const configuredEndpoint = process.env.API_SOAP_URL?.trim();
  if (configuredEndpoint) {
    try {
      const endpoint = new URL(configuredEndpoint);
      if (!['http:', 'https:'].includes(endpoint.protocol)) {
        throw new Error('unsupported protocol');
      }
      return endpoint.toString();
    } catch {
      throw new Error('API_SOAP_URL must be a valid absolute HTTP or HTTPS URL.');
    }
  }

  const apiBaseUrl = process.env.API_BASE_URL?.trim() || 'https://parabank.parasoft.com/parabank/services/bank';
  const endpoint = new URL(apiBaseUrl);
  if (!/\/services\/bank\/?$/.test(endpoint.pathname)) {
    throw new Error('Set API_SOAP_URL when API_BASE_URL does not end in /services/bank.');
  }
  endpoint.pathname = endpoint.pathname.replace(/\/bank\/?$/, '/ParaBank');
  endpoint.search = '';
  return endpoint.toString();
}

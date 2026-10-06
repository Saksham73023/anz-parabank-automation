import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ApiWorld } from '../support/world';

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

export function apiClientFor(world: ApiWorld) {
  if (!world.apiClient) {
    throw new Error('API client is not initialized for this scenario.');
  }
  return world.apiClient;
}

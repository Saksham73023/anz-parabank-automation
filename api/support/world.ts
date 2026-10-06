import { IWorldOptions, World, setWorldConstructor } from '@cucumber/cucumber';
import type { APIResponse } from 'playwright';
import type { ApiClient } from '../utils/apiClient';

export class ApiWorld extends World {
  apiClient?: ApiClient;
  customerId = '12212';
  invalidCustomerIdRequested = false;
  accountId = '';
  invalidAccountIdRequested = false;
  sourceAccountId = '';
  destinationAccountId = '';
  transferAmount = 1;
  sourceBalanceBeforeTransfer?: number;
  destinationBalanceBeforeTransfer?: number;
  requestBody?: unknown;
  lastResponse?: APIResponse;
  accountApiResponse?: APIResponse;
  transferApiResponse?: APIResponse;
  frameworkApiResponse?: APIResponse;
  frameworkRequestLog?: { method: string; path: string };
  frameworkResponseLog?: { status: number; contentType: string };
  frameworkExecutionCompleted = false;
  requestedAccountId?: string;
  createdCustomerId?: string;
  createdAccountId?: string;
  responseBody?: unknown;

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(ApiWorld);

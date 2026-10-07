import { IWorldOptions, World, setWorldConstructor } from '@cucumber/cucumber';
import type { APIResponse } from 'playwright';
import type { ApiClient } from '../utils/apiClient';

/** Scenario-scoped state shared by API step definitions for one Cucumber scenario. */
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
  destinationBalanceAfterTransfer?: number;
  lastResponse?: APIResponse;
  soapParity?: {
    operation: string;
    rest: Record<string, unknown>[];
    soap: Record<string, unknown>[];
  };
  e2eResponses: APIResponse[] = [];
  e2eOpeningBalance?: number;
  e2eDestinationOpeningBalance?: number;
  e2eSeedAmount?: number;
  e2eInitialTransactionCount?: number;
  e2eInitialTransactionIds?: string[];

  /** Initializes the Cucumber world while preserving the supplied scenario options. */
  constructor(options: IWorldOptions) {
    super(options);
  }
}

/** Registers ApiWorld as the Cucumber scenario state constructor for the API profile. */
setWorldConstructor(ApiWorld);

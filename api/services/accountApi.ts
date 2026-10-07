import type { APIResponse } from 'playwright';
import type { ApiClient } from '../utils/apiClient';

/** Account categories accepted by the ParaBank account-creation endpoint. */
export type AccountType = 'CHECKING' | 'SAVINGS';

/** Provides validated access to ParaBank account, customer-account, and transaction endpoints. */
export class AccountApi {
  /** Creates an account service bound to the scenario-scoped API client. */
  constructor(private readonly client: ApiClient) {}

  /**
   * Retrieves one account.
   * @param accountId Account identifier, validated and URL-encoded before use.
   * @param expectedStatus Optional accepted HTTP status or status list.
   * @returns The raw Playwright response for downstream assertions.
   */
  getAccount(accountId: string, expectedStatus?: number | number[]): Promise<APIResponse> {
    return this.client.get(`/accounts/${this.requiredId(accountId, 'accountId')}`, { expectedStatus });
  }

  /**
   * Lists the accounts belonging to a customer.
   * @param customerId Customer identifier used in the request path.
   * @returns The API response containing the customer's accounts.
   */
  getCustomerAccounts(customerId: string): Promise<APIResponse> {
    return this.client.get(`/customers/${this.requiredId(customerId, 'customerId')}/accounts`);
  }

  /**
   * Retrieves transaction history for an account.
   * @param accountId Account identifier used in the request path.
   * @param expectedStatus Optional accepted HTTP status or status list.
   * @returns The raw transaction-history response.
   */
  getAccountTransactions(accountId: string, expectedStatus?: number | number[]): Promise<APIResponse> {
    return this.client.get(`/accounts/${this.requiredId(accountId, 'accountId')}/transactions`, { expectedStatus });
  }

  /**
   * Opens a checking or savings account using an existing funding account.
   * @param customerId Owner of the new account.
   * @param accountType Account category translated to ParaBank's numeric request value.
   * @param fromAccountId Existing account used to fund the new account.
   * @returns The account-creation response.
   */
  createAccount(customerId: string, accountType: AccountType, fromAccountId: string): Promise<APIResponse> {
    return this.client.post('/createAccount', {
      params: {
        customerId: this.requiredId(customerId, 'customerId'),
        newAccountType: accountType === 'CHECKING' ? 0 : 1,
        fromAccountId: this.requiredId(fromAccountId, 'fromAccountId')
      }
    });
  }

  /** Rejects blank identifiers and encodes accepted IDs for safe URL path use. */
  private requiredId(value: string, name: string): string {
    const id = value.trim();
    if (!id) throw new Error(`${name} must be configured before calling the account API.`);
    return encodeURIComponent(id);
  }
}
import type { APIResponse } from 'playwright';
import type { ApiClient } from '../utils/apiClient';

export type AccountType = 'CHECKING' | 'SAVINGS';

export class AccountApi {
  constructor(private readonly client: ApiClient) {}

  getAccount(accountId: string, expectedStatus?: number | number[]): Promise<APIResponse> {
    return this.client.get(`/accounts/${this.requiredId(accountId, 'accountId')}`, { expectedStatus });
  }

  getCustomerAccounts(customerId: string): Promise<APIResponse> {
    return this.client.get(`/customers/${this.requiredId(customerId, 'customerId')}/accounts`);
  }

  getAccountTransactions(accountId: string, expectedStatus?: number | number[]): Promise<APIResponse> {
    return this.client.get(`/accounts/${this.requiredId(accountId, 'accountId')}/transactions`, { expectedStatus });
  }

  createAccount(customerId: string, accountType: AccountType, fromAccountId: string): Promise<APIResponse> {
    return this.client.post('/createAccount', {
      params: {
        customerId: this.requiredId(customerId, 'customerId'),
        newAccountType: accountType === 'CHECKING' ? 0 : 1,
        fromAccountId: this.requiredId(fromAccountId, 'fromAccountId')
      }
    });
  }

  updateAccount(accountId: string, data: Record<string, unknown>): Promise<APIResponse> {
    return this.client.put(`/accounts/${this.requiredId(accountId, 'accountId')}`, { data });
  }

  deleteAccount(accountId: string): Promise<APIResponse> {
    return this.client.delete(`/accounts/${this.requiredId(accountId, 'accountId')}`);
  }

  private requiredId(value: string, name: string): string {
    const id = value.trim();
    if (!id) throw new Error(`${name} must be configured before calling the account API.`);
    return encodeURIComponent(id);
  }
}
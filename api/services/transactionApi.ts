import type { APIResponse } from 'playwright';
import type { ApiClient } from '../utils/apiClient';

export class TransactionApi {
  constructor(private readonly client: ApiClient) {}

  getAccountTransactions(accountId: string, expectedStatus?: number | number[]): Promise<APIResponse> {
    const id = this.requiredAccountId(accountId);
    return this.client.get(`/accounts/${id}/transactions`, { expectedStatus });
  }

  seedWithDeposit(accountId: string, amount: number): Promise<APIResponse> {
    const id = this.requiredAccountId(accountId);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new RangeError('Transaction seed amount must be a finite number greater than zero.');
    }
    return this.client.post('/deposit', {
      params: { accountId: id, amount },
      expectedStatus: [200, 201, 202]
    });
  }

  private requiredAccountId(accountId: string): string {
    const id = accountId.trim();
    if (!id) {
      throw new Error('Account ID is required to access account transactions.');
    }
    return encodeURIComponent(id);
  }
}

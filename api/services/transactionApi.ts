import type { APIResponse } from 'playwright';
import type { ApiClient } from '../utils/apiClient';

/** Provides account transaction-history reads and supported deposit-based transaction seeding. */
export class TransactionApi {
  /** Binds transaction operations to the current scenario's API client. */
  constructor(private readonly client: ApiClient) {}

  /**
   * Retrieves transactions for an account.
   * @param accountId Account identifier; blank values are rejected and encoded.
   * @param expectedStatus Optional accepted HTTP status or status list.
   * @returns The transaction-history response.
   */
  getAccountTransactions(accountId: string, expectedStatus?: number | number[]): Promise<APIResponse> {
    const id = this.requiredAccountId(accountId);
    return this.client.get(`/accounts/${id}/transactions`, { expectedStatus });
  }

  /**
   * Seeds transaction history using ParaBank's supported deposit action.
   * @param accountId Account receiving the deposit.
   * @param amount Finite positive deposit amount.
   * @returns The deposit response.
   */
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

  /** Rejects a blank account ID and URL-encodes the accepted value. */
  private requiredAccountId(accountId: string): string {
    const id = accountId.trim();
    if (!id) {
      throw new Error('Account ID is required to access account transactions.');
    }
    return encodeURIComponent(id);
  }
}

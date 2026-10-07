import type { APIResponse } from 'playwright';
import type { ApiClient } from '../utils/apiClient';

/** Source, destination, and amount required by the ParaBank transfer action. */
export interface TransferRequest {
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
}

/** Sends ParaBank transfer actions after validating account IDs and positive amounts. */
export class TransferApi {
  /** Binds transfer operations to the current scenario's API client. */
  constructor(private readonly client: ApiClient) {}

  /**
   * Transfers funds between two distinct accounts.
   * @param request Source and destination IDs and the positive transfer amount.
   * @returns The transfer response for scenario assertions.
   */
  transfer(request: TransferRequest): Promise<APIResponse> {
    const sourceAccountId = request.sourceAccountId.trim();
    const destinationAccountId = request.destinationAccountId.trim();
    if (!sourceAccountId || !destinationAccountId) {
      throw new Error('Source and destination account IDs must both be configured.');
    }
    if (sourceAccountId === destinationAccountId) {
      throw new Error('A transfer requires different source and destination accounts.');
    }
    if (!Number.isFinite(request.amount) || request.amount <= 0) {
      throw new RangeError('Transfer amount must be a finite number greater than zero.');
    }

    return this.client.post('/transfer', {
      params: {
        fromAccountId: sourceAccountId,
        toAccountId: destinationAccountId,
        amount: request.amount
      }
    });
  }
}
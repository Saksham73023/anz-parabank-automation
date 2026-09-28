import type { APIResponse } from 'playwright';
import type { ApiClient } from '../apiClient';

export interface TransferRequest {
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
}

export class TransferApi {
  constructor(private readonly client: ApiClient) {}

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
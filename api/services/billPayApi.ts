import type { APIResponse } from 'playwright';
import type { ApiClient } from '../utils/apiClient';

export interface BillPayRequest {
  accountId: string;
  payeeName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phoneNumber: string;
  amount: number;
}

export class BillPayApi {
  constructor(private readonly client: ApiClient) {}

  payBill(request: BillPayRequest): Promise<APIResponse> {
    const accountId = request.accountId.trim();
    const numericAccountId = Number(accountId);
    if (!Number.isSafeInteger(numericAccountId) || numericAccountId <= 0) {
      throw new Error('A valid numeric account ID is required to pay a bill.');
    }
    if (!Number.isFinite(request.amount) || request.amount <= 0) {
      throw new RangeError('Payment amount must be a finite number greater than zero.');
    }

    return this.client.post('/billpay', {
      params: {
        accountId,
        amount: request.amount
      },
      data: {
        name: request.payeeName,
        address: {
          street: request.address,
          city: request.city,
          state: request.state,
          zipCode: request.zipCode
        },
        phoneNumber: request.phoneNumber,
        accountNumber: numericAccountId
      },
      expectedStatus: [200, 201, 202]
    });
  }
}

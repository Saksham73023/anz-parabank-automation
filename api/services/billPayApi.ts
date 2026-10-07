// Provides bill payment API operations, including request validation,
// payee information handling, and bill payment submission with
// account and amount verification before execution.
import type { APIResponse } from 'playwright';
import type { ApiClient } from '../utils/apiClient';

/** Account and payee fields required to submit a ParaBank bill-payment action. */
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

/** Sends bill payments using ParaBank's action endpoint with client-side input validation. */
export class BillPayApi {
  /** Binds bill-payment operations to the current scenario's API client. */
  constructor(private readonly client: ApiClient) {}

  /**
   * Submits a bill payment after checking the account ID and amount.
   * @param request Funding account, payee details, and positive payment amount.
   * @returns Response for an accepted successful bill-payment status.
   */
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

import type { APIResponse } from 'playwright';
import type { ApiClient } from '../utils/apiClient';

export interface CustomerAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

export class CustomerApi {
  constructor(private readonly client: ApiClient) {}

  getCustomer(customerId: string, expectedStatus?: number | number[]): Promise<APIResponse> {
    const id = customerId.trim();
    if (!id) {
      throw new Error('Customer ID is required to fetch customer details.');
    }
    return this.client.get(`/customers/${encodeURIComponent(id)}`, { expectedStatus });
  }

  getCustomerAccounts(customerId: string): Promise<APIResponse> {
    const id = customerId.trim();
    if (!id) {
      throw new Error('Customer ID is required to retrieve customer accounts.');
    }
    return this.client.get(`/customers/${encodeURIComponent(id)}/accounts`);
  }
}

// Provides customer-related API operations, including customer details retrieval
// and account lookup functionality with mandatory customer ID validation
// and safe URL encoding for API requests.
import type { APIResponse } from 'playwright';
import type { ApiClient } from '../utils/apiClient';

/** Postal address shape shared by customer and payee data contracts. */
export interface CustomerAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

/** Encapsulates the read-only customer details and customer-account API operations. */
export class CustomerApi {
  /** Binds customer operations to the current scenario's API client. */
  constructor(private readonly client: ApiClient) {}

  /**
   * Retrieves customer details, rejecting blank IDs before issuing the GET request.
   * @param customerId Customer identifier.
   * @param expectedStatus Optional allowed response status or status list.
   * @returns The customer response.
   */
  getCustomer(customerId: string, expectedStatus?: number | number[]): Promise<APIResponse> {
    const id = customerId.trim();
    if (!id) {
      throw new Error('Customer ID is required to fetch customer details.');
    }
    return this.client.get(`/customers/${encodeURIComponent(id)}`, { expectedStatus });
  }

  /**
   * Retrieves a customer's accounts, rejecting blank IDs before issuing the GET request.
   * @param customerId Customer identifier.
   * @returns The customer accounts response.
   */
  getCustomerAccounts(customerId: string): Promise<APIResponse> {
    const id = customerId.trim();
    if (!id) {
      throw new Error('Customer ID is required to retrieve customer accounts.');
    }
    return this.client.get(`/customers/${encodeURIComponent(id)}/accounts`);
  }
}

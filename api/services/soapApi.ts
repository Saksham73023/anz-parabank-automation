import type { APIResponse } from 'playwright';
import { getSoapEndpoint } from './apiHelpers';
import type { ApiClient } from '../utils/apiClient';

/** Supported ParaBank SOAP read operation names used for REST parity checks. */
export type SoapReadOperation = 'getCustomer' | 'getAccount' | 'getTransactions';

/** Provides the supported ParaBank SOAP reads used for REST response parity checks. */
export class SoapApi {
  /** Binds SOAP calls to the scenario's shared API client. */
  constructor(private readonly client: ApiClient) {}

  /** Retrieves customer details from the SOAP service. */
  getCustomer(customerId: string): Promise<APIResponse> {
    return this.invoke('getCustomer', 'customerId', customerId);
  }

  /** Retrieves an account record from the SOAP service. */
  getAccount(accountId: string): Promise<APIResponse> {
    return this.invoke('getAccount', 'accountId', accountId);
  }

  /** Retrieves account transaction history from the SOAP service. */
  getTransactions(accountId: string): Promise<APIResponse> {
    return this.invoke('getTransactions', 'accountId', accountId);
  }

  /**
   * Validates the numeric identifier, creates a SOAP envelope, and posts it to the SOAP endpoint.
   * @param operation Supported SOAP operation name.
   * @param parameterName XML element name expected by the operation.
   * @param value Customer or account identifier.
   * @returns Raw SOAP response for subsequent XML parsing.
   */
  private invoke(operation: SoapReadOperation, parameterName: string, value: string): Promise<APIResponse> {
    const id = value.trim();
    if (!/^\d+$/.test(id)) {
      throw new Error(`${parameterName} must be a numeric identifier for the ParaBank SOAP service.`);
    }

    const body = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">',
      '<soap:Body>',
      `<${operation} xmlns="http://service.parabank.parasoft.com/"><${parameterName}>${id}</${parameterName}></${operation}>`,
      '</soap:Body>',
      '</soap:Envelope>'
    ].join('');

    return this.client.post(getSoapEndpoint(), {
      data: body,
      headers: {
        Accept: 'text/xml',
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: '""'
      }
    });
  }
}

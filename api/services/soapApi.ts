import type { APIResponse } from 'playwright';
import { getSoapEndpoint } from './apiHelpers';
import type { ApiClient } from '../utils/apiClient';

export type SoapReadOperation = 'getCustomer' | 'getAccount' | 'getTransactions';

export class SoapApi {
  constructor(private readonly client: ApiClient) {}

  getCustomer(customerId: string): Promise<APIResponse> {
    return this.invoke('getCustomer', 'customerId', customerId);
  }

  getAccount(accountId: string): Promise<APIResponse> {
    return this.invoke('getAccount', 'accountId', accountId);
  }

  getTransactions(accountId: string): Promise<APIResponse> {
    return this.invoke('getTransactions', 'accountId', accountId);
  }

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

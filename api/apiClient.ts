import { request as playwrightRequest } from 'playwright';
import type { APIRequestContext, APIResponse } from 'playwright';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface ApiRequestOptions {
  params?: Record<string, string | number | boolean>;
  data?: unknown;
  headers?: Record<string, string>;
  expectedStatus?: number | number[];
}

const DEFAULT_API_BASE_URL = 'https://parabank.parasoft.com/parabank/services/bank';

export class ApiClient {
  private constructor(private readonly context: APIRequestContext) {}

  static async create(): Promise<ApiClient> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    const token = process.env.API_TOKEN?.trim();
    const cookie = process.env.API_COOKIE?.trim();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (cookie) headers.Cookie = cookie;

    const context = await playwrightRequest.newContext({
      baseURL: process.env.API_BASE_URL?.trim() || DEFAULT_API_BASE_URL,
      extraHTTPHeaders: headers,
      timeout: Number(process.env.API_TIMEOUT ?? 30000),
      ignoreHTTPSErrors: process.env.API_IGNORE_HTTPS_ERRORS === 'true'
    });
    return new ApiClient(context);
  }

  get(path: string, options: ApiRequestOptions = {}): Promise<APIResponse> {
    return this.send('GET', path, options);
  }

  post(path: string, options: ApiRequestOptions = {}): Promise<APIResponse> {
    return this.send('POST', path, options);
  }

  put(path: string, options: ApiRequestOptions = {}): Promise<APIResponse> {
    return this.send('PUT', path, options);
  }

  delete(path: string, options: ApiRequestOptions = {}): Promise<APIResponse> {
    return this.send('DELETE', path, options);
  }

  async dispose(): Promise<void> {
    await this.context.dispose();
  }

  private async send(method: HttpMethod, path: string, options: ApiRequestOptions): Promise<APIResponse> {
    const { expectedStatus, ...requestOptions } = options;
    const response = await this.context.fetch(path, {
      method,
      ...requestOptions,
      failOnStatusCode: false
    });
    const allowedStatuses = expectedStatus === undefined
      ? undefined
      : Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
    const statusIsValid = allowedStatuses
      ? allowedStatuses.includes(response.status())
      : response.status() >= 200 && response.status() < 300;

    if (!statusIsValid) {
      const body = (await response.text()).slice(0, 1000);
      const expectation = allowedStatuses?.join(' or ') ?? 'a 2xx status';
      throw new Error(`${method} ${path} returned ${response.status()}, expected ${expectation}.${body ? ` Response: ${body}` : ''}`);
    }

    return response;
  }
}
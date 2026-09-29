import { request as playwrightRequest } from 'playwright';
import type { APIRequestContext, APIResponse } from 'playwright';
import { getApiConfig } from './config/environmentConfig';
import { AuthenticationManager } from './services/authenticationManager';
import { RequestBuilder } from './utils/requestBuilder';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type ApiAuthentication =
  | { type: 'none' }
  | { type: 'bearer'; token: string }
  | { type: 'basic'; username: string; password: string };

export interface ApiRequestOptions {
  params?: Record<string, string | number | boolean>;
  queryParams?: Record<string, string | number | boolean>;
  pathParams?: Record<string, string | number>;
  data?: unknown;
  headers?: Record<string, string>;
  authentication?: ApiAuthentication;
  expectedStatus?: number | number[];
}

export class ApiClient {
  private constructor(private readonly context: APIRequestContext) {}

  static async create(): Promise<ApiClient> {
    const config = getApiConfig();
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(config.authentication.type === 'none' ? {} : AuthenticationManager.toHeaders(config.authentication))
    };
    if (config.cookie) headers.Cookie = config.cookie;

    const context = await playwrightRequest.newContext({
      baseURL: config.baseURL,
      extraHTTPHeaders: headers,
      timeout: config.timeout,
      ignoreHTTPSErrors: config.ignoreHTTPSErrors
    });
    return new ApiClient(context);
  }

  request(method: HttpMethod, path: string, options: ApiRequestOptions = {}): Promise<APIResponse> {
    return this.send(method, path, options);
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

  patch(path: string, options: ApiRequestOptions = {}): Promise<APIResponse> {
    return this.send('PATCH', path, options);
  }

  delete(path: string, options: ApiRequestOptions = {}): Promise<APIResponse> {
    return this.send('DELETE', path, options);
  }

  async dispose(): Promise<void> {
    await this.context.dispose();
  }

  private async send(method: HttpMethod, path: string, options: ApiRequestOptions): Promise<APIResponse> {
    const builtRequest = RequestBuilder.build(path, options);
    const requestHeaders = {
      ...builtRequest.headers,
      ...(options.authentication ? AuthenticationManager.toHeaders(options.authentication) : {})
    };
    const response = await this.context.fetch(builtRequest.path, {
      method,
      ...builtRequest.options,
      headers: requestHeaders,
      failOnStatusCode: false
    });
    const { expectedStatus } = options;
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
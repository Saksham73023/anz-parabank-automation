import { request as playwrightRequest } from 'playwright';
import type { APIRequestContext, APIResponse } from 'playwright';
import { getApiConfig } from '../support/environmentConfig';
import { AuthenticationManager } from '../services/authenticationManager';
import { RequestBuilder } from './requestBuilder';

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
  form?: Record<string, string | number | boolean>;
  rootPath?: boolean;
  maxRedirects?: number;
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
      baseURL: config.baseURL.endsWith('/') ? config.baseURL : `${config.baseURL}/`,
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
    const { expectedStatus } = options;
    const allowedStatuses = expectedStatus === undefined
      ? undefined
      : Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
    const maxRetries = 3;
    const maxRateLimitRetries = 2;
    let previousRateLimitDelay = 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const builtRequest = RequestBuilder.build(path, options);
      const requestPath = options.rootPath
        ? `/${builtRequest.path.replace(/^\/+/, '')}`
        : builtRequest.path.replace(/^\/+/, '');
      const requestHeaders = {
        ...builtRequest.headers,
        ...(options.authentication ? AuthenticationManager.toHeaders(options.authentication) : {})
      };
      const response = await this.context.fetch(requestPath, {
        method,
        ...builtRequest.options,
        headers: requestHeaders,
        failOnStatusCode: false
      });
      const statusIsValid = allowedStatuses
        ? allowedStatuses.includes(response.status())
        : response.status() >= 200 && response.status() < 300;

      if (statusIsValid) {
        return response;
      }

      const body = response.status() === 429 ? await response.text() : undefined;
      if (response.status() === 429 && attempt < maxRateLimitRetries) {
        const retryDelay = getRetryDelay(response.headers()['retry-after'], body);
        const delay = Math.max(retryDelay, previousRateLimitDelay * 2);
        previousRateLimitDelay = delay;
        await new Promise((resolve) => setTimeout(
          resolve,
          delay
        ));
        continue;
      }

      if (response.status() >= 500 && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
        continue;
      }

      const expectation = allowedStatuses?.join(' or ') ?? 'a 2xx status';
      const responseBody = (body ?? await response.text()).slice(0, 1000);
      throw new Error(`${method} ${path} returned ${response.status()}, expected ${expectation}.${responseBody ? ` Response: ${responseBody}` : ''}`);
    }

    throw new Error(`${method} ${path} failed after ${maxRetries + 1} attempts.`);
  }
}

function getRetryDelay(retryAfterHeader: string | undefined, body: string | undefined): number {
  if (retryAfterHeader) {
    const seconds = Number(retryAfterHeader);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds * 1000;
    }

    const retryAt = Date.parse(retryAfterHeader);
    if (Number.isFinite(retryAt)) {
      return Math.max(0, retryAt - Date.now());
    }
  }

  if (body) {
    try {
      const parsed: unknown = JSON.parse(body);
      if (typeof parsed === 'object' && parsed !== null && 'retry_after' in parsed) {
        const retryAfter = parsed.retry_after;
        if (typeof retryAfter === 'number' && Number.isFinite(retryAfter) && retryAfter >= 0) {
          return retryAfter * 1000;
        }
      }
    } catch {
      // The response body may not be JSON; use the fallback delay.
    }
  }

  return 1000;
}
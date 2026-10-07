import { request as playwrightRequest } from 'playwright';
import type { APIRequestContext, APIResponse } from 'playwright';
import { getApiConfig } from '../support/environmentConfig';
import { AuthenticationManager } from '../services/authenticationManager';
import { RequestBuilder } from './requestBuilder';

/** HTTP verbs supported by the common API request transport. */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
/** Authentication modes that can be applied globally or to an individual request. */
export type ApiAuthentication =
  | { type: 'none' }
  | { type: 'bearer'; token: string }
  | { type: 'basic'; username: string; password: string };

/** Optional path, query, payload, header, authentication, and response-status settings. */
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

/** Central Playwright API transport for request construction, status checks, and bounded retries. */
export class ApiClient {
  /** Keeps the Playwright context private so callers use the controlled client lifecycle. */
  private constructor(private readonly context: APIRequestContext) {}

  /**
   * Creates a request context from validated environment configuration.
   * Applies base headers, configured authentication/cookies, timeout, and TLS policy.
   * @returns A client ready for API and SOAP requests.
   */
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

  /** Sends an API request using the specified HTTP method. */
  request(method: HttpMethod, path: string, options: ApiRequestOptions = {}): Promise<APIResponse> {
    return this.send(method, path, options);
  }

  /** Sends a GET request through the common transport and status validation. */
  get(path: string, options: ApiRequestOptions = {}): Promise<APIResponse> {
    return this.send('GET', path, options);
  }

  /** Sends a POST request through the common transport and status validation. */
  post(path: string, options: ApiRequestOptions = {}): Promise<APIResponse> {
    return this.send('POST', path, options);
  }

  /** Sends a PUT request through the common transport and status validation. */
  put(path: string, options: ApiRequestOptions = {}): Promise<APIResponse> {
    return this.send('PUT', path, options);
  }

  /** Sends a PATCH request through the common transport and status validation. */
  patch(path: string, options: ApiRequestOptions = {}): Promise<APIResponse> {
    return this.send('PATCH', path, options);
  }

  /** Sends a DELETE request through the common transport and status validation. */
  delete(path: string, options: ApiRequestOptions = {}): Promise<APIResponse> {
    return this.send('DELETE', path, options);
  }

  /** Releases the Playwright request context and its associated resources. */
  async dispose(): Promise<void> {
    await this.context.dispose();
  }

  /**
   * Builds and sends a request, checks expected statuses, retries transient failures,
   * and reports a diagnostic error if the response remains unsuccessful.
   * @param method HTTP method to invoke.
   * @param path Relative or explicitly rooted request path.
   * @param options Request parameters, payload, headers, and accepted statuses.
   * @returns A response matching the configured status expectation.
   */
  private async send(method: HttpMethod, path: string, options: ApiRequestOptions): Promise<APIResponse> {
    const { expectedStatus } = options;
    const allowedStatuses = expectedStatus === undefined
      ? undefined
      : Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
    const maxServerRetries = 3;
    const maxRateLimitRetries = 5;
    const maxRateLimitWait = 300_000;
    let serverRetries = 0;
    let rateLimitRetries = 0;
    let rateLimitWaited = 0;

    while (true) {
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
      if (response.status() === 429) {
        if (rateLimitRetries >= maxRateLimitRetries) {
          const responseBody = (body ?? '').slice(0, 1000);
          throw new Error(
            `${method} ${path} remained rate-limited after ${rateLimitRetries} retries.` +
            `${responseBody ? ` Response: ${responseBody}` : ''}`
          );
        }
        const retryDelay = getRetryDelay(response.headers()['retry-after'], body);
        if (rateLimitWaited + retryDelay > maxRateLimitWait) {
          throw new Error(
            `${method} ${path} was rate-limited for at least ${Math.ceil(retryDelay / 1000)} seconds; ` +
            `the remaining API client retry budget is ${Math.floor((maxRateLimitWait - rateLimitWaited) / 1000)} seconds. Retry the scenario later.`
          );
        }
        rateLimitRetries++;
        rateLimitWaited += retryDelay;
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        continue;
      }

      if (response.status() >= 500 && serverRetries < maxServerRetries) {
        serverRetries++;
        await new Promise((resolve) => setTimeout(resolve, 250 * serverRetries));
        continue;
      }

      const expectation = allowedStatuses?.join(' or ') ?? 'a 2xx status';
      const responseBody = (body ?? await response.text()).slice(0, 1000);
      throw new Error(`${method} ${path} returned ${response.status()}, expected ${expectation}.${responseBody ? ` Response: ${responseBody}` : ''}`);
    }
  }
}

/** Resolves a rate-limit wait from Retry-After, a JSON retry_after field, or a fallback. */
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
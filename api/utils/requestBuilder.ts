import type { ApiRequestOptions } from './apiClient';

/** Resolved request path, Playwright options, and headers produced by RequestBuilder. */
export interface BuiltApiRequest {
  path: string;
  options: {
    maxRedirects?: number;
    params?: Record<string, string | number | boolean>;
    data?: unknown;
    form?: Record<string, string | number | boolean>;
    headers?: Record<string, string>;
  };
  headers: Record<string, string>;
}

/** Resolves request placeholders and query values into Playwright API request options. */
export class RequestBuilder {
  /**
   * Resolves path placeholders, encodes query values, and selects supported request options.
   * @param path Endpoint path, optionally containing named placeholders.
   * @param options Values and payload options for this request.
   * @returns The resolved path and request options.
   */
  static build(path: string, options: ApiRequestOptions = {}): BuiltApiRequest {
    let resolvedPath = path.replace(/\{([^}]+)\}/g, (_placeholder, parameter: string) => {
      const value = options.pathParams?.[parameter];
      if (value === undefined || String(value).trim() === '') {
        throw new Error(`Missing path parameter: ${parameter}`);
      }
      return encodeURIComponent(String(value));
    });

    if (/[{}]/.test(resolvedPath)) {
      throw new Error(`Unresolved path parameter in API path: ${resolvedPath}`);
    }

    const queryParams = { ...options.params, ...options.queryParams };
    if (Object.keys(queryParams).length > 0) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(queryParams)) {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      }

      const queryString = searchParams.toString();
      if (queryString) {
        resolvedPath = `${resolvedPath}${resolvedPath.includes('?') ? '&' : '?'}${queryString}`;
      }
    }

    return {
      path: resolvedPath,
      options: {
        ...(options.maxRedirects !== undefined ? { maxRedirects: options.maxRedirects } : {}),
        ...(options.data !== undefined ? { data: options.data } : {}),
        ...(options.form !== undefined ? { form: options.form } : {}),
        ...(options.headers ? { headers: options.headers } : {})
      },
      headers: options.headers ?? {}
    };
  }
}
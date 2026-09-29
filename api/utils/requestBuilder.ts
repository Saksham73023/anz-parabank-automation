import type { ApiRequestOptions } from '../apiClient';

export interface BuiltApiRequest {
  path: string;
  options: {
    params?: Record<string, string | number | boolean>;
    data?: unknown;
    headers?: Record<string, string>;
  };
  headers: Record<string, string>;
}

export class RequestBuilder {
  static build(path: string, options: ApiRequestOptions = {}): BuiltApiRequest {
    const resolvedPath = path.replace(/\{([^}]+)\}/g, (_placeholder, parameter: string) => {
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
    return {
      path: resolvedPath,
      options: {
        ...(Object.keys(queryParams).length ? { params: queryParams } : {}),
        ...(options.data !== undefined ? { data: options.data } : {}),
        ...(options.headers ? { headers: options.headers } : {})
      },
      headers: options.headers ?? {}
    };
  }
}
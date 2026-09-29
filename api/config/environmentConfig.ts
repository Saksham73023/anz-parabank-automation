import type { ApiAuthentication } from '../apiClient';

export interface ApiConfig {
  baseURL: string;
  timeout: number;
  ignoreHTTPSErrors: boolean;
  authentication: ApiAuthentication;
  cookie?: string;
}

const DEFAULT_BASE_URL = 'https://parabank.parasoft.com/parabank/services/bank';

export function getApiConfig(environment: NodeJS.ProcessEnv = process.env): ApiConfig {
  const baseURL = environment.API_BASE_URL?.trim() || DEFAULT_BASE_URL;
  let parsedBaseURL: URL;
  try {
    parsedBaseURL = new URL(baseURL);
  } catch {
    throw new Error('API_BASE_URL must be a valid absolute URL.');
  }
  if (!['http:', 'https:'].includes(parsedBaseURL.protocol)) {
    throw new Error('API_BASE_URL must use HTTP or HTTPS.');
  }

  const timeout = Number(environment.API_TIMEOUT ?? 30000);
  if (!Number.isFinite(timeout) || timeout <= 0) {
    throw new RangeError('API_TIMEOUT must be a finite number greater than zero.');
  }

  return {
    baseURL,
    timeout,
    ignoreHTTPSErrors: environment.API_IGNORE_HTTPS_ERRORS === 'true',
    authentication: resolveAuthentication(environment),
    cookie: environment.API_COOKIE?.trim() || undefined
  };
}

function resolveAuthentication(environment: NodeJS.ProcessEnv): ApiAuthentication {
  const authType = environment.API_AUTH_TYPE?.trim().toLowerCase();
  if (authType && !['none', 'bearer', 'basic'].includes(authType)) {
    throw new Error('API_AUTH_TYPE must be one of: none, bearer, basic.');
  }

  const token = environment.API_TOKEN?.trim();
  const username = environment.API_USERNAME?.trim();
  const password = environment.API_PASSWORD;
  const type = authType ?? (token ? 'bearer' : 'none');

  if (type === 'bearer') {
    if (!token) throw new Error('API_TOKEN is required when API_AUTH_TYPE is bearer.');
    return { type: 'bearer', token };
  }
  if (type === 'basic') {
    if (!username || password === undefined || password.length === 0) {
      throw new Error('API_USERNAME and API_PASSWORD are required when API_AUTH_TYPE is basic.');
    }
    return { type: 'basic', username, password };
  }
  return { type: 'none' };
}
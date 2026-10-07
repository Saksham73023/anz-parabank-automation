import type { APIResponse } from 'playwright';

/**
 * Parses an API response as JSON and preserves response context in parsing errors.
 * @param response Playwright response to parse.
 * @returns Parsed response body as the caller's expected type.
 */
export async function readJsonResponse<T>(response: APIResponse): Promise<T> {
  try {
    return await response.json() as T;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Expected a JSON response (HTTP ${response.status()}): ${detail}`);
  }
}
import type { APIResponse } from 'playwright';

export async function readJsonResponse<T>(response: APIResponse): Promise<T> {
  try {
    return await response.json() as T;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Expected a JSON response (HTTP ${response.status()}): ${detail}`);
  }
}
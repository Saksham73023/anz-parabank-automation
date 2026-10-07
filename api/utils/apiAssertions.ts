import { expect } from 'playwright/test';
import type { AnySchema } from 'ajv';
import type { APIResponse } from 'playwright';
import { ResponseValidator } from './responseValidator';

/** Reusable high-level assertions for API response status codes and JSON schemas. */
export class ApiAssertions {
  /** Asserts the expected HTTP status using the test assertion library and validator. */
  static assertStatus(response: APIResponse, expectedStatus: number): void {
    expect(response.status()).toBe(expectedStatus);
    ResponseValidator.assertStatus(response, expectedStatus);
  }

  /** Validates a response JSON payload against the provided AJV schema. */
  static async assertSchema(response: APIResponse, schema: AnySchema): Promise<void> {
    await ResponseValidator.assertJsonSchema(response, schema);
  }
}
import { expect } from 'playwright/test';
import type { AnySchema } from 'ajv';
import type { APIResponse } from 'playwright';
import { ResponseValidator } from './responseValidator';

export class ApiAssertions {
  static assertStatus(response: APIResponse, expectedStatus: number): void {
    expect(response.status()).toBe(expectedStatus);
    ResponseValidator.assertStatus(response, expectedStatus);
  }

  static async assertSchema(response: APIResponse, schema: AnySchema): Promise<void> {
    await ResponseValidator.assertJsonSchema(response, schema);
  }
}
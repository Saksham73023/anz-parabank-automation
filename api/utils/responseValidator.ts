import Ajv from 'ajv';
import type { AnySchema, ValidateFunction } from 'ajv';
import type { APIResponse } from 'playwright';
import { readJsonResponse } from './apiUtils';

const ajv = new Ajv({ allErrors: true });
const compiledSchemas = new WeakMap<object, ValidateFunction>();

/** Validates HTTP status and JSON body contracts while caching compiled AJV schemas. */
export class ResponseValidator {
  /** Throws an assertion error when the response status is outside the allowed set. */
  static assertStatus(response: APIResponse, expectedStatus: number | number[]): void {
    const allowedStatuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
    if (!allowedStatuses.includes(response.status())) {
      throw new Error(`Expected HTTP ${allowedStatuses.join(' or ')}, received ${response.status()}.`);
    }
  }

  /**
   * Parses the response body as JSON and validates it against a schema.
   * Includes AJV instance paths and messages when the payload does not conform.
   */
  static async assertJsonSchema(response: APIResponse, schema: AnySchema): Promise<void> {
    const payload: unknown = await readJsonResponse(response);
    const validator = this.getValidator(schema);
    if (!validator(payload)) {
      const details = validator.errors?.map((error) => `${error.instancePath || '/'} ${error.message}`).join('; ');
      throw new Error(`Response did not match JSON Schema${details ? `: ${details}` : '.'}`);
    }
  }

  /** Retrieves or compiles a schema validator and caches it for subsequent assertions. */
  private static getValidator(schema: AnySchema): ValidateFunction {
    const cacheKey = schema as object;
    const cached = compiledSchemas.get(cacheKey);
    if (cached) return cached;

    const validator = ajv.compile(schema);
    compiledSchemas.set(cacheKey, validator);
    return validator;
  }
}
import { faker } from '@faker-js/faker';
import type { RegistrationData } from '../pages/registration.page';
import {
  getBillPaymentData,
  type BillPaymentData
} from '../support/testDataHelper';

/** Creates a lowercase, alphanumeric username with a sanitized prefix for unique registration tests. */
export function createRandomUsername(prefix = 'pb'): string {
  const safePrefix = prefix.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'pb';
  return `${safePrefix}${faker.string.alphanumeric(10).toLowerCase()}`;
}

/**
 * Generates realistic customer-registration data and applies explicit scenario overrides.
 * @param overrides Values replacing generated customer fields.
 * @returns Complete registration data suitable for the ParaBank form.
 */
export function createRegistrationData(overrides: Partial<RegistrationData> = {}): RegistrationData {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  return {
    firstName,
    lastName,
    address: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state({ abbreviated: true }),
    zipCode: faker.location.zipCode('#####'),
    phoneNumber: faker.string.numeric(10),
    ssn: faker.string.numeric(9),
    username: createRandomUsername(firstName.replace(/[^a-zA-Z]/g, '')),
    password: faker.string.alphanumeric(10),
    ...overrides
  };
}

/**
 * Generates payee data with matching account and verification numbers.
 * @param overrides Values replacing generated or fixture defaults.
 * @returns Complete bill-payment form data.
 */
export function createBillPaymentData(overrides: Partial<BillPaymentData> = {}): BillPaymentData {
  const accountNumber = faker.string.numeric(9);

  return {
    ...getBillPaymentData().valid,
    payeeName: faker.company.name(),
    address: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state({ abbreviated: true }),
    zipCode: faker.location.zipCode('#####'),
    phoneNumber: faker.string.numeric(10),
    accountNumber,
    verifyAccount: accountNumber,
    ...overrides
  };
}

/** Creates a readable, randomized account label for test scenarios. */
export function createRandomAccountName(): string {
  return `${faker.company.name()} ${faker.string.alphanumeric(5).toUpperCase()}`;
}

/** Combines a caller prefix, timestamp, and random suffix for unique runtime values. */
export function createRuntimeValue(prefix = 'runtime'): string {
  return `${prefix}-${Date.now().toString(36)}-${faker.string.alphanumeric(6).toLowerCase()}`;
}

/**
 * Generates a random transfer value at the requested currency precision.
 * Validates bounds and decimal places before selecting a value.
 * @param minimum Inclusive lower amount bound.
 * @param maximum Inclusive upper amount bound.
 * @param decimalPlaces Supported precision, from zero to two decimal places.
 * @returns A randomly selected amount within the bounds.
 */
export function createRandomTransferAmount(minimum = 1, maximum = 100, decimalPlaces = 2): number {
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || maximum < minimum) {
    throw new RangeError('Transfer amount bounds must be finite and maximum must be at least minimum.');
  }
  if (!Number.isInteger(decimalPlaces) || decimalPlaces < 0 || decimalPlaces > 2) {
    throw new RangeError('Transfer amount decimal places must be an integer between 0 and 2.');
  }

  const scale = 10 ** decimalPlaces;
  const minimumUnits = Math.ceil(minimum * scale);
  const maximumUnits = Math.floor(maximum * scale);
  if (maximumUnits < minimumUnits) {
    throw new RangeError('Transfer amount range does not contain a value at the requested precision.');
  }

  return faker.number.int({ min: minimumUnits, max: maximumUnits }) / scale;
}
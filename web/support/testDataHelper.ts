import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import type { RegistrationData } from '../pages/registration.page';

/** ParaBank username and password fixture contract. */
export interface LoginCredentials {
  username: string;
  password: string;
}

/** Bill-payment form values used by positive, negative, and batch scenarios. */
export interface BillPaymentData {
  payeeName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phoneNumber: string;
  accountNumber: string;
  verifyAccount: string;
  amount: string;
}

/** Bill-payment field names accepted by page-object and step helpers. */
export type BillPaymentField = keyof BillPaymentData;
/** ParaBank account categories supported by account-opening scenarios. */
export type AccountType = 'CHECKING' | 'SAVINGS';

/** Valid and invalid transfer values maintained in the test-data file. */
export interface TransferAmounts {
  minimum: number;
  twoDecimalPlaces: number;
  large: number;
  zero: string;
  negative: string;
  nonNumeric: string;
  specialCharacters: string;
  moreThanTwoDecimalPlaces: string;
}

/** Typed structure of web/testData/parabank.json, including messages and reusable form data. */
export interface ParaBankTestData {
  loginData: { validUser: LoginCredentials };
  registrationData: {
    valid: RegistrationData;
    invalid: {
      specialCharactersUsername: string;
      sqlInjectionUsername: string;
      xssUsername: string;
    };
  };
  registrationValidation: {
    usernameMaxLength: number;
    passwordMismatch: string;
    requiredFields: string[];
  };
  accountData: { defaultType: AccountType; supportedTypes: AccountType[] };
  transferFundsData: { dailyAmounts: number[] };
  billPaymentData: {
    valid: BillPaymentData;
    invalid: {
      mismatchedAccount: BillPaymentData;
      zeroAmount: BillPaymentData;
      blankAmount: BillPaymentData;
      negativeAmount: BillPaymentData;
    };
    batch: BillPaymentData[];
  };
  commonMessages: {
    registrationSuccess: string;
    accountOpenedSuccess: string;
    transferCompleteHeading: string;
    billPaymentComplete: string;
  };
  validationMessages: {
    usernameAlreadyExists: string;
    login: { invalidCredentials: string };
    billPayment: {
      accountMismatch: string;
      amount: string;
      invalidAmount: string;
      amountEmpty: string;
      insufficientFunds: string;
    };
  };
  testAmounts: {
    billPayment: { valid: string; zero: string; negative: string; blank: string };
    transfer: TransferAmounts & { valid: number };
  };
  reusableApplicationData: {
    billPaymentFieldLabels: Record<string, BillPaymentField>;
  };
}

/**
 * Loads a JSON fixture from the Web test-data directory.
 * @param fileName Fixture file name relative to web/testData.
 * @returns Parsed fixture data as the requested type.
 */
export function readJsonFile<T>(fileName: string): T {
  const filePath = join(__dirname, '..', 'testData', fileName);
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

/** Returns the complete typed ParaBank fixture used by Web scenarios. */
export function getTestData(): ParaBankTestData {
  return readJsonFile<ParaBankTestData>('parabank.json');
}

/** Returns the configured valid-login fixture credentials. */
export function getLoginCredentials(): LoginCredentials {
  return getTestData().loginData.validUser;
}

/** Returns valid and invalid customer-registration fixture values. */
export function getRegistrationData(): ParaBankTestData['registrationData'] {
  return getTestData().registrationData;
}

/** Returns registration limits and expected form-validation messages. */
export function getRegistrationValidation(): ParaBankTestData['registrationValidation'] {
  return getTestData().registrationValidation;
}

/** Returns supported account types and the configured default type. */
export function getAccountData(): ParaBankTestData['accountData'] {
  return getTestData().accountData;
}

/** Returns transfer scenario values, including the daily transfer sequence. */
export function getTransferFundsData(): ParaBankTestData['transferFundsData'] {
  return getTestData().transferFundsData;
}

/** Returns valid, invalid, and batch bill-payment fixture values. */
export function getBillPaymentData(): ParaBankTestData['billPaymentData'] {
  return getTestData().billPaymentData;
}

/** Returns expected success text shared by account, transfer, registration, and bill-pay flows. */
export function getCommonMessages(): ParaBankTestData['commonMessages'] {
  return getTestData().commonMessages;
}

/** Returns expected login, registration, and bill-payment validation messages. */
export function getValidationMessages(): ParaBankTestData['validationMessages'] {
  return getTestData().validationMessages;
}

/** Returns configured valid and invalid monetary values used by UI scenarios. */
export function getTestAmounts(): ParaBankTestData['testAmounts'] {
  return getTestData().testAmounts;
}

/** Returns reusable UI label-to-field mappings maintained with the fixture. */
export function getReusableApplicationData(): ParaBankTestData['reusableApplicationData'] {
  return getTestData().reusableApplicationData;
}

/** Maps a visible bill-payment field label to its typed test-data field name. */
export function getBillPaymentFieldByLabel(label: string): BillPaymentField | undefined {
  return getReusableApplicationData().billPaymentFieldLabels[label];
}

/** Valid bill-payment fixture reused by positive and transaction-seeding workflows. */
export const validBillPaymentData = getBillPaymentData().valid;
/** Invalid bill-payment fixture variants used for input-validation scenarios. */
export const invalidBillPaymentData = getBillPaymentData().invalid;
/** Batch payment fixture used to validate multi-payment totals and confirmations. */
export const batchBillPayments = getBillPaymentData().batch;
/** Daily transfer amount sequence used by transfer ledger scenarios. */
export const dailyTransferAmounts = getTransferFundsData().dailyAmounts;
/** Valid and invalid transfer values reused by Web transfer scenarios. */
export const transferAmounts = getTestAmounts().transfer;

/** Maps visible bill-payment labels to the corresponding typed fixture field. */
export const billPaymentFieldByLabel = getReusableApplicationData().billPaymentFieldLabels;
/** Expected bill-payment validation patterns compiled from shared fixture messages. */
export const billPaymentErrorPatterns = Object.fromEntries(
  Object.entries(getValidationMessages().billPayment).map(([key, pattern]) => [key, new RegExp(pattern, 'i')])
) as Record<keyof ParaBankTestData['validationMessages']['billPayment'], RegExp>;

/** Maps common invalid amount strings to their corresponding negative-test fixture. */
export const invalidAmountByValue: Record<string, BillPaymentData> = {
  '0': invalidBillPaymentData.zeroAmount,
  '-100': invalidBillPaymentData.negativeAmount
};
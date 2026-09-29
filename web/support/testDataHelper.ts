import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import type { RegistrationData } from '../pages/registration.page';

export interface LoginCredentials {
  username: string;
  password: string;
}

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

export type BillPaymentField = keyof BillPaymentData;
export type AccountType = 'CHECKING' | 'SAVINGS';

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

export function readJsonFile<T>(fileName: string): T {
  const filePath = join(__dirname, '..', 'testData', fileName);
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

export function getTestData(): ParaBankTestData {
  return readJsonFile<ParaBankTestData>('parabank.json');
}

export function getLoginCredentials(): LoginCredentials {
  return getTestData().loginData.validUser;
}

export function getRegistrationData(): ParaBankTestData['registrationData'] {
  return getTestData().registrationData;
}

export function getRegistrationValidation(): ParaBankTestData['registrationValidation'] {
  return getTestData().registrationValidation;
}

export function getAccountData(): ParaBankTestData['accountData'] {
  return getTestData().accountData;
}

export function getTransferFundsData(): ParaBankTestData['transferFundsData'] {
  return getTestData().transferFundsData;
}

export function getBillPaymentData(): ParaBankTestData['billPaymentData'] {
  return getTestData().billPaymentData;
}

export function getCommonMessages(): ParaBankTestData['commonMessages'] {
  return getTestData().commonMessages;
}

export function getValidationMessages(): ParaBankTestData['validationMessages'] {
  return getTestData().validationMessages;
}

export function getTestAmounts(): ParaBankTestData['testAmounts'] {
  return getTestData().testAmounts;
}

export function getReusableApplicationData(): ParaBankTestData['reusableApplicationData'] {
  return getTestData().reusableApplicationData;
}

export function getBillPaymentFieldByLabel(label: string): BillPaymentField | undefined {
  return getReusableApplicationData().billPaymentFieldLabels[label];
}

export const validBillPaymentData = getBillPaymentData().valid;
export const invalidBillPaymentData = getBillPaymentData().invalid;
export const batchBillPayments = getBillPaymentData().batch;
export const dailyTransferAmounts = getTransferFundsData().dailyAmounts;
export const transferAmounts = getTestAmounts().transfer;

export const billPaymentFieldByLabel = getReusableApplicationData().billPaymentFieldLabels;
export const billPaymentErrorPatterns = Object.fromEntries(
  Object.entries(getValidationMessages().billPayment).map(([key, pattern]) => [key, new RegExp(pattern, 'i')])
) as Record<keyof ParaBankTestData['validationMessages']['billPayment'], RegExp>;

export const invalidAmountByValue: Record<string, BillPaymentData> = {
  '0': invalidBillPaymentData.zeroAmount,
  '-100': invalidBillPaymentData.negativeAmount
};
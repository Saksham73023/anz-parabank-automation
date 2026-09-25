export const dailyTransferAmounts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const transferAmounts = {
  minimum: 1,
  twoDecimalPlaces: 100.5,
  large: 500,
  zero: '0',
  negative: '-100',
  nonNumeric: 'abc',
  specialCharacters: '@@@',
  moreThanTwoDecimalPlaces: '100.999'
} as const;
import { expect } from 'playwright/test';
import type { Page } from 'playwright';
import { TransferFundsPage } from '../pages/transferFunds.page';

export interface SeededTransfer {
  sourceAccountId: string;
  targetAccountId: string;
  amount: number;
}

export async function setAccountBalance(
  page: Page,
  targetAccountId: string,
  targetBalance: number
): Promise<SeededTransfer[]> {
  if (!Number.isFinite(targetBalance) || targetBalance < 0) {
    throw new Error(`Target balance must be a non-negative number; received ${targetBalance}.`);
  }

  const transferPage = new TransferFundsPage(page);
  const accountIds = await transferPage.getAccountIds();
  if (!accountIds.includes(targetAccountId)) {
    throw new Error(`Target account ${targetAccountId} is not available for transaction seeding.`);
  }

  const seededTransfers: SeededTransfer[] = [];
  for (let attempt = 0; attempt < accountIds.length; attempt += 1) {
    const currentBalance = await transferPage.getAccountBalance(targetAccountId);
    const difference = Math.round((targetBalance - currentBalance) * 100) / 100;
    if (Math.abs(difference) < 0.01) return seededTransfers;

    const balances = new Map<string, number>();
    for (const accountId of accountIds) {
      if (accountId !== targetAccountId) {
        balances.set(accountId, await transferPage.getAccountBalance(accountId));
      }
    }

    let sourceAccountId: string;
    let destinationAccountId: string;
    let amount: number;
    if (difference > 0) {
      const source = [...balances.entries()]
        .filter(([, balance]) => balance > 0)
        .sort((left, right) => right[1] - left[1])[0];
      if (!source) throw new Error(`No funded source account can seed ${targetAccountId}.`);
      sourceAccountId = source[0];
      destinationAccountId = targetAccountId;
      amount = Math.min(difference, Math.round(source[1] * 100) / 100);
    } else {
      const destination = [...balances.entries()].sort((left, right) => left[1] - right[1])[0];
      if (!destination) throw new Error(`No destination account can receive excess funds from ${targetAccountId}.`);
      sourceAccountId = targetAccountId;
      destinationAccountId = destination[0];
      amount = Math.abs(difference);
    }

    await transferPage.selectAccounts(sourceAccountId, destinationAccountId);
    await transferPage.submitTransfer(amount.toFixed(2));
    seededTransfers.push({ sourceAccountId, targetAccountId: destinationAccountId, amount });
  }

  const finalBalance = await transferPage.getAccountBalance(targetAccountId);
  expect(finalBalance).toBeCloseTo(targetBalance, 2);
  return seededTransfers;
}
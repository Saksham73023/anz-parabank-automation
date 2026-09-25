import { IWorldOptions, World, setWorldConstructor } from '@cucumber/cucumber';
import { Browser, BrowserContext, Page } from 'playwright';
import { RegistrationData } from '../pages/registration.page';

export class CustomWorld extends World {
  browser?: Browser;
  context?: BrowserContext;
  page?: Page;
  registrationData?: RegistrationData;
  transferSourceAccountId?: string;
  transferDestinationAccountId?: string;
  transferOpeningBalance?: number;
  transferSourceBalanceBefore?: number;
  transferDestinationBalanceBefore?: number;
  transferAmount?: number;
  transferTransactionId?: string;
  transferSuccessful?: boolean;
  transferExpectedBalance?: number;
  transferLedgerEntries?: number;

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(CustomWorld);
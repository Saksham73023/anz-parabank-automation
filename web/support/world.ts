import { IWorldOptions, World, setWorldConstructor } from '@cucumber/cucumber';
import { Browser, BrowserContext, Page } from 'playwright';
import { RegistrationData } from '../pages/registration.page';

/** Holds per-scenario Playwright resources and workflow state shared by Web step definitions. */
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

  /** Initializes Cucumber scenario state using the framework-provided world options. */
  constructor(options: IWorldOptions) {
    super(options);
  }
}

/** Registers CustomWorld as the Cucumber world implementation for Web scenarios. */
setWorldConstructor(CustomWorld);
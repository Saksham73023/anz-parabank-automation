import { After, Before, setDefaultTimeout, Status } from '@cucumber/cucumber';
import type { World } from '@cucumber/cucumber';
import { closeMobileSession, createMobileSession, mobileSessionFor, setMobileSession } from './pages/mobileHelper';

const browserScenarios = '@crossbrowser or @accessibility or @mockpayment or @payid';
const allDay9Scenarios = `${browserScenarios} or @mobile`;

setDefaultTimeout(Number(process.env.CUCUMBER_TIMEOUT ?? 60000));

Before({ tags: browserScenarios }, async function (this: World) {
  setMobileSession(this, await createMobileSession());
});

Before({ tags: '@mobile' }, async function (this: World) {
  setMobileSession(this, await createMobileSession(true));
});

After({ tags: allDay9Scenarios }, async function (this: World, scenario) {
  try {
    if (scenario.result?.status === Status.FAILED) {
      const session = mobileSessionFor(this);
      if (!session.page.isClosed()) {
        await this.attach(await session.page.screenshot({ fullPage: true }), 'image/png');
      }
    }
  } finally {
    await closeMobileSession(this);
  }
});
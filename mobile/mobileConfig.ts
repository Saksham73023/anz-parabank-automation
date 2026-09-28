import { After, Before } from '@cucumber/cucumber';
import type { World } from '@cucumber/cucumber';
import { closeMobileSession, createMobileSession, setMobileSession } from './pages/mobileHelper';

Before({ tags: '@mobile' }, async function (this: World) {
  setMobileSession(this, await createMobileSession());
});

After({ tags: '@mobile' }, async function (this: World) {
  await closeMobileSession(this);
});
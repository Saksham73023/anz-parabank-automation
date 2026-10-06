import { chromium, devices, firefox, webkit } from 'playwright';
import type { Browser, BrowserContext, Page } from 'playwright';
import type { World } from '@cucumber/cucumber';
import { getPlaywrightConfiguration } from '../playwrightConfig';

export interface MobileSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

const sessions = new WeakMap<World, MobileSession>();

export async function createMobileSession(mobile = false): Promise<MobileSession> {
  const configuration = getPlaywrightConfiguration(mobile);
  const browser = await configuration.browserType.launch(configuration.launchOptions);
  try {
    const context = await browser.newContext({
      ...(configuration.deviceName ? devices[configuration.deviceName] : {}),
      ...configuration.contextOptions
    });
    const page = await context.newPage();
    page.setDefaultTimeout(Number(process.env.DEFAULT_TIMEOUT ?? 30000));
    page.setDefaultNavigationTimeout(Number(process.env.NAVIGATION_TIMEOUT ?? 45000));
    return { browser, context, page };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

export function setMobileSession(world: World, session: MobileSession): void {
  sessions.set(world, session);
}

export function mobileSessionFor(world: World): MobileSession {
  const session = sessions.get(world);
  if (!session) throw new Error('Mobile browser session is not initialized for this scenario.');
  return session;
}

export async function closeMobileSession(world: World): Promise<void> {
  const session = sessions.get(world);
  sessions.delete(world);
  if (!session) return;
  try {
    await session.context.close();
  } finally {
    await session.browser.close();
  }
}
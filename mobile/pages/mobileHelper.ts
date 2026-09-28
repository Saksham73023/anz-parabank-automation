import { chromium, devices } from 'playwright';
import type { Browser, BrowserContext, Page } from 'playwright';
import type { World } from '@cucumber/cucumber';

export interface MobileSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

const sessions = new WeakMap<World, MobileSession>();
const DEFAULT_BASE_URL = 'https://parabank.parasoft.com/parabank/index.htm';

export async function createMobileSession(): Promise<MobileSession> {
  const browser = await chromium.launch({ headless: process.env.HEADLESS !== 'false' });
  try {
    const context = await browser.newContext({
      ...devices['Pixel 7'],
      baseURL: process.env.BASE_URL ?? DEFAULT_BASE_URL
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
  await session.context.close();
  await session.browser.close();
}
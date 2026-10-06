import { chromium, firefox, webkit } from 'playwright';
import type { BrowserType, LaunchOptions } from 'playwright';

const defaultBaseUrl = 'https://parabank.parasoft.com/parabank/index.htm';
const supportedDevices = ['iPhone 12', 'Pixel 7'] as const;

export interface PlaywrightConfiguration {
  browserType: BrowserType;
  launchOptions: LaunchOptions;
  contextOptions: { baseURL: string; viewport?: { width: number; height: number } };
  deviceName?: typeof supportedDevices[number];
}

export function getPlaywrightConfiguration(mobile: boolean): PlaywrightConfiguration {
  const mobileDevice = process.env.MOBILE_DEVICE?.trim() || 'iPhone 12';
  const browserName = mobile ? 'chromium' : (process.env.BROWSER?.trim().toLowerCase() || 'chromium');
  const browserTypes: Record<string, BrowserType> = { chromium, firefox, webkit };
  const browserType = browserTypes[browserName];

  if (!browserType) {
    throw new Error(`Unsupported BROWSER "${browserName}". Use chromium, firefox, or webkit.`);
  }
  if (mobile && !supportedDevices.includes(mobileDevice as typeof supportedDevices[number])) {
    throw new Error(`Unsupported MOBILE_DEVICE "${mobileDevice}". Use ${supportedDevices.join(' or ')}.`);
  }

  const contextOptions: PlaywrightConfiguration['contextOptions'] = {
    baseURL: process.env.BASE_URL?.trim() || defaultBaseUrl
  };
  if (mobile && mobileDevice === 'iPhone 12') {
    contextOptions.viewport = { width: 390, height: 844 };
  }

  return {
    browserType,
    launchOptions: { headless: process.env.HEADLESS !== 'false' },
    contextOptions,
    ...(mobile ? { deviceName: mobileDevice as typeof supportedDevices[number] } : {})
  };
}

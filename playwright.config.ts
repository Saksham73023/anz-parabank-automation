import { defineConfig, devices } from 'playwright/test';

const baseURL = process.env.BASE_URL?.trim() || 'https://parabank.parasoft.com/parabank/index.htm';
const isCI = Boolean(process.env.CI);

export default defineConfig({
  // Scope native Playwright Test specs to Web; Cucumber features use Cucumber profiles.
  testDir: './web',
  testMatch: '**/*.spec.ts',

  // Keep independent Playwright Test specs parallel. Cucumber browser runs use Cucumber profiles instead.
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 1,
  workers: isCI ? 2 : undefined,

  // Keep native Playwright artifacts outside the two Cucumber HTML reports.
  outputDir: 'test-results',
  reporter: 'list',

  // Share the existing ParaBank URL and failure artifact policy across browser projects.
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry'
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        browserName: 'chromium'
      }
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        browserName: 'firefox'
      }
    },
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 13'],
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true
      }
    }
  ]
});

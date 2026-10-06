# ParaBank Automation

Cucumber + TypeScript + Playwright automation for [ParaBank](https://parabank.parasoft.com/parabank/index.htm).

## Setup

```powershell
npm install
npx playwright install chromium firefox
```

Copy `.env.example` to `.env` and set valid ParaBank credentials. The checked-in `.env` contains demo values only; replace them if the application rejects them.

## Run

```powershell
npm test
npm run test:web
npm run test:api
npm run test:mobile
npm run test:crossbrowser
npm run test:mobile:day9
npm run test:accessibility
npm run test:mockpayment
npm run test:smoke
npm run test:headed
npm run typecheck
```

`HEADLESS=false` opens the browser. Failed scenarios save screenshots under `reports/`, and the HTML report is written to `reports/cucumber-report.html`.

Web execution uses the `web/` feature files and browser hooks. API and mobile runs use separate Cucumber profiles and do not load the web hooks. The API and mobile scenarios are tagged `@api` and `@mobile`; existing smoke scenarios continue to use `@smoke`.

API runs use `API_BASE_URL` (defaults to `https://parabank.parasoft.com/parabank/services/bank`). Configure `API_ACCOUNT_ID`, `API_TRANSFER_SOURCE_ACCOUNT_ID`, and `API_TRANSFER_DESTINATION_ACCOUNT_ID` for the target environment. `API_TRANSFER_AMOUNT` defaults to `1`; `API_TOKEN` or `API_COOKIE` can provide API authentication when required. The API-only defaults and values are maintained in `api/testData/apiTestData.json`.

API test code is organized under `api/features/`, `api/steps/`, `api/services/`, `api/support/`, `api/testData/`, `api/payloads/`, and `api/utils/`. The Cucumber API profile loads API-only hooks and steps; web and mobile profiles remain separate.

Mobile runs use iPhone 12 emulation (390x844) by default; set `MOBILE_DEVICE=Pixel 7` to use Pixel 7. They use `BASE_URL` (the same site default used by web tests). Set `PARABANK_USERNAME` and `PARABANK_PASSWORD`; `MOBILE_TRANSFER_AMOUNT` and `MOBILE_BILLPAY_AMOUNT` default to `1`. Smoke transfer scenarios require two available accounts.

## Day 9 mobile, cross-browser, accessibility, and payment tests

All Day 9 files live under `mobile/`. `mobile/playwrightConfig.ts` selects the browser for Cucumber scenarios and applies iPhone 12 or Pixel 7 emulation for `@mobile`; the iPhone 12 viewport is 390x844. Cross-browser runs use the same smoke flow with Chromium and Firefox in separate runs.

Set `BASE_URL`, `PARABANK_USERNAME`, and `PARABANK_PASSWORD` for the target ParaBank environment. The smoke flow also needs at least two accounts for transfer. `MOBILE_TRANSFER_AMOUNT` and `MOBILE_BILLPAY_AMOUNT` default to `1`.

```powershell
npm run test:crossbrowser:chromium
npm run test:crossbrowser:firefox
npm run test:mobile:day9
npm run test:accessibility
npm run test:mockpayment
```

Each Cucumber profile writes an HTML report under `reports/`. Accessibility scans attach JSON violation details to the report and print impact, help, and affected selectors to the console; serious and critical violations fail the scan. NPP/PayID outcomes are fully mocked with `page.route()` and do not submit real payments.

```text
mobile/
  features/       Day 9 smoke, accessibility, and mocked payment scenarios
  pages/          Login, account, transfer, bill-pay, mock-payment POMs and session helpers
  steps/          Cucumber steps for smoke flows, axe scans, and mocked outcomes
  pages/mobileHelper.ts    Browser, context, and page lifecycle
  mobileConfig.ts          Cucumber hooks and failure screenshot attachments
  playwrightConfig.ts      Environment-based Playwright browser/device options
```

## Registration flow structure

The registration scenario is implemented with separate page objects, step definitions, and data generation:

```text
web/features/registration.feature  # BDD scenario
web/pages/basepage.ts              # Shared Playwright actions
web/pages/registration.page.ts     # Registration locators and actions
web/pages/accountOverview.page.ts  # Account overview assertions
web/steps/registrationsteps.ts     # Cucumber glue
web/testData/dynamicData.ts        # Test data generation
web/support/hooks.ts               # Browser lifecycle and timeout
```

Run only this flow with:

```powershell
npx cucumber-js --tags "@registration"
```

## Required from you

- Confirm the credentials to use for the test environment; do not commit real passwords.
- Confirm whether Chromium, Firefox, or WebKit is required (`BROWSER` controls this).
- Share the next business flows to automate, such as registration, account creation, funds transfer, bill payment, or logout.
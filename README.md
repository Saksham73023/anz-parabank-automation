# ParaBank Automation

Cucumber + TypeScript + Playwright automation for [ParaBank](https://parabank.parasoft.com/parabank/index.htm).

## Setup

```powershell
npm install
npx playwright install chromium
```

Copy `.env.example` to `.env` and set valid ParaBank credentials. The checked-in `.env` contains demo values only; replace them if the application rejects them.

## Run

```powershell
npm test
npm run test:web
npm run test:api
npm run test:mobile
npm run test:smoke
npm run test:headed
npm run typecheck
```

`HEADLESS=false` opens the browser. Failed scenarios save screenshots under `reports/`, and the HTML report is written to `reports/cucumber-report.html`.

Web execution uses the `web/` feature files and browser hooks. API and mobile runs use separate Cucumber profiles and do not load the web hooks. The API and mobile scenarios are tagged `@api` and `@mobile`; existing smoke scenarios continue to use `@smoke`.

API runs use `API_BASE_URL` (defaults to `https://parabank.parasoft.com/parabank/services/bank`). Configure `API_ACCOUNT_ID`, `API_TRANSFER_SOURCE_ACCOUNT_ID`, and `API_TRANSFER_DESTINATION_ACCOUNT_ID` for the target environment. `API_TRANSFER_AMOUNT` defaults to `1`; `API_TOKEN` or `API_COOKIE` can provide API authentication when required. The API-only defaults and values are maintained in `api/testData/apiTestData.json`.

Mobile runs use Pixel 7 emulation and `BASE_URL` (the same site default used by web tests). Set `PARABANK_USERNAME` and `PARABANK_PASSWORD`; `MOBILE_TRANSFER_AMOUNT` defaults to `1`. A transfer scenario requires two available accounts.

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
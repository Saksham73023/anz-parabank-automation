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
npm run test:crossbrowser
npm run test:mobile
npm run test:web:mobile-smoke
npm run test:api
npm run test:accessibility
npm run test:payid
npm run test:all
npm run test:headed
npm run typecheck
```

`HEADLESS=false` opens the browser. Failed scenarios save screenshots under `test-results/`. Cucumber runs write their detailed HTML report to `reports/cucumber-report.html`.

Web execution uses the `web/` feature files and browser hooks. `npm run test:web` explicitly runs Web scenarios on Chromium. API runs use a separate Cucumber profile and do not load the web hooks. API scenarios are tagged `@api`.

The Day 9 smoke pack reuses the same Web feature files and step definitions for Login, Accounts Overview, Transfer Funds, Bill Pay, and Logout. The `@day9-smoke` tag selects exactly those scenarios. `npm run test:crossbrowser` executes that pack on desktop Chromium, desktop Firefox, and Chromium at a 390x844 mobile viewport. The mobile leg verifies the viewport and workflow; it warns about horizontal overflow because the external ParaBank site uses a fixed-width desktop layout. `npm run test:mobile` runs the mobile leg by itself.

The root `playwright.config.ts` also defines native Playwright Test projects named `chromium`, `firefox`, and `mobile` (390x844 iPhone 13 emulation). Cucumber feature suites use their Cucumber profiles and browser hooks; they do not run through native Playwright Test projects. Native Playwright Test specs can be run with `npx playwright test --config=playwright.config.ts` (install browsers with `npx playwright install chromium firefox`). Native Playwright uses the list reporter so it does not add another report file.

API runs use `API_BASE_URL` (defaults to `https://parabank.parasoft.com/parabank/services/bank`). Configure `API_ACCOUNT_ID`, `API_TRANSFER_SOURCE_ACCOUNT_ID`, and `API_TRANSFER_DESTINATION_ACCOUNT_ID` for the target environment. `API_TRANSFER_AMOUNT` defaults to `1`; `API_TOKEN` or `API_COOKIE` can provide API authentication when required. The API-only defaults and values are maintained in `api/testData/apiTestData.json`. Under HTTP 429 rate limiting, GET requests and explicitly marked safe requests (such as ParaBank login) retry at most once, honoring `Retry-After` up to five minutes. Other mutating requests fail without retrying to avoid duplicate actions.

API test code is organized under `api/features/`, `api/steps/`, `api/services/`, `api/support/`, `api/testData/`, `api/payloads/`, and `api/utils/`. The Cucumber API profile loads API-only hooks and steps; the Web profile remains separate.

### API framework scope

The API profile runs independently through Playwright's API request context and Cucumber's API-only hooks. Its supported ParaBank service operations are:

| Resource or operation | Supported API behavior exercised here |
| --- | --- |
| Customer | GET customer details and list customer accounts |
| Account | Create an account and GET account details |
| Transaction | GET account transaction history; seed a transaction through the supported deposit action |
| Transfer | Submit a transfer action and verify account balances |
| BillPay | Submit a bill-payment action and verify its confirmation |

The eight positive feature scenarios are workflow/read checks, not eight independent CRUD operations; Customer coverage is read-only. The six negative cases and three response-schema scenarios are described in their respective feature files. SOAP parity compares the supported Customer GET, Account GET, and Transaction GET operations.

### Day 8 REST and SOAP API tests

The API-only suite includes eight positive scenarios across Customer, Account, Transaction history, Transfer, and BillPay; six negative scenarios; and JSON Schema checks for Customer, Account, and Transaction GET responses. Customer coverage is read-only. `api/features/soapParity.feature` compares Customer GET, Account GET, and Transaction GET REST responses with their ParaBank SOAP equivalents. The E2E API scenario uses an existing customer, creates an account, seeds transaction history through a deposit, transfers funds, pays a bill, and reconciles account balances and the corresponding transaction records.

SOAP requests use `API_SOAP_URL` when configured; otherwise the endpoint is derived from an `API_BASE_URL` ending in `/services/bank`. Set `API_E2E_SEED_AMOUNT` to change the E2E deposit amount; its default is `100`, and it must exceed the configured transfer and bill-payment amounts combined.

**ParaBank API limitation:** Customer creation is not available through the ParaBank REST/SOAP service API used by this framework. Customer registration is a separate web flow, so API scenarios and the E2E flow use an existing customer; they must not claim to create one. The service contract also does not expose Customer deletion or Account update/delete operations. Transactions are read through account transaction history and created as side effects of supported operations such as deposit, transfer, and bill payment; there are no Transaction CRUD operations in this suite. Transfer and BillPay are supported action requests, not CRUD-managed resources. The framework intentionally implements only these exposed service operations and does not invent endpoints to satisfy generic CRUD wording. Consequently, full CRUD coverage across Customer, Account, Transaction, Transfer, and BillPay is not achievable against this API.

The E2E scenario starts from an existing customer because the API does not support customer creation. It creates an account, deposits seed funds, transfers, pays a bill, and reconciles both balances with the newly recorded transactions.

## Web accessibility tests

The Web accessibility profile runs the three `@accessibility` scenarios in `web/features/accessibility.feature` for Login, Accounts Overview, and Transfer Funds. It uses the existing Web Cucumber hooks and page objects, attaches the full axe result JSON to each scenario, and writes findings to the shared Cucumber HTML report. Violations are logged and reported for analysis but do not fail the scenarios in this POC.

Run the accessibility scenarios directly with:

```powershell
npx cucumber-js -p web-accessibility --tags "@accessibility"
```

The `-p web-accessibility` profile is required because the default Cucumber profile loads API scenarios only. Alternatively, run `npm run test:accessibility`.

```text
web/
  features/accessibility.feature       # @accessibility scenarios for the three Web pages
  steps/accessibility.steps.ts         # Page-object navigation, scans, report checks, and non-blocking findings
  support/axeHelper.ts                 # Reusable axe scan and violation logging
reports/
  cucumber-report.html                 # Detailed results from the most recent Cucumber run
  final-consolidated-report.html       # Summary of the most recent cross-browser/all run
```

## Day 9 execution and reporting

Run each activity separately:

```powershell
npm run test:api
npm run test:crossbrowser
npm run test:mobile
npm run test:accessibility
npm run test:payid
```

`npm run test:crossbrowser` runs the shared smoke scenarios in desktop Chromium, desktop Firefox, and a Chromium 390x844 mobile viewport. Mobile scenarios verify the configured viewport and complete their workflows; the external ParaBank UI may still overflow horizontally because it has a fixed-width desktop layout. Cucumber profiles share one detailed HTML report; the runner writes one final HTML summary. No per-suite JSON/HTML reports are generated.

ParaBank has no native PayID endpoint. The PayID feature now lives in `api/features/payId.feature` and uses a scenario-local HTTP mock API, not browser hooks or Playwright `page.route()`. It validates settled (HTTP 200), failed (HTTP 422), and timeout (HTTP 504) outcomes without making real payments. Run the API-only simulation with `npm run test:payid`; it writes to the shared Cucumber HTML report. The scenarios are tagged `@api @payid`, so they also run as part of `npm run test:api`.

`npm run test:all` runs API, the full Web feature suite on Chromium, desktop Chromium and Firefox smoke, the same smoke pack on Chromium mobile (390x844), and accessibility. The final HTML report has separate API, Web, Cross Browser, Mobile, and Accessibility rows, including browser-run status within each category. It continues to later suites if an earlier suite fails and exits with a non-zero status if any run failed. `reports/cucumber-report.html` contains details from the most recently completed Cucumber profile; `reports/final-consolidated-report.html` summarizes every category.

The shared suite runner is `scripts/run-suites.js`. It requires no additional dependencies and returns a CI-friendly exit code after all requested suites have completed.

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
- Use `npm run test:web` for Chromium or `npm run test:crossbrowser` for Chromium, Firefox, and mobile smoke coverage.
- Share the next business flows to automate, such as registration, account creation, funds transfer, bill payment, or logout.
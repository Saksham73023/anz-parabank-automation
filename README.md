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
npm run test:payid
npm run test:mockpayment
npm run test:smoke
npm run test:headed
npm run typecheck
```

`HEADLESS=false` opens the browser. Failed scenarios save screenshots under `reports/`, and the HTML report is written to `reports/cucumber-report.html`.

Web execution uses the `web/` feature files and browser hooks. API and mobile runs use separate Cucumber profiles and do not load the web hooks. The API and mobile scenarios are tagged `@api` and `@mobile`; existing smoke scenarios continue to use `@smoke`.

API runs use `API_BASE_URL` (defaults to `https://parabank.parasoft.com/parabank/services/bank`). Configure `API_ACCOUNT_ID`, `API_TRANSFER_SOURCE_ACCOUNT_ID`, and `API_TRANSFER_DESTINATION_ACCOUNT_ID` for the target environment. `API_TRANSFER_AMOUNT` defaults to `1`; `API_TOKEN` or `API_COOKIE` can provide API authentication when required. The API-only defaults and values are maintained in `api/testData/apiTestData.json`.

API test code is organized under `api/features/`, `api/steps/`, `api/services/`, `api/support/`, `api/testData/`, `api/payloads/`, and `api/utils/`. The Cucumber API profile loads API-only hooks and steps; web and mobile profiles remain separate.

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

The Day 9 profiles cover 13 Cucumber scenarios (including the existing mobile login and transfer cases); the cross-browser smoke scenario runs on both Chromium and Firefox, for 14 executions total. Each Cucumber profile writes an HTML report under `reports/`; Chromium and Firefox smoke results are kept in separate reports. Accessibility scans attach JSON violation details to the report, append results to `reports/accessibility-results.jsonl`, and print impact, help, and affected selectors to the console; serious and critical violations fail the scan. NPP/PayID outcomes are fully mocked with `page.route()` and do not submit real payments.

```text
mobile/
  features/       Chromium/Firefox smoke, 390x844 mobile, accessibility, and PayID scenarios
  pages/          Login, account, transfer, bill-pay, mock-payment POMs and session helpers
  steps/          Shared smoke steps, axe scans, and mocked PayID outcomes
  utils/          Axe result logging and PayID route-interception mocks
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
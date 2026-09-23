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
npm run test:smoke
npm run test:headed
npm run typecheck
```

`HEADLESS=false` opens the browser. Failed scenarios save screenshots under `reports/`, and the HTML report is written to `reports/cucumber-report.html`.

## Registration flow structure

The registration scenario is implemented with separate page objects, step definitions, and data generation:

```text
features/registration.feature       # BDD scenario
pages/basepage.ts                   # Shared Playwright actions
pages/registration.page.ts          # Registration locators and actions
pages/accountOverview.page.ts       # Account overview assertions
steps/registrationsteps.ts          # Cucumber glue
testData/faker.util.ts              # Unique Faker registration data
support/hooks.ts                    # Browser lifecycle and timeout
```

Run only this flow with:

```powershell
npx cucumber-js --tags "@registration"
```

## Required from you

- Confirm the credentials to use for the test environment; do not commit real passwords.
- Confirm whether Chromium, Firefox, or WebKit is required (`BROWSER` controls this).
- Share the next business flows to automate, such as registration, account creation, funds transfer, bill payment, or logout.
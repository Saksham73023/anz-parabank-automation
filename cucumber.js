require('dotenv/config');

const common = {
  requireModule: ['ts-node/register'],
  // Reuses the shared progress and HTML reporting configuration for all Cucumber profiles.
  format: ['progress', 'html:reports/cucumber-report.html'],
  publishQuiet: true
};

module.exports = {
  default: {
    ...common,
    require: ['api/support/**/*.ts', 'api/steps/**/*.ts'],
    paths: ['api/features/**/*.feature'],
    tags: '@api'
  },
  api: {
    ...common,
    require: ['api/support/**/*.ts', 'api/steps/**/*.ts'],
    paths: ['api/features/**/*.feature'],
    tags: '@api'
  },
  web: {
    ...common,
    // Loads only Web hooks, page workflows, and feature files; API/mobile profiles remain isolated.
    require: ['web/support/**/*.ts', 'web/steps/**/*.ts'],
    paths: ['web/features/**/*.feature']
  },
  mobile: {
    ...common,
    require: ['mobile/mobileConfig.ts', 'mobile/steps/**/*.ts'],
    paths: ['mobile/features/**/*.feature'],
    tags: '@mobile',
    format: ['progress', 'html:reports/mobile-report.html']
  },
  smoke: {
    ...common,
    require: ['mobile/mobileConfig.ts', 'mobile/steps/**/*.ts'],
    paths: ['mobile/features/smoke.feature'],
    tags: '@smoke',
    format: ['progress', `html:reports/smoke-${process.env.BROWSER || 'chromium'}-report.html`]
  },
  crossbrowser: {
    ...common,
    require: ['mobile/mobileConfig.ts', 'mobile/steps/**/*.ts'],
    paths: ['mobile/features/**/*.feature'],
    tags: '@crossbrowser',
    format: ['progress', 'html:reports/crossbrowser-report.html']
  },
  accessibility: {
    ...common,
    require: ['mobile/mobileConfig.ts', 'mobile/steps/**/*.ts'],
    paths: ['mobile/features/**/*.feature'],
    tags: '@accessibility',
    format: ['progress', 'html:reports/accessibility-report.html']
  },
  payid: {
    ...common,
    require: ['mobile/mobileConfig.ts', 'mobile/steps/**/*.ts'],
    paths: ['mobile/features/payid.feature'],
    tags: '@payid',
    format: ['progress', 'html:reports/payid-report.html']
  },
  mockpayment: {
    ...common,
    require: ['mobile/mobileConfig.ts', 'mobile/steps/**/*.ts'],
    paths: ['mobile/features/**/*.feature'],
    tags: '@mockpayment',
    format: ['progress', 'html:reports/mockpayment-report.html']
  }
};

require('dotenv/config');

const common = {
  requireModule: ['ts-node/register'],
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
  mockpayment: {
    ...common,
    require: ['mobile/mobileConfig.ts', 'mobile/steps/**/*.ts'],
    paths: ['mobile/features/**/*.feature'],
    tags: '@mockpayment',
    format: ['progress', 'html:reports/mockpayment-report.html']
  }
};

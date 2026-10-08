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
  'api-payid': {
    ...common,
    require: ['api/support/**/*.ts', 'api/steps/**/*.ts'],
    paths: ['api/features/payId.feature'],
    tags: '@payid'
  },
  web: {
    ...common,
    // Loads only Web hooks, page workflows, and feature files; the API profile remains isolated.
    require: ['web/support/**/*.ts', 'web/steps/**/*.ts'],
    paths: ['web/features/**/*.feature']
  },
  'web-accessibility': {
    ...common,
    require: ['web/support/**/*.ts', 'web/steps/**/*.ts'],
    paths: ['web/features/accessibility.feature'],
    tags: '@accessibility'
  },
  'web-crossbrowser-chromium': {
    ...common,
    require: ['web/support/**/*.ts', 'web/steps/**/*.ts'],
    paths: ['web/features/**/*.feature'],
    tags: '@day9-smoke'
  },
  'web-crossbrowser-firefox': {
    ...common,
    require: ['web/support/**/*.ts', 'web/steps/**/*.ts'],
    paths: ['web/features/**/*.feature'],
    tags: '@day9-smoke'
  },
  'web-mobile': {
    ...common,
    require: ['web/support/**/*.ts', 'web/steps/**/*.ts'],
    paths: ['web/features/**/*.feature'],
    tags: '@day9-smoke'
  }
};

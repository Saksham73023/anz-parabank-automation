require('dotenv/config');

const common = {
  requireModule: ['tsx/cjs'],
  // The runner supplies a private JSON path when it needs to consolidate this profile's scenarios.
  format: [
    'progress',
    'html:reports/cucumber-report.html',
    ...(process.env.CUCUMBER_JSON_PATH ? [['json', process.env.CUCUMBER_JSON_PATH]] : [])
  ],
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
    paths: ['web/features/**/*.feature'],
    tags: 'not @accessibility'
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
  },
  'web-mobile-firefox': {
    ...common,
    require: ['web/support/**/*.ts', 'web/steps/**/*.ts'],
    paths: ['web/features/**/*.feature'],
    tags: '@day9-smoke'
  }
};

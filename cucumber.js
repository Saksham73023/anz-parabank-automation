require('dotenv/config');

const common = {
  requireModule: ['ts-node/register'],
  publishQuiet: true
};

const web = {
  ...common,
  require: ['web/support/**/*.ts', 'web/steps/**/*.ts'],
  paths: ['web/features/**/*.feature'],
  format: ['progress', 'html:reports/cucumber-report.html']
};

module.exports = {
  default: web,
  web,
  api: {
    ...common,
    require: ['api/steps/**/*.ts', 'api/stepDefinitions/**/*.ts'],
    paths: ['api/features/**/*.feature'],
    format: ['progress']
  },
  mobile: {
    ...common,
    require: ['mobile/steps/**/*.ts'],
    paths: ['mobile/features/**/*.feature'],
    format: ['progress']
  }
};
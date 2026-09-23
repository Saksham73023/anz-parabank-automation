require('dotenv/config');

module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['support/**/*.ts', 'steps/**/*.ts'],
    paths: ['features/**/*.feature'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true
  }
};
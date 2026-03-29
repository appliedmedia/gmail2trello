/**
 * Cucumber configuration for Gmail-2-Trello BDD tests.
 *
 * NOTE: The --config flag does not work with this project because
 * Cucumber's config loader validates package.json version as semver,
 * and ours ("3.1.0.001") is not semver-compliant.
 *
 * Run via the npm script instead:
 *   npm run test:cucumber
 *
 * Or directly:
 *   npx cucumber-js 'tests/cucumber/features/**\/*.feature' \
 *     --require 'tests/cucumber/support/**\/*.js' \
 *     --require 'tests/cucumber/step_definitions/**\/*.js'
 */
module.exports = {
  default: {
    paths: ['tests/cucumber/features/**/*.feature'],
    require: [
      'tests/cucumber/support/**/*.js',
      'tests/cucumber/step_definitions/**/*.js',
    ],
    format: ['progress-bar'],
    publishQuiet: true,
  },
};

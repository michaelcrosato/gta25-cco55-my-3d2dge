// ESLint: recommended rules everywhere, plus the determinism rule (PLAN.md 6.1, 7.3) on the simulation and the content.
import js from '@eslint/js';
import globals from 'globals';

const DET = 'Determinism: take time from dt / game.time and randomness from MOTOR.rng streams (PLAN.md 7.3)';
const SIM = ['src/motor/{core,sim,nav,ai,play,mission,save,combat,actors}/**/*.js', 'src/game/**/*.js'];

export default [
  { ignores: ['vendor/**', 'dist/**', 'node_modules/**', 'check-output/**', '.cache/**', '.claude/**', 'docs/handoff/**', 'tools/_*.mjs'] },   // (tools/_*.mjs: local probes, git-ignored)
  js.configs.recommended,
  { files: ['src/**/*.js'], languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.browser } } },
  { files: ['tools/**/*.mjs', 'tools/**/*.js', 'tests/**/*.mjs', 'eslint.config.js'], languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.node } } },
  // browser-side callbacks (page.evaluate) live in the e2e scripts and the tools that drive a page
  { files: ['tests/e2e/**/*.mjs', 'tools/**/*.mjs'], languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  { files: ['**/*.{js,mjs}'], rules: { 'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_' }], 'no-empty': ['error', { allowEmptyCatch: true }] } },
  { files: SIM, rules: {
    'no-restricted-globals': ['error', ...['Date', 'setTimeout', 'setInterval', 'requestAnimationFrame', 'crypto', 'performance'].map(name => ({ name, message: DET }))],
    'no-restricted-properties': ['error', { object: 'Math', property: 'random', message: DET },
      ...['rand', 'randInt', 'pick', 'chance'].map(property => ({ object: 'E', property, message: DET + ' (E.' + property + ' draws from Math.random)' }))],
  } },
];

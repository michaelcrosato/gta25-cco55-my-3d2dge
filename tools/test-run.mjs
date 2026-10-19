// The test gate. npm test: lint and checks, a current dist, unit and sim tests, the browser smoke test and the engine's
// checker on the build (about 1-6 minutes as the game grows). npm run test:full adds the heavy suites as they land.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const full = process.argv.includes('--full');
const env = { ...process.env, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1' };
if (!env.CHROMIUM_PATH && existsSync('/opt/pw-browsers/chromium')) env.CHROMIUM_PATH = '/opt/pw-browsers/chromium';
const STEPS = [
  ['lint', 'npx', ['eslint', '.']],
  ['boundary', 'node', ['tools/boundary-check.mjs']],
  ['vendor', 'node', ['tools/vendor-check.mjs']],
  ['goal-sync', 'node', ['tools/goal-sync.mjs']],
  ['dist current', 'node', ['tools/build.mjs', '--check']],
  ['unit + sim', 'node', ['--test', 'tests/unit/**/*.test.mjs', 'tests/sim/**/*.test.mjs']],
  ['e2e smoke', 'node', ['tests/e2e/smoke.mjs']],
  ['e2e replay', 'node', ['tests/e2e/replay.mjs']],
  ['e2e selftests', 'node', ['tests/e2e/selftest.mjs']],
  ['engine check', 'node', ['vendor/my-3d2dge/tools/check.mjs', 'dist/index.html', '--seconds', '3', '--out', 'check-output']],
];
const FULL = [   // heavy suites join here milestone by milestone (PLAN.md 6.3)
  ['city soak (10 min)', 'node', ['tests/full/city-soak.mjs', '--secs', '600']],
  ['gang sim (5 min)', 'node', ['tests/full/gang-soak.mjs', '--secs', '300']],
];
let failed = 0;
for (const [name, cmd, args] of full ? [...STEPS, ...FULL] : STEPS) {
  const t = Date.now(), r = spawnSync(cmd, args, { stdio: 'inherit', env, shell: false });
  const s = ((Date.now() - t) / 1000).toFixed(1);
  console.log(`${r.status === 0 ? 'PASS' : 'FAIL'} ${name} (${s}s)`);
  if (r.status !== 0) { failed++; if (!process.argv.includes('--keep-going')) break; }
}
console.log(failed ? `\n${failed} step(s) failed` : '\nall steps passed');
process.exit(failed ? 1 : 0);

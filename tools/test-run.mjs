// The test gate. npm test: lint and checks, a current dist, unit and sim tests, the content recipes, the browser
// smoke test and the engine's checker on the build (about 1-6 minutes as the game grows). npm run test:full adds the
// heavy suites as they land.
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
  ['tuning current', 'node', ['tools/tuning-doc.mjs', '--check']],   // (docs/TUNING.md is the knob list's)
  ['unit + sim', 'node', ['--test', 'tests/unit/**/*.test.mjs', 'tests/sim/**/*.test.mjs']],
  ['recipes', 'node', ['--test', 'tests/recipes/*.test.mjs']],   // (PLAN.md M12: each docs/CONTENT-GUIDE.md recipe followed to the letter, about a minute)
  ['review', 'node', ['--expose-gc', '--test', 'tests/review/**/*.test.mjs']],   // (PLAN.md M13: FAN-OUT B's findings, each a test that failed until it was fixed)
  ['e2e smoke', 'node', ['tests/e2e/smoke.mjs']],
  ['e2e replay', 'node', ['tests/e2e/replay.mjs']],
  ['e2e selftests', 'node', ['tests/e2e/selftest.mjs']],
  ['e2e audio', 'node', ['tests/e2e/audio.mjs']],
  ['e2e attract', 'node', ['tests/e2e/attract.mjs']],
  ['e2e photo', 'node', ['tests/e2e/photo.mjs']],
  ['e2e dev', 'node', ['tests/e2e/dev.mjs']],
  ['e2e cross-runtime', 'node', ['tests/e2e/cross-runtime.mjs']],   // (D33: one seed, the same game headless and in Chromium)
  ['engine check', 'node', ['vendor/my-3d2dge/tools/check.mjs', 'dist/index.html', '--seconds', '3', '--out', 'check-output']],
  ['engine check (bank)', 'node', ['vendor/my-3d2dge/tools/check.mjs', 'dist/index.html#interior/bank', '--seconds', '3', '--out', 'check-output/bank']],
];
const FULL = [   // heavy suites join here milestone by milestone (PLAN.md 6.3)
  ['perf gates', 'node', ['tools/perf.mjs', '--gate', '--rounds', '5']],   // (D10's budgets, each view read against M2's build as D20 says, the median of five rounds: D35; first, on a quiet machine)
  ['city soak (10 min)', 'node', ['tests/full/city-soak.mjs', '--secs', '600']],
  ['audio soak (10 min)', 'node', ['tests/e2e/audio.mjs', '--secs', '600']],
  ['attract soak (30 min x the shipped page and seeds 1-3)', 'node', ['--expose-gc', 'tools/attract-soak.mjs']],   // (PLAN.md 8.20: headless)
  ['attract soak in Chromium (5 min, drawn)', 'node', ['tools/attract-soak.mjs', '--chromium']],
  ['gang sim (5 min)', 'node', ['tests/full/gang-soak.mjs', '--secs', '300']],
  ['cross-runtime (10 min x 3 scenarios)', 'node', ['tests/e2e/cross-runtime.mjs', '--secs', '600']],
  ['ui audit (pad, keys, mouse at 1080p and 720p)', 'node', ['tools/ui-audit.mjs']],   // (PLAN.md 8.18: every screen by each device alone)
  ['ui audit (HUD size Huge, by pad: 320 x 180)', 'node', ['tools/ui-audit.mjs', '--hud', '2', '--sizes', '1280x720', '--passes', 'pad']],   // (the tightest the layer gets: FAN-OUT B)
  ['screenshot matrix', 'node', ['tools/shot-matrix.mjs', '--views', 'iso,top,side7', '--out', 'check-output/shots']],   // (PLAN.md 10: each neighbourhood, time and view drawn without an error)
  ['mission bot (seeds 1-3)', 'node', ['tools/bot.mjs', '--all', '--seeds', '1,2,3', '--par', '3']],   // (PLAN.md 8.15: every mission and activity level through the bot)
  ['mission bot through a pad', 'node', ['tools/bot.mjs', '--all', '--pad', '--seeds', '1', '--par', '3']],   // (the scripted human-style pass)
  ['bot gym (seeds 1-3)', 'node', ['tools/botgym.mjs', '--seeds', '1,2,3']],   // (one fixture per hint kind and per known limit, D34)
  ['bot gym through a pad', 'node', ['tools/botgym.mjs', '--pad', '--seeds', '1']],
  ['bot campaign (100%)', 'node', ['tools/bot-campaign.mjs', '--seed', '1']],   // (PLAN.md 15.4: a new game played to 100% completion)
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

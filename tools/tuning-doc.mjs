// docs/TUNING.md from the knob list (PLAN.md 7.4): the game loaded headless (every knob MOTOR and the content declare),
// each section a table of its knobs (id and label, default, range, what it does). --check: exit 1 when the file on disk
// differs, as npm test's "tuning current" step does.
//   node tools/tuning-doc.mjs [--check]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './build.mjs';
import { loadGame } from '../tests/harness.mjs';

const file = join(ROOT, 'docs/TUNING.md');
const { gtm } = await loadGame({ hash: '#title' });
const md = gtm.motor.tuningMarkdown(), n = gtm.motor.knobs().length;
if (process.argv.includes('--check')) {
  const now = existsSync(file) ? readFileSync(file, 'utf8') : '';
  if (now !== md) { console.error('docs/TUNING.md is stale: run node tools/tuning-doc.mjs'); process.exit(1); }
  console.log(`docs/TUNING.md is current (${n} knobs)`);
} else { writeFileSync(file, md); console.log(`wrote docs/TUNING.md (${n} knobs in ${gtm.motor.sections().length} sections)`); }
process.exit(0);

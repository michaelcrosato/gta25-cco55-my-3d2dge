// The /goal prompt lives in two places (GOAL.md and PLAN.md section 20): they must be identical, plain ASCII, and under
// the 4,000-character limit of /goal. The handoff's prompt (docs/HANDOFF.md) is held to the same limits.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './build.mjs';

const grab = (file, from = 0) => {
  const t = readFileSync(join(ROOT, file), 'utf8'), m = /```\n(\/goal [\s\S]*?)\n```/.exec(t.slice(from));
  if (!m) { console.error(`goal-sync: no /goal block in ${file}`); process.exit(1); }
  return m[1];
};
const plan = readFileSync(join(ROOT, 'PLAN.md'), 'utf8'), at = plan.indexOf('## 20. The /goal prompt');
const a = grab('GOAL.md'), b = grab('PLAN.md', at < 0 ? 0 : at), bad = [...a].filter(c => c.charCodeAt(0) > 127);
if (a !== b) { console.error('goal-sync: GOAL.md and PLAN.md section 20 differ'); process.exit(1); }
if (a.length >= 4000) { console.error(`goal-sync: the prompt is ${a.length} characters (the limit is 4,000)`); process.exit(1); }
if (bad.length) { console.error('goal-sync: the prompt has non-ASCII characters: ' + [...new Set(bad)].join(' ')); process.exit(1); }
// the handoff's /goal (docs/HANDOFF.md: the prompt that continues the run) is held to the same limits
const h = grab('docs/HANDOFF.md'), hbad = [...h].filter(c => c.charCodeAt(0) > 127);
if (h.length >= 4000) { console.error(`goal-sync: the handoff's prompt is ${h.length} characters (the limit is 4,000)`); process.exit(1); }
if (hbad.length) { console.error('goal-sync: the handoff\'s prompt has non-ASCII characters: ' + [...new Set(hbad)].join(' ')); process.exit(1); }
console.log(`goal-sync: the prompt is ${a.length} characters, identical in both files; the handoff's is ${h.length}`);

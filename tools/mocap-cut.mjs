// GTM's cut of the mocap clips (PLAN.md 6.2: "mocap/{readable,mocap}.js plus our cut clip set"): the few clips the
// game plays, copied key for key from the vendored libraries by the engine's own tools/anim-set.mjs, into
// vendor/my-3d2dge/mocap/sets/gtm.js, and its hash recorded in VERSION.json (vendor-check verifies it like any vendored
// file). The vendored tool expects the upstream layout (src/mocap/readable.js), so it runs from a scratch copy laid out
// that way; nothing else in vendor/ changes.
//   node tools/mocap-cut.mjs           write the set and record its hash
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { ROOT } from './build.mjs';

/** the clips GTM plays: the crowd's idles (PedBrain IDLES), the paramedics' kneel, the cower */
export const CLIPS = ['QUATERNIUS:Idle_TalkingPhone_Loop', 'QUATERNIUS:Idle_Talking_Loop', 'QUATERNIUS:Idle_FoldArms_Loop', 'QUATERNIUS:Sitting_Idle_Loop',
  'QUATERNIUS:Dance_Loop', 'QUATERNIUS:Fixing_Kneeling', 'Help_Two_Arms', 'Help_One_Arm'];
const V = join(ROOT, 'vendor/my-3d2dge'), OUT = 'mocap/sets/gtm.js';

const tmp = mkdtempSync(join(tmpdir(), 'gtm-mocap-'));
try {
  mkdirSync(join(tmp, 'tools')); mkdirSync(join(tmp, 'src/mocap'), { recursive: true });
  for (const f of ['anim-set.mjs', 'mocap-lib.mjs']) copyFileSync(join(V, 'tools', f), join(tmp, 'tools', f));
  copyFileSync(join(V, 'mocap/readable.js'), join(tmp, 'src/mocap/readable.js'));
  const r = spawnSync(process.execPath, [join(tmp, 'tools/anim-set.mjs'), join(V, 'mocap/sets/quaternius.js'), join(V, 'mocap/sets/mesh2motion.js'),
    '--clips', CLIPS.join(','), '--name', 'GTM', '--out', join(V, OUT),
    '--credit', 'Universal Animation Library 1 and 2 by Quaternius (quaternius.com), CC0 1.0; Mesh2Motion (CC0). Cut for GRAND THEFT MOTO by tools/mocap-cut.mjs.'], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status || 1);
} finally { rmSync(tmp, { recursive: true, force: true }); }
const version = JSON.parse(readFileSync(join(V, 'VERSION.json'), 'utf8'));
version.files[OUT] = { from: 'mocap/sets/quaternius.js + mocap/sets/mesh2motion.js (GTM\'s cut: tools/mocap-cut.mjs)', sha256: createHash('sha256').update(readFileSync(join(V, OUT))).digest('hex') };
writeFileSync(join(V, 'VERSION.json'), JSON.stringify(version, null, 2) + '\n');
console.log(`mocap-cut: ${CLIPS.length} clips -> vendor/my-3d2dge/${OUT}, recorded in VERSION.json`);

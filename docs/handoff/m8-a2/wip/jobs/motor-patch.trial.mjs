// applies (or reverts with --revert) the MOTOR patches proposed in motorRequests, for a local trial only
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
const ROOT = '/home/user/gta25-cco55-my-3d2dge/.claude/worktrees/wf_adf1e557-539-5/';
const BAK = '/tmp/claude-0/-home-user-gta25-cco55-my-3d2dge/6d81a67c-9c5a-5aae-be2e-a310b60973ab/scratchpad/a2/jobs/bak/';
const PATCHES = {
  'src/motor/mission/actors.js': [
    // a race's (and a route's) checkpoint counted at its height, and the GPS asked for the goal's height (a deck's)
    ["if (Math.hypot(c[0] - v.x, c[1] - v.y) < 48) { D.cp++;", "if (within(c, v.x, v.y, v.z, 48)) { D.cp++;"],
    ["if (c && Math.hypot(c[0] - v.x, c[1] - v.y) < 40) { D.cp++;", "if (c && within(c, v.x, v.y, v.z, 40)) { D.cp++;"],
    ["goal = [t.x, t.y]; }", "goal = [t.x, t.y, t.z || 0]; }"],
    ["roads.gps.routeTo(v.x, v.y, v.heading, goal[0], goal[1], { z: v.z });", "roads.gps.routeTo(v.x, v.y, v.heading, goal[0], goal[1], { z: v.z, tz: goal[2] || 0 });"],
  ],
  'src/motor/combat/combat.js': [
    // a body seated in a vehicle doesn't catch from the fire on the street under it
    ["for (const b of bodies) { const h = this.fire.heatAt(b.x, b.y); if (h > .5 && b.z < 8 && b.ignite) b.ignite(2.5); }", "for (const b of bodies) { if (b.seat) continue; const h = this.fire.heatAt(b.x, b.y); if (h > .5 && b.z < 8 && b.ignite) b.ignite(2.5); }"],
  ],
};
const revert = process.argv.includes('--revert');
for (const [f, list] of Object.entries(PATCHES)) {
  const path = ROOT + f, bak = BAK + f.replace(/\//g, '_');
  if (revert) { if (existsSync(bak)) { copyFileSync(bak, path); console.log('reverted', f); } continue; }
  let src = readFileSync(path, 'utf8'); if (!existsSync(bak)) { (await import('node:fs')).mkdirSync(BAK, { recursive: true }); copyFileSync(path, bak); }
  for (const [a, b] of list) { if (!src.includes(a)) { console.log('MISSING in', f, ':', a); continue; } src = src.replace(a, b); }
  writeFileSync(path, src); console.log('patched', f);
}

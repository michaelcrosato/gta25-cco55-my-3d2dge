// Filmstrips of the city's reactions (PLAN.md 8.10's Accept: "each reaction can be seen in a filmstrip, with a
// verdict"): each scenario sets the scene in Lowtown with the console handle, then the engine's own filmstrip tool
// (vendor/my-3d2dge/tools/filmstrip.mjs) records it in virtual time (--seed: the same frames on any machine) into a
// contact sheet. The verdicts are written in PROGRESS.md from looking at the sheets.
// A step `until:<condition>|<max s>` waits for something that takes its own time (a unit to arrive): the scenario is run
// headless first, the same simulation as the page's, to find how long, and the step becomes that wait.
//   node tools/reaction-strips.mjs [--only flee,medic] [--out docs/media/m5]
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import vm from 'node:vm';
import { loadGame } from '../tests/harness.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = resolve(arg('out', 'docs/media/m5')), only = arg('only', '').split(',').filter(Boolean);
// (the console handle's helpers, in the page: H the handle, P the possessed ped, C the crowd, the nearest crowd peds)
const pre = "const H = window.__gtm, P = H.crew.ped, C = H.life.crowd, near = (n, f = () => true) => C.members.filter(m => !m.ped.dead && f(m)).sort((a, b) => Math.hypot(a.ped.x - P.x, a.ped.y - P.y) - Math.hypot(b.ped.x - P.x, b.ped.y - P.y)).slice(0, n);";
const S = {
  // (the six nearest lined up on the sidewalk in front of the possessed one, each in another idle)
  idles: { at: '#play/greasy-spoke', q: 'time=day&weather=clear', steps: ['wait:2500', `eval:${pre} const k = ['phone', 'chat', 'dance', 'smoke', 'text', 'cab']; near(6).forEach((m, i) => { m.ped.place(P.x - 44 + i * 18, P.y + 22); m.brain.state = 'idle'; m.brain._idle(k[i], 30); m.ped.mover.facing = Math.PI / 2; })`, 'wait:800', 'rec:12:8', 'wait:2000'] },
  bench: { at: '#play/greasy-spoke', q: 'time=day&weather=clear', steps: ['wait:2500', `eval:${pre} const b = C.spots.filter(s => s.kind === 'bench').sort((a, c) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(c.x - P.x, c.y - P.y))[0]; P.place(b.x + 30, b.y + 10); const m = near(1)[0]; m.ped.place(b.x, b.y); m.ped.mover.facing = Math.atan2(b.face.y - b.y, b.face.x - b.x); m.brain.state = 'idle'; m.brain._idle('bench', 30); m.brain.face = b.face`, 'wait:900', 'rec:12:8', 'wait:2000'] },
  // (six peds along the sidewalk either side of the possessed one, then a shot: they scatter away from it)
  flee: { at: '#play/greasy-spoke', q: 'time=day&weather=clear', steps: ['wait:2500', `eval:${pre} near(6).forEach((m, i) => { m.ped.place(P.x + (i < 3 ? -1 : 1) * (26 + (i % 3) * 16), P.y + 16 + (i % 2) * 8); m.brain.feet = !m.brain.rejoin(); })`, 'wait:300', 'rec:12:5', 'wait:150', `eval:${pre} H.BUS.emit('crime', { type: 'shooting', x: P.x, y: P.y, by: P.id, victim: null, severity: 1 })`, 'wait:1200'] },
  cower: { at: '#play/greasy-spoke', q: 'time=day&weather=clear', steps: ['wait:2500', `eval:${pre} near(3).forEach((m, i) => { m.ped.place(P.x - 30 + i * 30, P.y + 24); m.brain.feet = !m.brain.rejoin(); m.brain.react('cower', { by: P }); })`, 'rec:12:8', 'wait:2000'] },
  fight: { at: '#play/greasy-spoke', q: 'time=day&weather=clear', steps: ['wait:2500', `eval:${pre} const m = near(1)[0]; m.ped.place(P.x + 34, P.y + 20); m.brain.traits.tough = 1; H.combat.hurt(m.ped, { amount: 5, kind: 'melee', by: P.id, dir: [1, 0] })`, 'rec:12:8', 'wait:2000'] },
  knockdown: { at: '#play/greasy-spoke', q: 'time=day&weather=clear', steps: ['wait:2500', `eval:${pre} near(2).forEach((m, i) => { m.ped.place(P.x - 20 + i * 40, P.y + 22); m.brain.feet = !m.brain.rejoin(); })`, 'wait:200', 'rec:12:6', 'wait:100', `eval:${pre} near(2).forEach(m => H.combat.hurt(m.ped, { amount: 10, kind: 'melee', by: null, knock: 220, knockdown: true, dir: [1, .3] }))`, 'wait:1800'] },
  witness: { at: '#play/greasy-spoke', q: 'time=day&weather=clear', steps: ['wait:2500', `eval:${pre} near(4).forEach((m, i) => { m.ped.place(P.x - 60 + i * 40, P.y + 22); m.brain.traits.phone = 1; m.brain.traits.brave = 1; m.brain.feet = !m.brain.rejoin(); })`, 'wait:200', `eval:${pre} H.BUS.emit('crime', { type: 'assault', x: P.x, y: P.y, by: P.id, victim: null, severity: 1 })`, 'rec:12:12', 'wait:3000'] },
  police: { at: '#play/greasy-spoke', q: 'time=day&weather=clear', steps: ['wait:2500', `eval:${pre} H.life.services.call('police', P.x + 30, P.y, {})`, "until:H.life.services.calls.some(c => c.kind === 'police' && c.state === 'scene')|60", 'wait:2500', 'rec:12:20', 'wait:5000'] },
  // (a body: the Medic comes in about half a minute; as its paramedics reach it and kneel, the possessed one is put on
  // the same sidewalk line a little way along, and the passers-by round it are cleared for the shot, so the paramedics
  // show: the corner is busy at noon)
  medic: { at: '#play/greasy-spoke', q: 'time=day&weather=clear', scale: 4, crop: '112,80,150,84', steps: ['wait:2500', `eval:${pre} const m = near(1)[0]; H.combat.hurt(m.ped, { amount: 999, kind: 'bullet', by: null })`, "until:H.life.services.onFoot.some(f => f.task === 'work' && f.ped.clip === 'Fixing_Kneeling')|90",
    `eval:${pre} const c = H.life.services.calls.find(c => c.kind === 'medic'), b = c && c.target && c.target.ped, S = H.life.walks, n = b && S.nearestEdge(b.x, b.y, 80); if (n) { const [x, y] = S.along(n.e, Math.min(n.e.len, n.d + 26), 0); P.place(x, y); for (const q of C.members.filter(q => q !== c.target && !q.deadT && Math.hypot(q.ped.x - b.x, q.ped.y - b.y) < 110)) C._drop(q); }`, 'wait:300', 'rec:12:15', 'wait:4000'] },
  // (petrol alight in the street and the Pumper called to it; as it pulls up, the possessed one is put beside it, clear of
  // its jet, to frame it)
  // (the possessed one is given the health to stand in a burning street for the shot: the crowd's burning runners spread
  // the fire about)
  pumper: { at: '#play/greasy-spoke', q: 'time=day&weather=clear', crop: '90,45,300,180', scale: 2, steps: ['wait:2500', `eval:${pre} const x = P.x - 60, y = P.y + 40; H.combat.fire.add(x, y, 16, 1, 30, .5); H.life.services.call('fire', x, y); P.place(P.x + 40, P.y); P.vitals.maxHealth = P.vitals.health = 5000`, "until:H.life.services.calls.some(c => c.kind === 'fire' && c.state === 'scene')|60",
    `eval:${pre} const c = H.life.services.calls.find(c => c.kind === 'fire'), v = c && c.unit && c.unit.v; if (v) P.place(v.x + 10, v.y - 75)`, 'wait:500', 'rec:12:12', 'wait:3000'] },
  mimes: { at: '#play/palm-park', q: 'time=day&weather=clear', crop: '120,55,240,160', scale: 2, steps: ['wait:2000', `eval:${pre} const t = C.troupes[0], L = t.members[2].ped; P.place(L.x + 40, L.y + 40)`, 'wait:900', 'rec:12:10', 'wait:2500'] },
  mimesAttack: { at: '#play/palm-park', q: 'time=day&weather=clear', steps: ['wait:2000', `eval:${pre} const t = C.troupes[0], L = t.members[2].ped; P.place(L.x + 30, L.y + 20)`, 'wait:900', `eval:${pre} const L = C.troupes[0].members[2].ped; H.combat.hurt(L, { amount: 5, kind: 'melee', by: P.id, dir: [1, 0] })`, 'rec:12:8', 'wait:2200'] },
  // (dusk in the rain: three of the crowd under the café's awning beside the possessed one, the rest gone home)
  rain: { at: '#play/greasy-spoke', q: 'time=dusk&weather=rain', steps: ['wait:6000', `eval:${pre} near(3).forEach((m, i) => { m.ped.place(P.x - 40 + i * 26 + (i > 0 ? 26 : 0), P.y + 3); m.brain.state = 'idle'; m.brain._idle('shelter', 30); m.ped.mover.facing = Math.PI / 2; })`, 'wait:600', 'rec:12:10', 'wait:2400'] },
};
// the until: steps as waits: the steps run headless (the page's simulation, step for step) to time each condition
async function timed(sc) {
  if (!sc.steps.some(x => x.startsWith('until:'))) return sc.steps;
  const query = Object.fromEntries(new URLSearchParams(sc.q)), { ctx, game } = await loadGame({ hash: sc.at, query });
  ctx.window = ctx; const run = code => vm.runInContext(code, ctx);
  return sc.steps.map(x => {
    if (x.startsWith('wait:')) game.advance(+x.slice(5) / 1000);
    else if (x.startsWith('eval:')) run('{ ' + x.slice(5) + ' }');   // (a block: each eval's consts its own, as in the page)
    else if (x.startsWith('until:')) {
      const [cond, max] = x.slice(6).split('|'); let n = 0;
      while (!run(`(() => { ${pre} return (${cond}); })()`) && n < +max * 60) { game.advance(1 / 60); n++; }
      if (n >= +max * 60) throw new Error(`until: never: ${cond}`);
      return 'wait:' + Math.round(n * 1000 / 60);
    }
    return x;
  });
}
mkdirSync(OUT, { recursive: true });
for (const [name, sc] of Object.entries(S)) {
  if (only.length && !only.includes(name)) continue;
  sc.steps = await timed(sc);
  const page = resolve('dist/index.html') + '?' + sc.q + sc.at, out = join(OUT, 'strip-' + name + '.png');
  // (the middle of the 480x270 buffer, round the possessed protagonist, at three times: a ped reads at that size; a
  // scene with a vehicle in it wider, at two)
  const r = spawnSync(process.execPath, ['vendor/my-3d2dge/tools/filmstrip.mjs', page, '--steps', sc.steps.join(' | '), '--out', out, '--cols', '4', '--scale', String(sc.scale || 3), '--crop', sc.crop || '150,70,180,104', '--seed', '1'], { stdio: 'inherit', env: { ...process.env, CHROMIUM_PATH: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' } });
  console.log((r.status === 0 ? 'wrote ' : 'FAILED ') + out);
}

// Filmstrips of the city's reactions (PLAN.md 8.10's Accept: "each reaction can be seen in a filmstrip, with a
// verdict"; M6 adds the police's and the gangs', 8.13 and 8.14): each scenario sets the scene in Lowtown with the
// console handle, then the engine's own filmstrip tool
// (vendor/my-3d2dge/tools/filmstrip.mjs) records it in virtual time (--seed: the same frames on any machine) into a
// contact sheet. The verdicts are written in PROGRESS.md from looking at the sheets.
// A step `until:<condition>|<max s>` waits for something that takes its own time (a unit to arrive): the scenario is run
// headless first, the same simulation as the page's, to find how long, and the step becomes that wait.
//   node tools/reaction-strips.mjs [--only flee,medic] [--out docs/media/m5]   ·   --set m6 [--out docs/media/m6]
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import vm from 'node:vm';
import { loadGame } from '../tests/harness.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = resolve(arg('out', 'docs/media/m5')), only = arg('only', '').split(',').filter(Boolean);
// (the console handle's helpers, in the page: H the handle, P the possessed ped, C the crowd, the nearest crowd peds)
const pre = "const H = window.__gtm, P = H.crew.ped, C = H.life.crowd, near = (n, f = () => true) => C.members.filter(m => !m.ped.dead && f(m)).sort((a, b) => Math.hypot(a.ped.x - P.x, a.ped.y - P.y) - Math.hypot(b.ped.x - P.x, b.ped.y - P.y)).slice(0, n);"
  // (M6: the wanted level, the police, the gangs; an officer put down at (x, y) facing the player; gang members on the
  // sidewalk points d off; nobody else within r)
  + " const W = H.life.wanted, Pol = H.life.police, G = H.life.gangs, M = H.motor, cop = (x, y, a = 'mpd') => { const p = Pol._newCop(M.get('peds', a), x, y, 0); p.mover.facing = Math.atan2(P.y - y, P.x - x); return Pol._addCop(p, {}); },"
  + " gang = (g, n, d, at = P) => C.group({ n, arch: [M.get('gangs', g).peds.grunt, M.get('gangs', g).peds.enforcer], rIn: 0, where: q => Math.abs(Math.hypot(q.x - at.x, q.y - at.y) - d) < 30, tag: p => { p.gang = g; } }),"
  + " clear = r => { for (const m of [...C.members]) if (Math.hypot(m.ped.x - P.x, m.ped.y - P.y) < r) C._drop(m); };";
const M6 = {
  // (1 star: an officer runs up and cuffs the possessed one standing there unarmed: the bust camera, NABBED)
  cuffed: { at: '#play/greasy-spoke', q: 'time=day&weather=clear', steps: ['wait:2500', `eval:${pre} clear(200); P.inv.select('fists'); W.set(1); cop(P.x + 70, P.y + 10)`, 'rec:12:12', 'wait:3000'] },
  // (in a stopped car: an officer at the driver's door a moment and a half)
  door: { at: '#play/greasy-spoke', q: 'time=day&weather=clear', scale: 2, crop: '120,60,240,150', steps: ['wait:2500', `eval:${pre} clear(200); const v = H.fleet.spawn('cortez', P.x + 30, P.y + 30, 0); v.sit(P, 0); W.set(1); cop(v.x + 80, v.y + 40)`, 'rec:12:25', 'wait:6000'] },
  // (2 stars: officers who shoot, in bursts from where they stand, round the car in the line of fire)
  shootout: { at: '#play/greasy-spoke', q: 'time=day&weather=clear', scale: 2, crop: '104,30,300,200', steps: ['wait:2500', `eval:${pre} clear(200); P.vitals.maxHealth = P.vitals.health = 5000; W.set(2); cop(P.x + 90, P.y + 30); cop(P.x + 60, P.y + 112)`, 'rec:12:8', 'wait:2000'] },
  // (3 stars at night: the MPD Eye over the possessed one, its searchlight on them)
  eye: { at: '#play/greasy-spoke', q: 'time=night&weather=clear', scale: 2, crop: '120,0,300,240', steps: ['wait:2500', `eval:${pre} P.vitals.maxHealth = P.vitals.health = 5000; W.set(3)`, "until:Pol.heli && Math.hypot(Pol.heli.v.x - P.x, Pol.heli.v.y - P.y) < 160|40", 'rec:12:10', 'wait:2500'] },
  // (a roadblock and a spike strip put across the street in front of the possessed one; a car sent over the strip)
  roadblock: { at: '#play/greasy-spoke', q: 'time=day&weather=clear', scale: 2, crop: '104,30,300,200', steps: ['wait:2500', `eval:${pre} clear(250); P.vitals.maxHealth = P.vitals.health = 5000; const G0 = H.life.graph, n = G0.nearestLane(P.x + 60, P.y, null, 0, 200), l = n.lane, p0 = G0.pointOn(l, Math.min(l.len - 10, n.s + 40)), p1 = G0.pointOn(l, Math.max(10, n.s - 60)); W.set(3); Pol._roadblock(null, { lane: l, p: p0 }); Pol._spikeStrip(null, { lane: l, p: p1 }); const v = H.fleet.spawn('cortez', p1[0] - l.dir[0] * 110, p1[1] - l.dir[1] * 110, Math.atan2(l.dir[1], l.dir[0])); v.body.setVelocity(l.dir[0] * 140, l.dir[1] * 140)`, 'rec:12:8', 'wait:2000'] },
  // (the Saints hostile at -20: the possessed one crossing a Neon street, two of them on its west sidewalk come for it;
  // the traffic cleared)
  hostile: { at: '#play/greasy-spoke', q: 'time=day&weather=clear', scale: 2, crop: '104,10,290,170', steps: ['wait:2500', `eval:${pre} H.teleport(128.5 * 16, 41.5 * 16)`, 'wait:1500', `eval:${pre} clear(300); for (const q of [...H.fleet.vehicles]) if (q.traffic && Math.hypot(q.x - P.x, q.y - P.y) < 300) H.fleet.remove(q); P.vitals.maxHealth = P.vitals.health = 5000; G.respect.saints = -20; const g = M.get('gangs', 'saints'); C.group({ n: 2, arch: [g.peds.grunt, g.peds.enforcer], rIn: 0, where: q => q.x < P.x - 40 && Math.abs(Math.hypot(q.x - P.x, q.y - P.y) - 75) < 25, tag: p => { p.gang = 'saints'; } })`, 'wait:800', 'rec:12:10', 'wait:2500'] },
  // (three Saints and three Rats met at the Neon / Harbor line: a turf war; the possessed one looks on from the corner)
  turfwar: { at: '#play/greasy-spoke', q: 'time=day&weather=clear', scale: 2, crop: '104,45,300,198', steps: ['wait:2500', `eval:${pre} H.teleport(150.5 * 16 - 110, 76.5 * 16 - 10)`, 'wait:1500', `eval:${pre} clear(400); P.vitals.maxHealth = P.vitals.health = 5000; const w = { x: 150.5 * 16, y: 76.5 * 16 }; for (const q of [...H.fleet.vehicles]) if (q.traffic && Math.hypot(q.x - w.x, q.y - w.y) < 300) H.fleet.remove(q); gang('saints', 3, 30, { x: w.x - 30, y: w.y - 80 }); gang('rats', 3, 30, { x: w.x + 30, y: w.y + 80 }); G._war('saints', 'rats', w.x, w.y)`, 'rec:12:12', 'wait:3000'] },
  // (Spray & Pray: 2 stars, nobody looking, the car driven in comes out another colour, the stars gone)
  respray: { at: '#play/spray-pray', q: 'time=day&weather=clear', scale: 2, crop: '104,20,326,200', steps: ['wait:2500', `eval:${pre} const s = H.city.poi('spray-pray'); for (const q of [...H.fleet.vehicles]) if (q.traffic && Math.hypot(q.x - s.x, q.y - s.y) < 220) H.fleet.remove(q); const v = H.fleet.spawn('cortez', s.x + 60, s.y + 12, Math.PI); v.sit(P, 0); W.set(2)`, 'wait:800', 'rec:12:8', 'wait:300', `eval:${pre} const v = P.seat.vehicle; v.body.setVelocity(-45, 0)`, 'wait:2500'] },
  // (WRECKED: dead at 3 stars: the card, then the hospital)
  wrecked: { at: '#play/greasy-spoke', q: 'time=day&weather=clear', steps: ['wait:2500', `eval:${pre} W.set(3); H.combat.hurt(P, { amount: 9999, kind: 'bullet', by: null })`, 'rec:12:24', 'wait:5000'] },
  // (the lineup: the gangs' grunts and enforcers, then an officer, a SWAT trooper and a Fed, on the sidewalk)
  lineup: { at: '#play/greasy-spoke', q: 'time=day&weather=clear', scale: 3, crop: '222,105,190,110', steps: ['wait:2500', `eval:${pre} clear(200); const ids = ['saint-grunt', 'saint-enforcer', 'rat-grunt', 'rat-enforcer', 'gnome-grunt', 'gnome-enforcer', 'mpd', 'swat', 'fed']; ids.forEach((id, i) => { const p = Pol._newCop(M.get('peds', id), P.x + 30 + i * 17, P.y + 4, 0); p.faction = 'none'; p.mover.facing = Math.PI * .75; p.lazyRig = true; Pol.cops.push({ ped: p, brain: { update: () => ({ move: [0, 0], aim: null, aimPoint: null, down: {}, tap: {} }), seat: 0 }, unit: null, block: { lineup: true }, mind: new M.E.Suspicion(), sees: false, deadT: 0 }); })`, 'wait:500', 'rec:4:20'] },
};
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
for (const [name, sc] of Object.entries(arg('set', '') === 'm6' ? M6 : S)) {
  if (only.length && !only.includes(name)) continue;
  sc.steps = await timed(sc);
  const page = resolve('dist/index.html') + '?' + sc.q + sc.at, out = join(OUT, 'strip-' + name + '.png');
  // (the middle of the 480x270 buffer, round the possessed protagonist, at three times: a ped reads at that size; a
  // scene with a vehicle in it wider, at two)
  const r = spawnSync(process.execPath, ['vendor/my-3d2dge/tools/filmstrip.mjs', page, '--steps', sc.steps.join(' | '), '--out', out, '--cols', '4', '--scale', String(sc.scale || 3), '--crop', sc.crop || '150,70,180,104', '--seed', '1'], { stdio: 'inherit', env: { ...process.env, CHROMIUM_PATH: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' } });
  console.log((r.status === 0 ? 'wrote ' : 'FAILED ') + out);
}

// MOTOR combat pieces that are pure logic: vitals (health, armour, regeneration, knockdown), weapon specs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engineGlobal } from '../harness.mjs';

engineGlobal();
const { Vitals } = await import('../../src/motor/combat/vitals.js');
const { sustainedDps } = await import('../../src/motor/combat/weapons.js');

test('vitals: armour soaks most of a hit first; a hard hit knocks down; health creeps back to half out of combat', () => {
  const v = new Vitals({ armor: 50 });
  const r = v.hit({ amount: 20, kind: 'bullet', by: 7 });
  assert.equal(r.armor, 16); assert.equal(r.health, 4); assert.equal(v.armor, 34); assert.equal(v.health, 96); assert.equal(v.lastBy, 7);
  assert.ok(!r.down);
  v.armor = 0; const k = v.hit({ amount: 40, kind: 'melee' }); assert.ok(k.down && v.down > 0 && !v.able, 'knocked down');
  for (let t = 0; t < 1.2; t += 1 / 60) v.update(1 / 60); assert.ok(v.able, 'up again');
  v.health = 20; v.sinceHit = 0; for (let t = 0; t < 4; t += 1 / 60) v.update(1 / 60); assert.equal(v.health, 20, 'no regeneration in combat');
  for (let t = 0; t < 10; t += 1 / 60) v.update(1 / 60); assert.equal(v.health, 50, 'back to half, no more');
  const d = new Vitals({ health: 10 }); assert.ok(d.hit({ amount: 15 }).killed && d.dead && !d.able);
});
test('weapons: the sustained DPS counts the reloads', () => {
  assert.equal(sustainedDps({ damage: 10, rate: 2 }), 20);
  assert.equal(sustainedDps({ damage: 10, rate: 2, mag: 4, reload: 2 }), 10, '4 shots in 2 s, then 2 s of reload');
  assert.equal(sustainedDps({ damage: 9, pellets: 8, rate: 1, mag: 1, reload: 0 }), 72);
});

const { pickLock, flickLock, assist, shotFrom, Aimer, CHEST } = await import('../../src/motor/combat/aim.js');
const { Shots } = await import('../../src/motor/combat/shots.js');
const { Explosives } = await import('../../src/motor/combat/explosives.js');
const { Inventory } = await import('../../src/motor/combat/inventory.js');
const { Stats } = await import('../../src/motor/combat/stats.js');
const { Ability } = await import('../../src/motor/combat/abilities.js');
const { Pickups } = await import('../../src/motor/combat/pickups.js');
const { Fire } = await import('../../src/motor/sim/fire.js');
const { RNG } = await import('../../src/motor/core/rng.js');
await import('../../src/game/weapons/arsenal.js');
const E = globalThis.My3D2dge;
const flat = (x, y, z) => [x, y - z];   // (a test projector: top-down, height up the screen)

test('lock-on: the nearest target in the 70-degree screen cone, threats first; a flick moves to the next one that way', () => {
  const me = { x: 0, y: 0, z: 0 }, a = { x: 100, y: 10, z: 0 }, b = { x: 60, y: -30, z: 0 }, behind = { x: -40, y: 0, z: 0 }, wide = { x: 30, y: 90, z: 0 }, dead = { x: 20, y: 0, z: 0, dead: true };
  const o = { toScreen: flat, range: 400 }, all = [a, b, behind, wide, dead];
  assert.equal(pickLock(me, [1, 0], all, o), b, 'the nearest in the cone (the dead and the one behind are skipped)');
  assert.equal(pickLock(me, [1, 0], all, { ...o, threat: c => c === a }), a, 'a threat comes first');
  assert.equal(pickLock(me, [0, 1], all, o), wide, 'aimed down the screen, the one down there');
  assert.equal(pickLock(me, [1, 0], all, { ...o, los: (s, c) => c !== b }), a, 'out of sight is out of reach');
  assert.equal(flickLock(me, b, [0, 1], all, o), a, 'from b, a flick down the screen goes to a');
  assert.equal(flickLock(me, a, [0, -1], all, o), b, 'and back up to b');
  assert.equal(flickLock(me, a, [1, 0], all, o), null, 'nothing further right');
});

test('aim assist: off leaves the aim alone; standard pulls it most of the way to a target near the aim', () => {
  const me = { x: 0, y: 0, z: 0 }, t = { x: 200, y: 30, z: 0 }, dir = [1, 0];
  assert.deepEqual(assist(me, dir, [t], { toScreen: flat, level: 'off', range: 400 }).dir, dir);
  const h = assist(me, dir, [t], { toScreen: flat, level: 'standard', range: 400 });
  assert.equal(h.target, t); const ang = Math.atan2(h.dir[1], h.dir[0]), full = Math.atan2(30, 200);
  assert.ok(ang > full * .6 && ang <= full + 1e-9, `pulled toward it: ${ang.toFixed(3)} of ${full.toFixed(3)}`);
  assert.equal(assist(me, [0, 1], [t], { toScreen: flat, level: 'standard', range: 400 }).target, null, 'too far off the aim: no help');
  const d = shotFrom({ x: 0, y: 0, z: 64 }, [1, 0], [100, 0, CHEST]); assert.ok(d[2] < -.5 && Math.abs(Math.hypot(...d) - 1) < 1e-9, 'from a roof, pitched down at the street');
  const aim = new Aimer(); aim.update(1 / 60, { held: true, dir: [1, 0], shooter: me, candidates: [t], toScreen: flat, range: 400 });
  assert.equal(aim.target, t); aim.update(1 / 60, { held: false, dir: [1, 0], shooter: me, candidates: [t], toScreen: flat, range: 400, level: 'off' }); assert.equal(aim.target, null, 'let go: unlocked');
});

// a small walled yard: a 48-high building in the middle (cells 4..5) and open street round it
const yard = () => { const m = new E.TileMap({ w: 12, h: 12, types: { 1: { h: 48 } } }); for (const [cx, cy] of [[4, 4], [5, 4], [4, 5], [5, 5]]) m.set(cx, cy, 1); return m; };
const run = (shots, w, s = 1) => { for (let t = 0; t < s; t += 1 / 120) shots.update(1 / 120, w); };

test('shots are z-aware: a level street shot passes under a roof sniper and hits the street; from the roof, pitched, it hits the street', () => {
  const map = yard(), street = { id: 1, x: 150, y: 80, z: 0, r: 6, h: 34 }, roof = { id: 2, x: 80, y: 80, z: 48, r: 6, h: 34 }, hits = [];
  const w = { map, bodies: [street, roof], onHit: (b, t) => hits.push(t.id), onWall: () => hits.push('wall') };
  // from the street west of the building, level at chest height: the wall stops it (the building is in the way)
  const s = new Shots(null); s.fire({ x: 20, y: 80, z: CHEST, dir: [1, 0, 0], speed: 1000, range: 400, by: 9 }); run(s, w, .5);
  assert.deepEqual(hits, ['wall'], 'the building stops a street shot');
  // over the street east of the building, level at chest height, the roof sniper is 48 up: it flies under them to the street target
  hits.length = 0; s.fire({ x: 100, y: 80, z: CHEST, dir: [1, 0, 0], speed: 1000, range: 400, by: 9 }); run(s, w, .5);
  assert.deepEqual(hits, [1], 'hits the street target');
  // the roof sniper fires level from the roof: it flies over the street target's head
  hits.length = 0; s.fire({ x: 85, y: 80, z: 48 + CHEST, dir: [1, 0, 0], speed: 1000, range: 90, by: 2 }); run(s, w, .5);
  assert.deepEqual(hits, [], 'a level shot from the roof flies over the street (and ends at its range, short of the map\'s edge)');
  // the same sniper, pitched down at the target's chest (lock-on): a hit
  hits.length = 0; s.fire({ x: 85, y: 80, z: 48 + CHEST, dir: shotFrom({ x: 85, y: 80, z: 48 }, [1, 0], [150, 80, CHEST]), speed: 1000, range: 400, by: 2 }); run(s, w, .5);
  assert.deepEqual(hits, [1], 'pitched down from the roof edge, it hits the street target');
  // a box (a car): an oriented box across the line
  hits.length = 0; const car = { id: 3, x: 140, y: 140, z: 0, hl: 20, hw: 9, height: 16, heading: .3 };
  s.fire({ x: 60 + 40, y: 140, z: 10, dir: [1, 0, 0], speed: 1000, range: 300, by: 9 }); run(s, { ...w, boxes: [car] }, .5);
  assert.deepEqual(hits, [3], 'a car box takes the shot');
  assert.ok(s.fired === 5 && s.hits === 3);
});

test('explosives: a grenade bounces and goes off on its fuse; a rocket bursts on the wall; a blast sets off a barrel in reach (a chain)', () => {
  const map = yard(), hurt = [], blown = [];
  const ex = new Explosives(null), body = { id: 1, x: 140, y: 100, z: 0, r: 6, h: 34 };
  const barrel = { id: 'b', x: 160, y: 100, z: 0, splash: 50, damage: 60, source: 'barrel', blow: () => blown.push('b') };
  const w = { map, bodies: [body], explosive: [barrel], hurt: (t, n, b) => hurt.push([t.id, Math.round(n), b.source]) };
  const g = ex.throw({ kind: 'grenade', x: 100, y: 100, z: 30, ...Object.fromEntries(['vx', 'vy', 'vz'].map((k, i) => [k, Explosives.aimArc([100, 100, 30], [140, 100, 0], 280)[i]])), fuse: 2.5, damage: 110, splash: 72, by: 9 });
  let bounced = false, lastVz = 0; for (let t = 0; t < 2.4; t += 1 / 120) { ex.update(1 / 120, w); if (lastVz < 0 && g.vz > 0) bounced = true; lastVz = g.vz; }
  assert.ok(bounced, 'it bounced'); assert.equal(ex.count, 0, 'not yet');
  for (let t = 0; t < .2; t += 1 / 120) ex.update(1 / 120, w);
  assert.equal(ex.count, 1, 'the fuse ran out'); assert.ok(hurt.some(h => h[0] === 1 && h[1] > 30), 'it hurt the body near it: ' + JSON.stringify(hurt));
  for (let t = 0; t < .5; t += 1 / 120) ex.update(1 / 120, w);
  assert.deepEqual(blown, ['b'], 'the barrel went off after it'); assert.equal(ex.count, 2);
  // a rocket from the west at the building
  const r = new Explosives(null); r.throw({ kind: 'rocket', x: 10, y: 80, z: CHEST, vx: 380, damage: 120, splash: 64, range: 700, by: 9 });
  let at = null; for (let t = 0; t < 1; t += 1 / 120) r.update(1 / 120, { map, onBlast: b => { at = at || b; } });
  assert.ok(at && Math.abs(at.x - 64) < 6, 'burst on the building\'s west wall at x 64: ' + (at && at.x.toFixed(1)));
});

test('a Molotov shatters where it lands and sets the ground alight with its petrol', () => {
  const map = new E.TileMap({ w: 12, h: 12 }), city = { w: 12, h: 12, T: 16, surfaceAt: () => 'road', decks: [] };
  RNG.seed(5); const fire = new Fire(city), ex = new Explosives(fire);
  const [vx, vy, vz] = Explosives.aimArc([20, 20, 30], [120, 120, 0], 260);
  ex.throw({ kind: 'molotov', x: 20, y: 20, z: 30, vx, vy, vz, damage: 18, splash: 40, burn: 6, by: 9 });
  for (let t = 0; t < 3 && !fire.count; t += 1 / 120) ex.update(1 / 120, { map, city });
  assert.ok(fire.count > 10, `it burns: ${fire.count} cells`);
  assert.ok(fire.heatAt(120, 120) > 0 || fire.heatAt(110, 110) > 0, 'near where it was thrown');
});

test('inventory: fire rates to spec, magazines and reloads; slots hold their kind; fists always', () => {
  const inv = new Inventory(['snub38', 'buzzsaw'], { snub38: 12, buzzsaw: 60 });
  assert.deepEqual(inv.list(), ['fists', 'snub38', 'buzzsaw']);
  inv.select('buzzsaw'); for (let t = 0; t < .3; t += 1 / 120) inv.trigger(1 / 120, false, false);   // (a swap takes a quarter second)
  let shots = 0; for (let t = 0; t < 1; t += 1 / 120) shots += inv.trigger(1 / 120, true, false);
  assert.ok(shots >= 10 && shots <= 12, `the Buzzsaw fires 11 a second: ${shots}`);
  for (let t = 0; t < 2; t += 1 / 120) shots += inv.trigger(1 / 120, true, false);
  assert.equal(inv.rounds().total, 60 - shots); assert.ok(inv.reloading > 0 || inv.rounds().mag < 30, 'reloads when the magazine is dry');
  inv.select('snub38'); let n = 0; for (let t = 0; t < 3; t += 1 / 120) n += inv.trigger(1 / 120, false, true);
  assert.equal(n, 6, 'a semi-automatic fires once a press, up to the magazine'); assert.ok(inv.reloading > 0, 'then reloads');
  for (let t = 0; t < 1.3; t += 1 / 120) inv.trigger(1 / 120, false, false);
  assert.deepEqual(inv.rounds(), { mag: 6, total: 6 }, 'loaded again from what is left');
  inv.give('slugger'); assert.equal(inv.give('fists'), null); assert.ok(inv.has('fists') && inv.has('slugger'), 'the bat takes the melee slot; the fists stay');
  assert.deepEqual(inv.list(), ['fists', 'slugger', 'snub38', 'buzzsaw']);
  inv.give('boomtube', 3); inv.give('hotmess', 100); assert.deepEqual(inv.inSlot('heavy'), ['boomtube', 'hotmess'], 'a slot holds all of its kind');
  assert.equal(inv.slots.heavy, 'boomtube', 'and shows the first'); inv.cycleSlot('heavy', 1); assert.equal(inv.slots.heavy, 'hotmess');
  assert.ok(inv.select('boomtube') && inv.current === 'boomtube' && inv.slots.heavy === 'boomtube');
  assert.equal(new Inventory(['buzzsaw']).give('buzzsaw', 30), null, 'more of the same: ammo, nothing dropped');
});

test('stats grow by doing, slower near the top, and act on spread and sprint; abilities fill, run and stop', () => {
  const s = new Stats({ shooting: 10 }); for (let i = 0; i < 200; i++) s.did('shotHit');
  assert.ok(s.shooting > 20 && s.shooting < 40, 'shooting rose: ' + s.shooting.toFixed(1));
  const hi = new Stats({ shooting: 90 }), lo = new Stats({ shooting: 0 }); assert.ok(hi.gain('shooting', 1) < lo.gain('shooting', 1) / 3, 'gains shrink near 100');
  assert.ok(hi.spread() < lo.spread() && new Stats({ stamina: 100 }).sprintTime() === 12 && new Stats().sprintTime() === 4 && new Stats().melee() === 1, 'at the starting 10 every effect is its base');
  assert.deepEqual(Object.keys(new Stats().toJSON()), ['driving', 'shooting', 'stamina', 'stealth', 'strength']);
  const od = new Ability('overdrive'); for (let i = 0; i < 100; i++) od.feed('driveFast', 1);
  assert.ok(od.meter > .9); assert.ok(od.toggle() && od.timeScale === .5 && od.handling === 1.3);
  for (let t = 0; t < 8.1; t += 1 / 60) od.update(1 / 60); assert.ok(!od.active && od.meter === 0 && od.timeScale === 1, 'eight seconds, then out');
  const dc = new Ability('deadcalm', 1); dc.toggle(); dc.update(1 / 60, { aiming: false }); assert.equal(dc.timeScale, 1, 'DEAD CALM waits for the aim');
  dc.update(1 / 60, { aiming: true }); assert.ok(dc.timeScale === .35 && dc.spread < 1 && dc.damage > 1 && dc.meter < 1);
  const rm = new Ability('redmist', 1); rm.toggle(); rm.update(1 / 60); assert.ok(rm.damageTaken === .5 && rm.knockback === 2);
});

test('pickups: taken when used, back after the respawn; a dropped one goes for good', () => {
  const P = new Pickups(), me = { x: 0, y: 0, z: 0, health: 100 };
  P.place({ kind: 'health', amount: 25, x: 4, y: 0, respawn: 30 }); P.drop({ kind: 'cash', amount: 40, x: 0, y: 4 });
  const got = [], take = (k, p) => { if (p.kind === 'health' && k.health >= 100) return false; got.push(p.kind); if (p.kind === 'health') k.health += p.amount; return true; };
  P.update(1 / 60, [me], take); assert.deepEqual(got, ['cash'], 'full health leaves the health');
  me.health = 50; P.update(1 / 60, [me], take); assert.deepEqual(got, ['cash', 'health']); assert.equal(P.live.length, 0);
  for (let t = 0; t < 31; t += .5) P.update(.5, [], take); assert.equal(P.live.length, 1, 'the health came back; the cash did not');
});

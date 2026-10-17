// M3's accept tests (PLAN.md 8.11, 8.12): weapons to spec on the range's bench, explosives and specials, lock-on,
// Molotov spread, z-aware hits, drive-bys, the crew's switches and vignettes, abilities in play, stats through a save,
// the movement verbs, knockdown and get-up, pickups. Headless: the engine and the bundle in node:vm, driven by Intents
// (and by keys where the scene's own controls are under test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, engineGlobal } from '../harness.mjs';

const T = 16, DT = 1 / 120;
const motor = async (hash = 'title') => { const L = await loadGame({ hash }); return { ...L, M: L.gtm.motor }; };
/** a world on the combat range: its map, a Combat (with the Fire grid on the range's surfaces) and an Intent per body */
function range(M) {
  const map = M.get('maps', 'combat-range').build(), city = { w: map.w, h: map.h, T: map.T, surfaceAt: map.surfaceAt, decks: [], map };
  M.RNG.seed(11);
  const C = new M.Combat({ map, city }), idle = M.makeIntent();
  const W = { map, combat: C, aim: { candidates: C.bodies, toScreen: (x, y, z) => [x, y - z], los: (s, c) => M.losClear(map, s, c), level: 'standard' } };
  const step = (s, drive = () => {}) => { for (let t = 0; t < s; t += DT) { drive(); for (const b of C.bodies) b.update(DT, b.intent || M.clearIntent(idle), W); C.update(DT); } };
  const ped = o => { const p = C.add(new M.Ped({ look: { build: 'heroic', style: 'classic' }, ...o })); p.intent = M.makeIntent(); return p; };
  return { map, C, W, step, ped };
}

test('the range bench: every weapon that deals damage a second deals its spec\'s DPS, within 10%', async () => {
  const { M } = await motor();
  const rows = M.all('weapons').filter(M.benchable).map(w => M.measureDps(w.id));
  assert.equal(rows.length, 6, rows.map(r => r.weapon).join(', '));
  for (const r of rows) assert.ok(r.ratio >= .9 && r.ratio <= 1.1, `${r.weapon}: ${r.dps} DPS against ${r.spec} (${(r.ratio * 100).toFixed(0)}%)`);
});

test('explosives and specials: a rocket\'s direct hit, a grenade\'s falling-off splash, the Zap-O-Matic\'s fourth zap, the Snap\'s photo', async () => {
  const { M } = await motor(), R = range(M), { step, ped } = R, y = 38 * T;
  const me = ped({ x: 6 * T, y, faction: 'crew', weapons: ['boomtube', 'pineapple', 'zapomatic', 'snap'], ammo: { boomtube: 9, pineapple: 9, zapomatic: 99 }, current: 'boomtube', facing: 0 });
  const near = ped({ x: 14 * T, y, faction: 'range', anchored: true }), far = ped({ x: 14 * T + 50, y: y + 20, faction: 'range', anchored: true });
  // one press: the tap on its first step only (a real press taps once; a tap held longer would be kept for a second shot)
  const fire = (s, weapon) => { me.inv.select(weapon); me.inv.cool = 0; step(.3); let first = true; step(s, () => { const I = me.intent; M.clearIntent(I); I.down.aim = true; I.aim = [1, 0]; I.tap.attack = first; I.down.attack = true; first = false; }); M.clearIntent(me.intent); };
  // the rocket: locked on the near dummy, it flies straight and bursts on it
  fire(1 / 60, 'boomtube'); step(1.2);
  assert.ok(near.dead, `the direct hit kills (${near.health.toFixed(0)} left)`);
  assert.ok(far.health < 100 && far.health > 0, `the splash hurts the one behind, less: ${far.health.toFixed(0)}`);
  // the grenade: thrown at a fresh dummy; damage falls off with distance from the blast
  const a = ped({ x: 16 * T, y: 34 * T, faction: 'range', anchored: true, maxHealth: 1000 }), b = ped({ x: 16 * T + 48, y: 34 * T, faction: 'range', anchored: true, maxHealth: 1000 });
  near.vitals.dead = true; far.vitals.dead = true;   // (out of the way)
  me.place(10 * T, 34 * T); M.clearIntent(me.intent);
  me.inv.select('pineapple'); me.inv.cool = 0; step(.3);
  step(1 / 60, () => { const I = me.intent; M.clearIntent(I); I.down.aim = true; I.aim = [1, 0]; I.tap.attack = true; }); M.clearIntent(me.intent);
  const blasts = []; M.BUS.on('explode', e => blasts.push(e), 'test'); step(4); M.BUS.clear('test');
  assert.equal(blasts.length, 1, 'it went off on its fuse');
  const at = blasts[0], da = Math.hypot(a.x - at.x, a.y - at.y), db = Math.hypot(b.x - at.x, b.y - at.y), [n, f] = da < db ? [a, b] : [b, a];
  assert.ok(1000 - n.health > 1000 - f.health && 1000 - n.health > 0, `nearer the blast, harder: ${(1000 - n.health).toFixed(0)} against ${(1000 - f.health).toFixed(0)} (${Math.min(da, db).toFixed(0)} and ${Math.max(da, db).toFixed(0)} units away)`);
  // the Zap-O-Matic: it stuns, and the fourth zap in a row kills
  const z = ped({ x: me.x + 70, y: me.y, faction: 'range', maxHealth: 1000 });
  for (const q of [a, b]) q.vitals.dead = true;
  me.inv.select('zapomatic'); me.inv.cool = 0; step(.3);
  for (let i = 0; i < 3; i++) { fire(1 / 60, 'zapomatic'); assert.ok(z.vitals.stun > 0 && !z.dead, 'stunned, alive after zap ' + (i + 1)); step(.3); }
  fire(1 / 60, 'zapomatic'); assert.ok(z.dead, 'the fourth zap in a row kills (the GTA2 Electrogun)');
  // the Snap: a photo of what is in front, told on the BUS
  const seen = []; M.BUS.on('photo', e => seen.push(e), 'test');
  const subject = ped({ x: me.x + 90, y: me.y, faction: 'civilian' });
  fire(1 / 60, 'snap'); M.BUS.clear('test');
  assert.equal(seen.length, 1); assert.ok(seen[0].targets.includes(subject.id), 'the photo saw the subject');
});

test('lock-on in the gallery: the press locks the nearest dummy in the cone, a threat first; a flick moves to the next one that way', async () => {
  const { M } = await motor(), { map, C, step, ped } = range(M);
  const me = ped({ x: map.galleryFrom[0], y: map.galleryFrom[1], faction: 'crew', weapons: ['snub38'], ammo: { snub38: 99 }, current: 'snub38', facing: -Math.PI / 2 });
  const fan = map.gallery.map(([x, y]) => ped({ x, y, faction: 'range' }));
  const hold = (dir, s = .1, extra = {}) => step(s, () => { const I = me.intent; M.clearIntent(I); I.down.aim = true; I.aim = dir; Object.assign(I, extra); });
  hold([0, -1]); assert.equal(me.aimer.target, fan[0], 'the nearest in the cone (80 units, 20 degrees left of the aim)');
  M.clearIntent(me.intent); step(.05); assert.equal(me.aimer.target, null, 'let go: unlocked');
  // a flick: the stick from rest past the threshold, toward the next dummy round the fan
  hold([0, -1], .05); step(.05, () => { const I = me.intent; M.clearIntent(I); I.down.aim = true; I.aim = [.55, -.83]; I.aimStick = 1; });
  assert.equal(me.aimer.target, fan[1], 'the flick to the right moved the lock to the next dummy');
  // a threat (one that has fought the shooter) comes first, though it is farther
  M.clearIntent(me.intent); step(.05);
  const pick = M.pickLock(me, [0, -1], fan, { toScreen: (x, y, z) => [x, y - z], range: 420, threat: c => c === fan[2] });
  assert.equal(pick, fan[2], 'a threat first'); assert.ok(C.bodies.includes(fan[2]));
});

test('a Molotov thrown on the lawn spreads; on the bare apron it burns its petrol and dies', async () => {
  const { M } = await motor(), { C, step, ped } = range(M);
  const me = ped({ x: 38 * T, y: 9 * T, faction: 'crew', weapons: ['partystarter'], ammo: { partystarter: 9 }, current: 'partystarter', facing: 0 });
  const throwAt = pt => { me.inv.cool = 0; step(.3); step(1 / 60, () => { const I = me.intent; M.clearIntent(I); I.aimPoint = pt; I.aim = [1, 0]; I.tap.attack = true; }); M.clearIntent(me.intent); };
  throwAt([46 * T, 9 * T, 0]); let most = 0; step(12, () => { most = Math.max(most, C.fire.count); });
  const lawn = most;
  step(60); assert.equal(C.fire.count, 0, 'and burns out');
  me.place(38 * T, 20 * T); throwAt([46 * T, 20 * T, 0]); most = 0; step(12, () => { most = Math.max(most, C.fire.count); });
  assert.ok(lawn > 60, `the lawn caught: ${lawn} cells at most`);
  assert.ok(most < lawn / 2, `the apron only burned the petrol: ${most} cells at most`);
});

test('z-aware hits: from the shed\'s roof a locked shot hits the street; a level one flies over it; the shed shields the roof from the street', async () => {
  const { M } = await motor(), { map, W, step, ped } = range(M);
  const [sx, sy] = map.roof.street, sniper = ped({ x: sx, y: 11.5 * T, z: 24, faction: 'crew', weapons: ['snub38'], ammo: { snub38: 99 }, current: 'snub38', facing: Math.PI / 2 });
  const street = ped({ x: sx, y: sy, faction: 'range', maxHealth: 1000 });
  step(.2); assert.ok(Math.abs(sniper.z - 24) < .5, `the sniper stands on the roof: z ${sniper.z.toFixed(1)}`);
  const shoot = (who, dir, lock, s = .6) => { who.inv.cool = 0; step(s, () => { const I = who.intent; M.clearIntent(I); I.down.aim = lock; I.aim = dir; I.down.attack = true; I.tap.attack = true; }); M.clearIntent(who.intent); step(.4); };
  W.aim.level = 'off'; shoot(sniper, [0, 1], false); W.aim.level = 'standard';   // (no aim assist: it would pitch the shot down at the target)
  assert.equal(street.health, 1000, 'a level shot from the roof flies over the street target\'s head');
  shoot(sniper, [0, 1], true); assert.ok(street.health < 1000, `locked on, it pitches down and hits: ${street.health.toFixed(0)}`);
  // from the street, level at the roof's dummy: the shed's wall takes it
  const top = ped({ x: map.roof.top[0], y: map.roof.top[1], z: 24, faction: 'range', maxHealth: 1000 }), gunner = ped({ x: map.roof.top[0], y: 20 * T, faction: 'crew', weapons: ['snub38'], ammo: { snub38: 99 }, current: 'snub38' });
  step(.2); shoot(gunner, [0, -1], false); assert.equal(top.health, 1000, 'the wall shields the roof from a level street shot');
});

test('drive-bys: a protagonist riding in a car hits targets off both sides, and never the car', async () => {
  const { M } = await motor(), { C, step, ped } = range(M);
  const car = M.makeBody('cortez', 8 * T, 22 * T, 0); car.id = 'car-1';
  let carHits = 0; C.boxes.push({ id: car.id, get x() { return car.x; }, get y() { return car.y; }, z: 0, get heading() { return car.heading; }, hl: car.hl, hw: car.hw, height: 20, hurt: () => { carHits++; return { health: 1, armor: 0 }; } });
  const me = ped({ x: car.x, y: car.y, faction: 'crew', weapons: ['buzzsaw'], ammo: { buzzsaw: 300 }, current: 'buzzsaw' }); me.seat = { body: car };
  // targets abeam as the car passes them: the left one in the first half second, the right in the next, a third later for the auto-target
  const left = ped({ x: 158, y: 22 * T - 70, faction: 'range', maxHealth: 1000 }), right = ped({ x: 218, y: 22 * T + 70, faction: 'range', maxHealth: 1000 });
  const third = ped({ x: 330, y: 22 * T - 60, faction: 'range', maxHealth: 1000 });
  // drive east at 120 u/s, firing at the auto-target (nearest off a side), then at each side by the stick
  const drive = extra => () => { car.x += 120 * DT; const I = me.intent; M.clearIntent(I); I.down.fire = true; I.tap.fire = true; Object.assign(I, extra); };
  me.inv.cool = 0; step(.5, drive({ aim: [0, -1] }));
  assert.ok(left.health < 1000, `the left side, by the stick: ${left.health.toFixed(0)}`);
  me.inv.cool = 0; step(.5, drive({ aim: [0, 1] }));
  assert.ok(right.health < 1000, `the right side, by the stick: ${right.health.toFixed(0)}`);
  const sum = () => left.health + right.health + third.health, before = sum(); step(1, drive({}));
  assert.ok(sum() < before, `with the stick at rest, the auto-target off a side takes the shots: ${before - sum()} damage`);
  assert.equal(carHits, 0, 'the car itself is never hit');
  assert.ok(Math.abs(me.x - car.x) < 1, 'the shooter rides along');
});

test('the crew: a switch between every pair, the camera up, across and down, and a fresh arrival\'s vignette', async () => {
  const { M } = await motor(), crew = new M.Crew(), at = { dex: [100, 100], viv: [900, 300], gus: [400, 1200] };
  for (const id of ['dex', 'viv', 'gus']) crew.add(id, new M.Ped({ x: at[id][0], y: at[id][1], faction: 'crew', character: id }));
  const vignetteAt = id => [at[id][0] + 50, at[id][1]];
  for (const [a, b] of [['dex', 'viv'], ['viv', 'gus'], ['gus', 'dex'], ['dex', 'gus'], ['gus', 'viv'], ['viv', 'dex']]) {
    assert.equal(crew.active, a);
    const r = crew.request(b, { wanted: 0, vignetteAt }, (m, fresh, p) => { if (fresh) m.ped.place(p[0], p[1]); });
    assert.ok(r.ok, `${a} -> ${b}`);
    const phases = new Set(); let H = 0, cam;
    while ((cam = crew.update(1 / 60))) { phases.add(cam.phase); H = Math.max(H, cam.H); }
    assert.deepEqual([...phases], ['up', 'pan', 'down'], `${a} -> ${b}: up, across, down`);
    assert.ok(H >= M.TUNE.switchHeight - 1, 'climbed to the switch height');
    assert.equal(crew.active, b);
    if (r.fresh) { assert.ok(crew.vignette && crew.vignette.who === b && crew.vignette.line, `${b}'s vignette plays: ${crew.vignette && crew.vignette.line}`); assert.equal(crew.member(b).ped.x, vignetteAt(b)[0], 'found at the vignette'); }
    for (let t = 0; t < 5; t += 1 / 60) crew.update(1 / 60);
    assert.equal(crew.vignette, null, 'the vignette ends');
  }
  assert.equal(crew.switches, 6);
  assert.equal(crew.canSwitch('viv', { wanted: 2 }).reason, 'wanted', 'not while wanted');
  assert.equal(crew.canSwitch('viv', { mission: { allowSwitch: false } }).reason, 'mission', 'not in a mission that forbids it');
  assert.ok(crew.canSwitch('viv', { mission: { allowSwitch: true } }).ok, 'a mission may allow it');
});

test('in play: the character wheel switches by the keys; OVERDRIVE halves time, DEAD CALM slows it only while aiming, RED MIST halves the hurt', async () => {
  const { game, gtm, input } = await loadGame({ hash: 'play' });
  game.advance(.5);
  const crew = gtm.crew; assert.equal(crew.active, 'dex');
  // hold Z for the wheel, point up (W) at Viv, let go: the switch camera flies, then Viv is played
  input.press('KeyZ'); game.advance(.3); input.press('KeyW'); game.advance(.1); input.release('KeyZ'); input.release('KeyW'); game.advance(1 / 60);
  assert.ok(crew.switching, 'the switch started');
  game.advance(4); assert.equal(crew.active, 'viv'); assert.ok(!crew.switching);
  // DEAD CALM: on, but only while aiming
  const viv = crew.ped; viv.ability.meter = 1; input.press('KeyF'); game.advance(1 / 30); input.release('KeyF'); game.advance(1 / 30);
  assert.ok(viv.ability.active); assert.equal(game.timeScale, 1, 'not while not aiming');
  input.press('Mouse2'); game.advance(.1); assert.equal(game.timeScale, .35, 'aiming: time at .35'); input.release('Mouse2'); game.advance(.05);
  // OVERDRIVE and RED MIST on the others
  const dex = crew.member('dex').ped, gus = crew.member('gus').ped;
  dex.ability.meter = 1; dex.ability.toggle(); assert.equal(dex.ability.timeScale, .5);
  gus.ability.meter = 1; gus.ability.toggle(); gus.update(1 / 60, gtm.motor.makeIntent(), {});
  const r = gus.hurt({ amount: 40, kind: 'bullet', by: 0 }); assert.equal(r.health, 20, 'RED MIST: half the hurt');
});

test('stats grow by doing and survive a save round-trip', async () => {
  const { M } = await motor();
  const p = new M.Ped({ faction: 'crew', weapons: ['snub38'], ammo: { snub38: 30 }, ability: 'overdrive' });
  for (let i = 0; i < 100; i++) p.stats.did('shotHit'); p.stats.did('sprint', 40);
  const j = p.toJSON(); assert.ok(j.stats.shooting > 15 && j.stats.stamina > 11, JSON.stringify(j.stats));
  // through the game's save store: written, read back (migrated, normalized), loaded into a new Ped
  engineGlobal(); const save = await import('../../src/game/save.js');
  {
    const S = new M.SaveStore({ game: save.GAME_ID, schema: save.SCHEMA, blank: save.blankSave, normalize: save.normalizeSave, migrations: save.MIGRATIONS, backend: M.memoryBackend() });
    const doc = save.blankSave(); doc.protagonists.dex = { ...doc.protagonists.dex, ...j, pos: j.pos };
    assert.ok(S.write('1', doc).ok); const back = S.read('1').data.protagonists.dex;
    const q = new M.Ped({ faction: 'crew', stats: back.stats, weapons: back.weapons, ammo: back.ammo });
    assert.deepEqual(q.stats.toJSON(), p.stats.toJSON(), 'the stats came back as they were');
    assert.deepEqual(q.inv.list(), p.inv.list(), 'and the weapons');
  }
});

test('on foot: sprint beats run and stops when winded; a jump climbs 24 but not 48; a low wall vaults at a run; a roll stops short; crouching sneaks', async () => {
  const { M } = await motor(), { step, ped } = range(M);
  const run = (p, dir, s, extra = {}) => step(s, () => { const I = p.intent; M.clearIntent(I); I.move[0] = dir[0]; I.move[1] = dir[1]; for (const [k, v] of Object.entries(extra)) I.down[k] = v; });
  const a = ped({ x: 4 * T, y: 34 * T, faction: 'crew' }), b = ped({ x: 4 * T, y: 36 * T, faction: 'crew' });
  step(1.2, () => { for (const [p, sp] of [[a, true], [b, false]]) { const I = p.intent; M.clearIntent(I); I.move[0] = 1; I.down.sprint = sp; } });
  assert.ok(a.x - b.x > 30, `sprinting pulls ahead: ${(a.x - b.x).toFixed(0)} units`);
  run(a, [0, 0], .2); a.place(4 * T, 34 * T); a.stamina = a.stats.sprintTime();   // (rested)
  let sprinting = 0, winded = false; step(5, () => { const I = a.intent; M.clearIntent(I); I.move[0] = 1; I.move[1] = 0; I.down.sprint = true; if (a.mover.sprinting) sprinting += DT; winded ||= a._winded; if (a.x > 46 * T) { const vx = a.mover.vx; a.place(4 * T, 34 * T); a.mover.vx = vx; } });
  assert.ok(sprinting > 3.5 && sprinting < 4.6, `the stamina lasts about its 4 seconds: ${sprinting.toFixed(2)} s`); assert.ok(winded, 'then winded: a run until it comes back');
  // the shed (24 high): a jump at its wall climbs it; the yard's wall (48 high) is past the climb limit (34)
  const c = ped({ x: 33.5 * T, y: 14 * T, faction: 'crew', facing: -Math.PI / 2 });
  run(c, [0, -1], .4);   // (up to the wall: a ledge is found within a body's reach of it)
  step(1 / 60, () => { const I = c.intent; M.clearIntent(I); I.move[1] = -1; I.tap.jump = true; }); run(c, [0, -1], 1.5);
  assert.ok(Math.abs(c.z - 24) < 1, `climbed onto the shed's roof: z ${c.z.toFixed(1)}`);
  const w = ped({ x: 2.2 * T, y: 20 * T, faction: 'crew', facing: Math.PI });
  step(.1, () => { const I = w.intent; M.clearIntent(I); I.move[0] = -1; I.tap.jump = true; }); run(w, [-1, 0], 1.2);
  assert.ok(w.z < 1, `the yard's 48-high wall is past the climb (34) and the jump: z ${w.z.toFixed(1)}`);
  // a low wall (8 high) vaulted at a run
  const v = ped({ x: 15 * T, y: 32 * T, faction: 'crew', facing: -Math.PI / 2 });
  run(v, [0, -1], .25); step(.1, () => { const I = v.intent; M.clearIntent(I); I.move[1] = -1; I.tap.jump = true; }); run(v, [0, -1], .8);
  assert.ok(v.y < 30 * T, `over the low wall: y ${(v.y / T).toFixed(1)} cells (the wall is at 30)`);
  // a roll toward a wall stops short of it
  const r = ped({ x: 3 * T, y: 26 * T, faction: 'crew', facing: Math.PI });
  step(1 / 60, () => { const I = r.intent; M.clearIntent(I); I.move[0] = -1; I.tap.roll = true; }); run(r, [0, 0], .8);
  assert.ok(r.x > T + 4, `stopped short of the wall: x ${r.x.toFixed(1)}`);
  // crouched: the sneak's pace
  const s = ped({ x: 30 * T, y: 36 * T, faction: 'crew' });
  step(DT, () => { const I = s.intent; M.clearIntent(I); I.tap.crouch = true; });   // (one step: a press is a toggle)
  const x0 = s.x; run(s, [1, 0], 1);
  assert.ok(s.crouching && s.x - x0 < 40 && s.x - x0 > 20, `sneaking: ${(s.x - x0).toFixed(0)} units in a second`);
});

test('knockdown and get-up: a hard hit floors a body, it slides with the hit, lies a moment and gets up', async () => {
  const { M } = await motor(), { step, ped } = range(M);
  const p = ped({ x: 20 * T, y: 36 * T, faction: 'range' });
  p.hurt({ amount: 40, kind: 'melee', by: 0, dir: [1, 0], knock: 160 });
  assert.ok(p.floored, 'down'); step(.4); assert.ok(p.x > 20 * T + 8, `slid with the hit: ${(p.x - 20 * T).toFixed(0)} units`);
  let up = 0; step(3, () => { if (!p.floored && !up) up = 1; });
  assert.ok(!p.floored && p.vitals.able, 'up again'); assert.ok(p.health > 0);
});

test('pickups in Lowtown: health heals a hurt protagonist, a weapon pickup puts it in hand', async () => {
  const { game, gtm } = await loadGame({ hash: 'play' }); game.advance(.2);
  const p = gtm.crew.ped, P = gtm.combat.pickups;
  const health = P.list.find(k => k.kind === 'health'), gun = P.list.find(k => k.kind === 'weapon' && k.item === 'buzzsaw');
  p.vitals.health = 40; p.place(health.x, health.y); game.advance(.1);
  assert.ok(p.health >= 89, `healed: ${p.health}`); assert.ok(health.away > 0, 'the health is away until it respawns');
  p.place(gun.x, gun.y); game.advance(.1);
  assert.ok(p.inv.has('buzzsaw'), 'the Buzzsaw is carried');
});

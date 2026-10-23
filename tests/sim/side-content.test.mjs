// The extras of the side content (PLAN.md 9.5): the 25 Moto Tokens, the five stunt jumps and the four kinds of random
// event, registered and well placed. Cheap guards only: a token where a body can stand on every city the bot plays
// (the yards' props differ from seed to seed), a stunt's takeoff that no earlier stunt's circle claims, an event that
// finds a spot near a player somewhere. That the tokens are reached on foot and the jumps made is the extras' probes'
// (an AutoPlayer walked to each token, a Zephyr driven at each jump); that each event plays out is the bot's
// (tools/bot.mjs --mission <id>, seeds 1-3 and through a pad).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../harness.mjs';

const STUNTS = ['loop-gap', 'drawbridge', 'container-ramp', 'garage-roof', 'canal'];
const EVENTS = ['event_purse_snatcher', 'event_stalled_car', 'event_gang_shootout', 'event_police_chase'];

// what's wrong with a token's spot on a city (null: a body stands there): something under it at its height (the street,
// a roof, a deck, a prop's top), nothing taller over it, and on the ground a walkable cell out of the water
function footing(C, [x, y, z = 0]) {
  const map = C.map, T = C.T, cx = Math.floor(x / T), cy = Math.floor(y / T);
  if (!C.inside(cx, cy)) return 'off the map';
  const g = map.groundAt(x, y, 0, z, 6), h = map.heightAt(x, y);
  if (Math.abs(g - z) > 6) return `nothing to stand on at ${z} (the surface under it is at ${g})`;
  if (h > z + 6) return `inside something ${h} high`;
  if (z < 6) { const s = C.surfaceAt(cx, cy); if (!C.walkable(cx, cy) || s === 'water' || s === 'deep') return `on ${s}, not walkable`; }
  return null;
}

test('the 25 Moto Tokens: unique ids, each where a body can stand, on every city the bot plays', async () => {
  const { gtm } = await loadGame(), M = gtm.motor, T = M.get('collectibles', 'moto-tokens');
  assert.ok(T, 'the moto-tokens collectibles are registered');
  assert.equal(T.spots.length, 25);
  assert.equal(new Set(T.spots.map(s => s.id)).size, 25, 'token ids are unique');
  assert.ok(T.reward > 0 && T.bonus > 0, 'a token pays, and the set pays a bonus');
  const bad = [];
  for (const seed of [1999, 1, 2, 3]) {
    const C = M.buildCity('lowtown', seed);
    for (const s of T.spots) {
      if (!Array.isArray(s.at) || s.at.length < 2) { bad.push(`${s.id}: no at`); continue; }
      const why = footing(C, s.at); if (why) bad.push(`${s.id} (seed ${seed}): ${why}`);
      for (const [i, q] of (s.via || []).entries()) if (!Array.isArray(q) || q.length < 2) bad.push(`${s.id}: via ${i} is no point`);
    }
  }
  assert.deepEqual(bad, [], bad.join('\n'));
});

test('the five stunt jumps: registered, each with its takeoff, distance, air time, reward and approach, and no takeoff claimed by an earlier circle', async () => {
  const { gtm } = await loadGame(), M = gtm.motor, list = M.all('stunts');
  for (const id of STUNTS) assert.ok(list.some(s => s.id === id), `stunt ${id} is registered`);
  const mine = list.filter(s => STUNTS.includes(s.id)), bad = [];
  for (const [i, s] of mine.entries()) {
    if (!(s.r > 0 && s.minDist > 0 && s.minAir > 0 && s.reward > 0)) bad.push(`${s.id}: r, minDist, minAir and reward are positive`);
    if (!Array.isArray(s.takeoff) || !Array.isArray(s.approach)) { bad.push(`${s.id}: a takeoff and an approach`); continue; }
    if (Math.hypot(s.approach[0] - s.takeoff[0], s.approach[1] - s.takeoff[1]) < 80) bad.push(`${s.id}: the approach is a run-up, 80 u or more from the takeoff`);
    // (the first circle in registration order that holds a takeoff is the jump's)
    for (const e of mine.slice(0, i)) if (Math.hypot(s.takeoff[0] - e.takeoff[0], s.takeoff[1] - e.takeoff[1]) < e.r) bad.push(`${s.id}: its takeoff lies in ${e.id}'s circle`);
  }
  assert.deepEqual(bad, [], bad.join('\n'));
});

test('the four random events: registered as events, each with a where, a reward and its stages; each finds spots near players about the city, on land', async () => {
  const { game, gtm } = await loadGame({ hash: '#play/safehouse', query: { seed: '1999' } });
  game.advance(.5);
  const M = gtm.motor, W = gtm.career.W, C = W.city, bad = [];
  // players about the city: on foot at the safehouse and at a few points of the ground lanes, facing along them
  const lanes = W.roads.graph.lanes.filter(L => L.ground), poses = [];
  for (let k = 0; k < 40; k++) { const L = lanes[Math.floor(k * lanes.length / 40)], f = Math.atan2(L.dir[1], L.dir[0]); poses.push({ x: L.a[0], y: L.a[1], z: 0, facing: f, seat: null }); }
  for (const id of EVENTS) {
    const a = M.get('activities', id);
    if (!a) { bad.push(`${id}: not registered`); continue; }
    if (a.kind !== 'event') bad.push(`${id}: kind ${a.kind}, not event`);
    if (typeof a.where !== 'function') { bad.push(`${id}: no where(W, P)`); continue; }
    const pay = a.rewardsFor ? a.rewardsFor(1, null) : a.rewards; if (!pay || !(pay.cash > 0)) bad.push(`${id}: no cash reward`);
    if (!a.stages.length || a.stages.some(s => typeof s.setup !== 'function')) bad.push(`${id}: stages`);
    let found = 0;
    for (const P of poses) {
      const at = a.where(W, P); if (!at) continue; found++;
      const d = Math.hypot(at[0] - P.x, at[1] - P.y), cx = Math.floor(at[0] / C.T), cy = Math.floor(at[1] / C.T);
      if (!(d > 80 && d < 400)) bad.push(`${id}: a spot ${Math.round(d)} u off the player`);
      if (!C.inside(cx, cy) || C.surfaceAt(cx, cy) === 'water' || C.surfaceAt(cx, cy) === 'deep') bad.push(`${id}: a spot at ${at} off the map or in the water`);
    }
    if (found < 3) bad.push(`${id}: a spot for only ${found} of ${poses.length} players`);
  }
  assert.deepEqual(bad, [], bad.join('\n'));
  assert.deepEqual([...gtm.BUS.errors], []);
});

// the shoot-out's tip is for a hand in it: the crew putting the rivals down on its own (the player looking on) ends it
// quietly, no cash and no respect; a rival hit by the player first and it pays (test:full's gang sim had found an idle
// player's respect moved)
test('a gang shoot-out the crew wins on its own pays nothing; one the player had a hand in pays its tip', async () => {
  for (const hand of [false, true]) {
    const { game, gtm } = await loadGame({ hash: '#play/safehouse', query: { seed: '1', time: 'day', weather: 'clear' } });
    game.advance(2);
    const C = gtm.career, A = C.events, P = gtm.crew.ped, spec = gtm.motor.get('activities', 'event_gang_shootout'), log = [];
    for (const n of ['cash', 'respect']) gtm.BUS.on(n, e => log.push({ n, ...e }), 'global');
    // the ambient runtime's own start, at a junction ahead of the player (as AmbientEvents.update does)
    let at = null; for (let k = 0; k < 40 && !at; k++) { P.mover.facing = k * .3; at = spec.where(C.W, P); }
    assert.ok(at, 'a spot for the shoot-out');
    A.R.start('event_gang_shootout', { activity: true, data: { at } });
    game.advance(1);
    const rivals = A.R.actors.tagged('rivals'), crew = A.R.actors.tagged('crew');
    assert.ok(A.active && rivals.length === 4 && crew.length === 3, 'the shoot-out is on, the crew and the rivals at it');
    // the rivals down by the crew's guns (the first hit by the player's before, when they had a hand in it)
    if (hand) gtm.combat.hurt(rivals[0], { amount: 5, kind: 'bullet', by: P.id });
    for (const r of rivals) gtm.combat.hurt(r, { amount: 999, kind: 'bullet', by: crew[0].id });
    for (let s = 0; s < 30 && A.active; s++) game.advance(1);
    const paid = log.filter(e => (e.reason || e.why) === 'activity:event_gang_shootout'), R = A.R.result;
    assert.ok(!A.active, 'it has ended');
    if (hand) {
      assert.ok(R && R.passed, `with the player's hand in it, passed: ${JSON.stringify(R)}`);
      assert.deepEqual(paid.map(e => e.n === 'cash' ? e.amount : e.delta).sort((a, b) => a - b), [-2, 3, 200], `the tip and the respect: ${JSON.stringify(paid)}`);
    } else {
      assert.ok(R && !R.passed && R.reason === 'the crew won it on its own', `the crew on its own, ended quietly: ${JSON.stringify(R)}`);
      assert.deepEqual(paid, [], 'no cash and no respect');
    }
    assert.deepEqual([...gtm.BUS.errors], []);
  }
});

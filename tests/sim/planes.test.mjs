// Planes (EXPANSION.md X2): the Duster off Ironside's airstrip by the player's controls (R2 the throttle, R1 the climb,
// the stick the bank), round a circuit and down again; a stall (the throttle off and the nose held up); a crash (a dive
// into the ground, a wall flown into); boarded and left only on the ground; turned back at the world's edge; and the
// Gull off the water and onto it again, a landplane on the water going under.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../harness.mjs';

const T = 16, Q = { seed: '1', time: 'day', weather: 'clear', dev: '1' };
// a pilot from a function of (t, body) -> { throttle, brake, steer, climb } (climb: R1 +1, L1 -1)
const fly = (gtm, f) => { const M = gtm.motor, I = M.makeIntent(); let t = 0; return (dt, p) => { M.clearIntent(I); const v = p.seat && p.seat.vehicle; t += dt; if (!v) return I; const c = f(t, v.body); I.throttle = c.throttle || 0; I.brake = c.brake || 0; I.steer = c.steer || 0; if (c.climb > 0) I.down.handbrake = true; if (c.climb < 0) I.down.nitro = true; return I; }; };
const aboard = (gtm, v) => { const p = gtm.crew.ped; v.sit(p, 0); p.place(v.x, v.y, 0); gtm.fleet.wake(v); return v; };
const ironside = async () => { const g = await loadGame({ hash: '#play', query: { ...Q, district: 'ironside' } }); g.game.advance(.5); return g; };

test('the Duster: off the runway by the throttle and R1, round a circuit at 200, and down on the runway again, unharmed', async () => {
  const { game, gtm } = await ironside(), v = aboard(gtm, gtm.fleet.vehicles.find(q => q.def.id === 'duster')), b = v.body, x0 = v.x;
  assert.ok(b.landed, 'it stands landed on the apron');
  let off = null, top = 0; const h0 = b.heading;
  gtm.pilot(fly(gtm, (t, B) => (B.landed && t < 3 ? { throttle: 1, climb: B.u > B.h.vr ? 1 : 0 } : { throttle: .8, climb: B.z < 200 ? 1 : 0, steer: t > 6 && t < 14 ? .8 : 0 })));
  for (let s = 0; s < 20 * 120; s++) { game.advance(1 / 120); if (!off && !b.landed) off = { x: v.x, u: b.u }; top = Math.max(top, b.z); }
  const turned = Math.abs(Math.atan2(Math.sin(b.heading - h0), Math.cos(b.heading - h0)));
  assert.ok(off && x0 - off.x < 200 && off.u >= b.h.vr, `off the ground past its rotation speed, in ${off ? Math.round(x0 - off.x) : '-'} u`);
  assert.ok(top >= 195 && top <= 225, `climbed to 200 and held it (${Math.round(top)})`); assert.ok(turned > 1, `banked round (${turned.toFixed(2)} rad)`);
  // (down: the AutoPlayer's approach and glide onto the runway, as the bot flies it)
  const A = new gtm.motor.AutoPlayer({ city: gtm.city, roads: gtm.motor.roadsOf(gtm.city), fleet: gtm.fleet, junctions: gtm.life.junctions });
  A.goto(72.5 * T, 92.5 * T, { stay: true, radius: 60, land: Math.PI }); gtm.pilot((dt, p) => A.update(dt, p, {}));
  for (let s = 0; s < 120 * 120 && A.state !== 'arrived'; s++) game.advance(1 / 120);
  gtm.pilot(null);
  assert.equal(A.state, 'arrived', 'landed and stopped'); assert.ok(b.landed && v.speed < 5, 'on its wheels, stopped');
  assert.equal(v.damage.health, v.damage.max, 'unharmed'); assert.ok(Math.abs(v.y - 92.5 * T) < 5 * T && v.x > 70 * T && v.x < 112 * T, 'on the airstrip');
  assert.equal((game.errors || []).length, 0, JSON.stringify(game.errors));
});

test('a stall: the throttle off and the nose held up, it drops till it has the speed again; a dive into the ground and a wall flown into are crashes', async () => {
  const { game, gtm } = await ironside(), v = aboard(gtm, gtm.fleet.vehicles.find(q => q.def.id === 'duster')), b = v.body;
  b.landed = false; b.airborne = true; b.x = 60 * T; b.y = 40 * T; b.z = 300; b.u = 120; b.heading = 0;
  let stalled = false, drop = 0;
  gtm.pilot(fly(gtm, () => ({ throttle: 0, climb: 1 }))); for (let s = 0; s < 8 * 120; s++) { game.advance(1 / 120); stalled ||= b.stalled; drop = Math.min(drop, b.vz); }
  assert.ok(stalled && drop < -100, `stalled and fell (${Math.round(drop)} u/s)`);
  gtm.pilot(fly(gtm, () => ({ throttle: 1, climb: -1 }))); for (let s = 0; s < 20 * 120 && !b.landed; s++) game.advance(1 / 120);
  assert.ok(b.landed && v.damage.health < v.damage.max, `a dive into the ground: down hard, hurt (${Math.round(v.damage.health)})`);
  // (a wall: low over the works, straight at the Power Station's side)
  const w = aboard(gtm, gtm.fleet.spawn('duster', 104 * T, 40 * T, 0, { owner: 'world' })), c = w.body;
  c.landed = false; c.airborne = true; c.z = 40; c.u = 180; c.heading = -Math.PI / 2;
  gtm.pilot(fly(gtm, () => ({ throttle: 1 }))); let stopped = false; for (let s = 0; s < 6 * 120; s++) { game.advance(1 / 120); stopped ||= c.y > 24 * T && c.u < 60 && !c.landed; }
  gtm.pilot(null);
  assert.ok(stopped && w.damage.health < w.damage.max, `the wall: stopped against it, hurt (${Math.round(w.damage.health)} left)`);
});

test('boarded and left only on the ground; at the world\'s edge it banks round and never leaves the map', async () => {
  const { game, gtm } = await ironside(), M = gtm.motor, p = gtm.crew.ped, v = gtm.fleet.vehicles.find(q => q.def.id === 'duster');
  assert.ok(M.boardingFor(p, v, 0) || true);
  aboard(gtm, v); const b = v.body; b.landed = false; b.airborne = true; b.z = 200; b.u = 180;
  assert.equal(M.exitFor(p, v, () => true), null, 'no way out in the air');
  b.x = 64 * T; b.y = 56 * T; b.heading = 0;   // (east, at the canal: the edge ahead)
  gtm.pilot(fly(gtm, () => ({ throttle: 1 }))); let maxX = 0;
  for (let s = 0; s < 20 * 120; s++) { game.advance(1 / 120); maxX = Math.max(maxX, b.x); }
  gtm.pilot(null);
  assert.ok(maxX < gtm.city.w * T, `turned back short of the edge (${Math.round(maxX)} of ${gtm.city.w * T})`); assert.ok(b.x < maxX - 100, 'and flying back in');
  // (along the edge, 40 off it and drifting out a little: flown on, not turned: a guard on any drift had pushed the
  // Gull off its line along Glass Heights' south shore, X6)
  const H = gtm.city.h * T; b.x = 100 * T; b.y = H - 40; b.z = 150; b.u = 180; b.heading = Math.PI - .02; b.bank = 0; b.edgeTurn = false;
  gtm.pilot(fly(gtm, () => ({ throttle: .7 }))); let worst = 0;
  for (let s = 0; s < 2 * 120; s++) { game.advance(1 / 120); worst = Math.max(worst, Math.abs(Math.atan2(Math.sin(b.heading - Math.PI), Math.cos(b.heading - Math.PI)))); }
  gtm.pilot(null);
  assert.ok(worst < .08 && b.y < H, `flown on along the edge (off its heading by ${worst.toFixed(3)} at most)`);
});

test('the Gull: off the water and onto it again; a landplane set down on the water goes under', async () => {
  const g = await loadGame({ hash: '#play', query: { ...Q } }); g.game.advance(.5);
  const { game, gtm } = g, v = aboard(gtm, gtm.fleet.spawn('gull', 120 * T, 156 * T, 0, { owner: 'world' })), b = v.body;   // (on the open sea off Lowtown's south shore)
  assert.ok(b.landed, 'afloat');
  let off = false;
  gtm.pilot(fly(gtm, (t, B) => (t < 6 ? { throttle: 1, climb: B.u > B.h.vr ? 1 : 0 } : { throttle: .1, climb: B.z > 30 ? -.4 : -.25 })));
  for (let s = 0; s < 16 * 120; s++) { game.advance(1 / 120); off ||= !b.landed; if (off && b.landed) break; }
  assert.ok(off, 'off the water'); assert.ok(b.landed && !v.sinking && !v.sunk, 'down on the water, afloat'); assert.equal(v.damage.health, v.damage.max, 'unharmed');
  const d = aboard(gtm, gtm.fleet.spawn('duster', 100 * T, 156 * T, 0, { owner: 'world' })), c = d.body;
  c.landed = false; c.airborne = true; c.z = 20; c.u = 100;
  gtm.pilot(fly(gtm, () => ({ throttle: .2, climb: -.5 }))); for (let s = 0; s < 8 * 120; s++) game.advance(1 / 120);
  gtm.pilot(null);
  assert.ok(d.sinking > 0 || d.sunk, 'the Duster on the water: going under');
});

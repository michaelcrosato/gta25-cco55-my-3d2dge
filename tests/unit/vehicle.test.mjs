// The vehicle body's handling suite (PLAN.md 8.8 Accept): acceleration and top speed against the Cortez's spec, dry and
// wet braking, skidpad grip, a handbrake drift, no tunnelling at 400 u/s, glancing hits that spin, car-on-car momentum,
// solids, curbs and surfaces, reversing, determinism. Headless: the body is plain arithmetic.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engineGlobal } from '../harness.mjs';

const E = engineGlobal();
await import('../../src/game/vehicles/cortez.js');   // registers the definition (content imports MOTOR, which is loaded)
const { VehicleBody, collidePairs } = await import('../../src/motor/sim/vehicle/body.js');
const { makeBody, vehicleDef } = await import('../../src/motor/sim/vehicle/defs.js');
const dt = 1 / 120, spec = vehicleDef('cortez').spec;
const run = (b, seconds, ctl, world, each) => { for (let t = 0; t < seconds; t += dt) { b.step(dt, ctl, world); if (each) each(b, t); } return b; };
const wallMap = (cells, h = 32) => { const m = new E.TileMap({ w: 80, h: 30, types: { 1: { h, top: '#666', side: '#555' } } }); for (const [x0, y0, x1, y1] of cells) m.fill(x0, y0, x1 - x0 + 1, y1 - y0 + 1, 1); return m; };

test('0 to 200 u/s within 10% of the spec, and the top speed within 5%', () => {
  const b = makeBody('cortez', 0, 0, 0); let t200 = null;
  run(b, 30, { throttle: 1 }, {}, (c, t) => { if (t200 === null && c.u >= 200) t200 = t; });
  assert.ok(Math.abs(t200 - spec.t200) <= spec.t200 * .1, `0-200 in ${t200.toFixed(2)} s (spec ${spec.t200})`);
  assert.ok(Math.abs(b.u - spec.top) <= spec.top * .05, `top ${b.u.toFixed(1)} (spec ${spec.top})`);
  assert.equal(b.gear, 5);
});
test('braking from 200 u/s stops within 10% of the spec dry, and at least 20% longer wet', () => {
  const stop = wet => { const b = makeBody('cortez', 0, 0, 0); b.u = 200; let at = null; run(b, 3, { brake: 1 }, { wet }, c => { if (at === null && c.u <= 0) at = c.x; }); return at; };
  const dry = stop(false), wet = stop(true);
  assert.ok(Math.abs(dry - spec.brake200) <= spec.brake200 * .1, `dry ${dry.toFixed(1)} (spec ${spec.brake200})`);
  assert.ok(wet >= dry * 1.2, `wet ${wet.toFixed(1)} vs dry ${dry.toFixed(1)}`);
  const b = makeBody('cortez', 0, 0, 0); b.u = 200; let lo = 1e9; run(b, .6, { brake: 1 }, {}, c => { lo = Math.min(lo, c.u); }); assert.ok(lo >= 0, 'a hard stop holds a moment before the brake reverses: ' + lo);
});
test('the skidpad: at full lock the lateral grip holds over half the tyre limit, less wet and on grass', () => {
  const lat = (world, h = {}) => { const b = new VehicleBody({ ...vehicleDef('cortez').handling, steerFade: 0, ...h }, 0, 0, 0); b.u = 180; let L = 0; run(b, 5, { throttle: .45, steer: 1 }, world, (c, t) => { if (t > 4) L = Math.max(L, Math.abs(c.felt.lat)); }); return L; };
  const dry = lat({}), wet = lat({ wet: true }), grass = lat({ surface: () => .6 });
  assert.ok(dry > .55 * vehicleDef('cortez').handling.grip, `dry ${dry.toFixed(0)}`);
  assert.ok(wet < dry * .95 && grass < wet, `wet ${wet.toFixed(0)}, grass ${grass.toFixed(0)}`);
});
test('the handbrake breaks the rear loose: a drift passes its yaw and slip thresholds; without it the car grips', () => {
  const go = hand => { const b = makeBody('cortez', 0, 0, 0); b.u = 180; let yaw = 0, slip = 0; run(b, 1, { throttle: .6, steer: .8, handbrake: hand }, {}, c => { yaw = Math.max(yaw, Math.abs(c.w)); slip = Math.max(slip, Math.abs(c.felt.slip)); }); return [yaw, slip * 180 / Math.PI]; };
  const [dy, ds] = go(true), [gy, gs] = go(false);
  assert.ok(dy > 2 && ds > 12, `drift: yaw ${dy.toFixed(2)} rad/s, slip ${ds.toFixed(1)}°`);
  assert.ok(gy < 1.6 && gs < 6, `grip: yaw ${gy.toFixed(2)}, slip ${gs.toFixed(1)}°`);
});
test('a short handbrake pull turns the car and it recovers by itself; a long one with throttle spins it round', () => {
  const pull = (hold, thr) => { const b = makeBody('cortez', 0, 0, 0); b.u = 180; let slipEnd = 0; for (let t = 0; t < 3; t += dt) { const hand = t < hold; b.step(dt, { throttle: hand ? .6 : thr, steer: hand ? .8 : 0, handbrake: hand }, {}); if (t > 2.5) slipEnd = Math.max(slipEnd, Math.abs(b.felt.slip)); } return [b.heading * 180 / Math.PI, slipEnd * 180 / Math.PI]; };
  const [turn, slip] = pull(.4, .3), [spin] = pull(.6, .6);
  assert.ok(turn > 30 && turn < 90 && slip < 3, `a handbrake turn: ${turn.toFixed(0)}°, then ${slip.toFixed(1)}° of slip`);
  assert.ok(spin > 150, `a J-turn: ${spin.toFixed(0)}°`);
});
test('no tunnelling: at 400 u/s into a wall one cell thick, the car stops at its face', () => {
  const map = wallMap([[40, 0, 40, 29]]), b = makeBody('cortez', 200, 240, 0); b.u = 400; let front = 0;
  run(b, 1.5, { throttle: 1 }, { map }, c => { front = Math.max(front, ...c.corners().map(p => p[0])); });
  assert.ok(front <= 640 + 1, `the front reached ${front.toFixed(1)} (the face is at 640)`);
  assert.ok(b.x < 640, 'still on this side');
});
test('a glancing hit turns the car; a square hit stops it straight', () => {
  const map = wallMap([[40, 0, 40, 29]]);
  const square = makeBody('cortez', 400, 240, 0); square.u = 220; run(square, .8, {}, { map });
  assert.ok(Math.abs(square.heading) < .05, 'square: no turn ' + square.heading);
  const glance = makeBody('cortez', 540, 200, .5); glance.u = 220; let spin = 0; run(glance, .8, {}, { map }, c => { spin = Math.max(spin, Math.abs(c.w)); });
  assert.ok(spin > .5 && Math.abs(glance.heading - .5) > .1, `glancing: spin ${spin.toFixed(2)}, heading ${glance.heading.toFixed(2)}`);
});
test('car on car: momentum along the hit is kept, and they end apart', () => {
  const a = makeBody('cortez', 100, 100, 0), b = makeBody('cortez', 200, 100, 0); a.u = 200; b.u = 0;
  const p0 = a.vx * a.h.mass + b.vx * b.h.mass;
  for (let t = 0; t < .6; t += dt) { a.step(dt, {}, {}); b.step(dt, {}, {}); collidePairs([a, b]); }
  const p1 = a.vx * a.h.mass + b.vx * b.h.mass;
  assert.ok(b.vx > 60 && a.vx < 120, `the struck car moves off (${b.vx.toFixed(0)}), the striker slows (${a.vx.toFixed(0)})`);
  assert.ok(Math.abs(p1 - p0) / p0 < .25, `momentum ${p0.toFixed(0)} -> ${p1.toFixed(0)} (rolling and tyres take some)`);
  assert.ok(b.x - a.x >= a.hl + b.hl - 1, 'apart: ' + (b.x - a.x).toFixed(1));
});
test('a lamp post (a map solid) stops the car; a curb (3 units) does not; a wall of 32 does', () => {
  const map = wallMap([[60, 0, 60, 29]]); map.addSolids([{ x: 500, y: 240, z: 0, top: 44, hx: 1.5, hy: 1.5 }]);
  const lamp = makeBody('cortez', 300, 240, 0); lamp.u = 150; run(lamp, 1.5, {}, { map });
  assert.ok(lamp.x + lamp.hl <= 500 + 3, 'stopped at the lamp: ' + (lamp.x + lamp.hl).toFixed(1));
  const curbMap = wallMap([[30, 0, 31, 29]], 3), c = makeBody('cortez', 200, 240, 0); c.u = 150; run(c, 3, { throttle: .5 }, { map: curbMap });
  assert.ok(c.x - c.hl > 32 * 16 && c.u > 100, `over the curb at speed: ${c.x.toFixed(0)}, ${c.u.toFixed(0)} u/s`);
});
test('reverse: the brake held at a stop backs up, to the reverse top speed', () => {
  const b = makeBody('cortez', 500, 500, 0); run(b, 3, { brake: 1 }, {});
  assert.ok(b.u < -60 && b.u >= -b.h.reverseTop - 1, 'reversing at ' + b.u.toFixed(1));
  assert.equal(b.gear, -1);
});
test('deterministic: the same inputs give the same body, to the bit', () => {
  const drive = steer => { const b = makeBody('cortez', 100, 100, .3); const map = wallMap([[50, 0, 50, 29]]); run(b, 4, { throttle: .9, steer, handbrake: false }, { map, wet: true }); return [b.x, b.y, b.heading, b.u, b.v, b.w]; };
  assert.deepEqual(drive(.35), drive(.35));
  assert.notDeepEqual(drive(.35), drive(.36));
});
test('at rest the tyres hold: a slow sideways slide stops, never swings side to side; held with the wheel turned, it never creeps (D45)', () => {
  const s = makeBody('cortez', 0, 0, 0); s.v = .35; let flips = 0, last = s.v;
  run(s, 1, { handbrake: true }, {}, c => { if (c.v !== 0 && Math.sign(c.v) !== Math.sign(last)) flips++; if (c.v !== 0) last = c.v; });
  assert.equal(flips, 0, 'the slide never thrown the other way'); assert.ok(Math.hypot(s.u, s.v) < .05, `at rest (${s.u.toFixed(3)}, ${s.v.toFixed(3)})`);
  const h = makeBody('cortez', 0, 0, 0); h.u = .8; h.steerAngle = .2; let top = 0;
  run(h, 3, { handbrake: true, steer: .2 }, {}, c => { top = Math.max(top, c.u); });
  assert.ok(top <= .8 + 1e-9 && Math.abs(h.u) < .05 && Math.abs(h.x) < 2, `held at a red with the wheel turned: it stops where it is (top ${top.toFixed(3)}, ${h.x.toFixed(2)} on)`);
});

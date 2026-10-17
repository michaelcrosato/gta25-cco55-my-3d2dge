// The handling bench (PLAN.md 8.8's Accept): every vehicle definition measured against its spec, by its class, on
// stand-in tracks (open asphalt, a one-cell wall, open water, the sky, a test loop of rail). The unit suite runs it for
// every definition (tests/unit/handling.test.mjs), the Proving Ground's garage shows it (#proving/garage?bench=1).
//   measureHandling(id) -> the numbers;  handlingChecks(id, m) -> [{ check, ok, value, want }]
//   land (car, truck, tow, bike): 0 to 200 (or 100: spec.t100) within 10% of spec; the top speed within 5%; braking
//     from 200 (or 100) dry within 10% of spec.brake200 (brake100), and wet at least 15% longer; skidpad grip at least
//     half the handling's grip; a handbrake pull past the class's yaw and slip thresholds; no tunnelling at 400 u/s.
//   boat: 0 to 100 within 10% of spec.t100, the top within 5%; the rudder turns it at speed; a quay stops it.
//   heli: flies 600 u to a point and holds it; never past its top speed, at least 90% of it on the way; climbs at
//     least 90% of spec.climb.  rail: runs at spec.top within 5%, stops at each platform within 4 u, waits spec.dwell.
import { E } from '../../engine.js';
import { vehicleDef, classOf, makeBody } from './defs.js';
import { RailLine, Train } from './rail.js';

const DT = 1 / 120;
/** the yaw (rad/s) and rear slip (degrees) a handbrake pull must pass, by class */
export const DRIFT = { car: [2, 12], tow: [1.4, 9], truck: [1, 7], bike: [1.2, 6] };
const run = (b, seconds, ctl, world, each) => { for (let t = 0; t < seconds; t += DT) { b.step(DT, ctl, world); if (each && each(b, t) === false) break; } return b; };
function wallMap() { const m = new E.TileMap({ w: 80, h: 30, types: { 1: { h: 32, top: '#666', side: '#555' } } }); m.fill(40, 0, 1, 30, 1); return m; }

/** measure one definition (by its class): plain numbers, deterministic */
export function measureHandling(id) {
  const d = vehicleDef(id), cls = classOf(d), s = d.spec || {};
  if (cls === 'boat') return boat(id, s);
  if (cls === 'heli') return heli(id, s);
  if (cls === 'rail') return rail(d, s);
  const to = s.t100 ? 100 : 200, from = s.brake100 ? 100 : 200;
  const m = { cls, to, from };
  // acceleration and the top speed, flat out on dry asphalt
  { const b = makeBody(id, 0, 0, 0); let t1 = null, last = 0, still = 0;
    run(b, 60, { throttle: 1 }, {}, (c, t) => { if (t1 === null && c.u >= to) t1 = t; if (Math.abs(c.u - last) < .002) still += DT; else still = 0; last = c.u; return still < 1.5; });
    m.tTo = t1; m.top = b.u; }
  // braking, dry and wet
  const stop = wet => { const b = makeBody(id, 0, 0, 0); b.u = from; let at = null; run(b, 6, { brake: 1 }, { wet }, c => { if (at === null && c.u <= 0) { at = c.x; return false; } return true; }); return at; };
  m.brakeDry = stop(false); m.brakeWet = stop(true);
  // the skidpad: lateral grip at full lock (no steering fade), at 70% of the top speed (180 at most)
  { const b = makeBody(id, 0, 0, 0); b.h.steerFade = 0; b.u = Math.min(180, m.top * .7); let L = 0; run(b, 5, { throttle: .45, steer: 1 }, {}, (c, t) => { if (t > 4) L = Math.max(L, Math.abs(c.felt.lat)); }); m.lat = L; m.grip = b.h.grip; }
  // a handbrake pull at speed
  { const b = makeBody(id, 0, 0, 0); b.u = Math.min(180, m.top * .7); let yaw = 0, slip = 0; run(b, 1, { throttle: .6, steer: .8, handbrake: true }, {}, c => { yaw = Math.max(yaw, Math.abs(c.w)); slip = Math.max(slip, Math.abs(c.felt.slip)); }); m.yaw = yaw; m.slip = slip * 180 / Math.PI; }
  // no tunnelling: flat out at 400 u/s into a wall one cell thick (the front must stop at its face, x = 640)
  { const map = wallMap(), b = makeBody(id, 200, 240, 0); b.u = 400; let front = 0; run(b, 1.5, {}, { map }, c => { front = Math.max(front, ...c.corners().map(q => q[0])); }); m.front = front; }
  return m;
}
function boat(id, s) {
  const m = { cls: 'boat' }, water = { water: () => true };
  { const b = makeBody(id, 0, 0, 0); let t1 = null, last = 0, still = 0; run(b, 60, { throttle: 1 }, water, (c, t) => { if (t1 === null && c.u >= 100) t1 = t; if (Math.abs(c.u - last) < .002) still += DT; else still = 0; last = c.u; return still < 1.5; }); m.tTo = t1; m.top = b.u; }
  { const b = makeBody(id, 0, 0, 0); b.u = 120; let yaw = 0; run(b, 1.5, { throttle: .6, steer: 1 }, water, c => { yaw = Math.max(yaw, Math.abs(c.w)); }); m.yaw = yaw; }
  // a quay: the water ends at x = 640 (cell 40): the bow never passes it
  { const map = new E.TileMap({ w: 80, h: 30 }), b = makeBody(id, 300, 240, 0); b.u = 200; let front = 0; run(b, 2, { throttle: 1 }, { map, water: cx => cx < 40 }, c => { front = Math.max(front, ...c.corners().map(q => q[0])); }); m.front = front; }
  return m;
}
function heli(id, s) {
  const m = { cls: 'heli' }, b = makeBody(id, 0, 0, 0); let reach = null, vmax = 0;
  run(b, 12, { to: [600, 0], alt: b.z }, {}, (c, t) => { vmax = Math.max(vmax, c.speed); if (reach === null && Math.hypot(c.x - 600, c.y) < 20) reach = t; });
  m.reach = reach; m.vmax = vmax; m.hold = Math.hypot(b.x - 600, b.y); m.top = b.h.top;
  const c = makeBody(id, 0, 0, 0); c.z = 40; let rate = 0; run(c, 3, { to: [0, 0], alt: 400 }, {}, q => { rate = Math.max(rate, q.vz); }); m.climb = rate;
  return m;
}
function rail(d, s) {
  const line = new RailLine({ points: [[0, 0], [3000, 0], [3000, 60], [0, 60]], z: 0, stations: [{ name: 'A', at: [900, 0] }, { name: 'B', at: [2100, 0] }] });
  const tr = new Train(line, { ...d.handling, top: s.top, dwell: s.dwell, s: 400 }), m = { cls: 'rail', stops: [], vmax: 0 };
  let t = 0, wait = 0;
  for (; t < 90; t += DT) {
    const was = tr.state; tr.update(DT); m.vmax = Math.max(m.vmax, tr.v);
    if (tr.state === 'stop') wait += DT;
    if (was === 'run' && tr.state === 'stop') { const mid = tr.s - tr.span / 2, st = line.stations.find(q => q.name === tr.station), dd = st ? ((mid - st.s) % line.length + line.length) % line.length : 999; m.stops.push({ station: tr.station, off: st ? Math.min(dd, line.length - dd) : 999 }); }
    if (was === 'stop' && tr.state === 'run') { (m.waits ||= []).push(wait); wait = 0; }
  }
  return m;
}

/** the checks a definition's measurements must pass, by its class */
export function handlingChecks(id, m = measureHandling(id)) {
  const d = vehicleDef(id), s = d.spec || {}, out = [], ck = (check, ok, value, want) => out.push({ check, ok: !!ok, value: typeof value === 'number' ? +value.toFixed(3) : value, want });
  if (m.cls === 'boat') {
    ck('0-100 on water', m.tTo !== null && s.t100 && Math.abs(m.tTo - s.t100) <= s.t100 * .1, m.tTo, s.t100 + ' ±10%');
    ck('top speed', s.top && Math.abs(m.top - s.top) <= s.top * .05, m.top, s.top + ' ±5%');
    ck('the rudder turns it at speed', m.yaw > .5, m.yaw, '> 0.5 rad/s');
    ck('a quay stops it', m.front <= 641, m.front, '<= 640');
    return out;
  }
  if (m.cls === 'heli') {
    ck('reaches its point', m.reach !== null && m.hold < 20, m.reach, 'within 12 s, holds within 20 u');
    ck('never past its top', m.vmax <= m.top * 1.02, m.vmax, '<= ' + m.top);
    ck('flies near its top', s.top ? m.vmax >= s.top * .9 && Math.abs(m.top - s.top) <= s.top * .05 : true, m.vmax, '>= 90% of ' + s.top);
    ck('climbs', s.climb ? m.climb >= s.climb * .9 : m.climb > 30, m.climb, '>= 90% of ' + (s.climb || 30));
    return out;
  }
  if (m.cls === 'rail') {
    ck('runs at its top', s.top && Math.abs(m.vmax - s.top) <= s.top * .05, m.vmax, s.top + ' ±5%');
    ck('stops at every platform', m.stops.length >= 2 && m.stops.every(q => q.off <= 4), m.stops.map(q => q.off.toFixed(1)).join(' '), '<= 4 u off');
    ck('waits its dwell', s.dwell && (m.waits || []).length && m.waits.every(w => Math.abs(w - s.dwell) <= .6), (m.waits || []).map(w => w.toFixed(2)).join(' '), s.dwell + ' s (+ the doors)');
    return out;
  }
  const t = s.t100 || s.t200, br = s.brake100 || s.brake200, [yawMin, slipMin] = DRIFT[m.cls] || DRIFT.car;
  ck(`0-${m.to}`, m.tTo !== null && t && Math.abs(m.tTo - t) <= t * .1, m.tTo, t + ' ±10%');
  ck('top speed', s.top && Math.abs(m.top - s.top) <= s.top * .05, m.top, s.top + ' ±5%');
  ck(`braking from ${m.from}, dry`, br && m.brakeDry !== null && Math.abs(m.brakeDry - br) <= br * .1, m.brakeDry, br + ' ±10%');
  ck('braking, wet', m.brakeWet !== null && m.brakeDry !== null && m.brakeWet >= m.brakeDry * 1.15, m.brakeWet, '>= 115% of dry');
  ck('skidpad grip', m.lat >= m.grip * .5, m.lat, '>= ' + (m.grip * .5).toFixed(0));
  ck('handbrake drift', m.yaw >= yawMin && m.slip >= slipMin, `${m.yaw.toFixed(2)} rad/s ${m.slip.toFixed(1)}°`, `>= ${yawMin} rad/s, ${slipMin}°`);
  ck('no tunnelling at 400', m.front <= 641, m.front, '<= 640');
  return out;
}

// Riding the L (PLAN.md 19's backlog, HANDOFF L4). Each station of a rail deck has stairs on either side: a spot on
// the sidewalk beside the station and one on the platform above it (the deck's height), taken with the interact button
// as a door is, the climb a fade (the play scene's). On a platform, a train stopped there with its doors open is boarded
// by the nearest of its cars within reach, and ridden inside it: the rider hidden, carried with the car, the camera on
// it. At any stop after, the button gets off, onto that station's platform on the car's side. Trains run a loop, down
// one track and back up the other, so every train reaches every station; the side whose track leads to a station
// sooner is the one to climb to (towardSide). Plain arithmetic over the city's decks and the fleet's trains:
// deterministic and headless. The Transit hangs itself on the fleet (fleet.transit) for the bot.
//   const T = new Transit(city, fleet)
//   T.stairsAt(p) -> { station, side, up, to: [x, y, z] } | null   (stairs within reach: up from the street, down from the platform)
//   T.trainAt(p) -> { train, car } | null   (a stopped train's car to board, from the platform)
//   T.board(p, train, car) · T.alight(p) -> bool (only at a stop) · T.update() (carries the riders) · T.riding(p)
//   T.stationAt(p) -> the station whose platform p stands on, or null · T.towardSide(name, to) -> -1 | 1
import { TUNE, knob } from '../core/tune.js';

knob('Vehicles', 'stairsReach', 'L stairs reach', 18, 6, 60, 1, 'How near a station\'s stairs the player stands to take them (u)');
knob('Vehicles', 'trainReach', 'L door reach', 30, 8, 80, 1, 'How near a stopped L car\'s side a body on the platform boards it (u)');

export class Transit {
  constructor(city, fleet) {
    this.city = city; this.fleet = fleet; this.stations = []; this.riders = new Set();
    const T = city.T, walkish = (cx, cy) => { const s = city.surfaceAt(cx, cy); return city.walkable(cx, cy) && s !== 'road' && s !== 'water' && s !== 'deep'; };
    for (const d of city.decks || []) {
      if (d.kind !== 'rail' || !d.path || d.path.length < 2) continue;
      const [a, b] = d.path, axis = a[0] === b[0] ? 'y' : 'x', half = Math.floor(d.width / 2), mid = axis === 'y' ? a[0] : a[1];
      for (const st of d.stations || []) {
        const [x0, y0, x1, y1] = st.rect, sides = [];
        for (const side of [-1, 1]) {
          // the platform: the station's cells beside the track on that side; its middle, up at the deck's height
          const p0 = side < 0 ? (axis === 'y' ? x0 : y0) : mid + half + 1 + (d.width % 2 ? 0 : -1), p1 = side < 0 ? mid - half - 1 : (axis === 'y' ? x1 : y1);
          if (p1 < p0) continue;
          const along0 = axis === 'y' ? y0 : x0, along1 = axis === 'y' ? y1 : x1, am = (along0 + along1) / 2, across = (p0 + p1 + 1) / 2;
          const platform = axis === 'y' ? [across * T, (am + .5) * T, d.z] : [(am + .5) * T, across * T, d.z];
          // the stairs' foot: the sidewalk cell just past the platform's outer edge, the row nearest the middle that has one
          const out = side < 0 ? p0 - 1 : p1 + 1; let foot = null;
          for (let k = 0; k <= along1 - along0 && !foot; k++) for (const s of k ? [-k, k] : [0]) {
            const r = Math.round(am) + s; if (r < along0 || r > along1) continue;
            const [cx, cy] = axis === 'y' ? [out, r] : [r, out]; if (walkish(cx, cy)) { foot = [(cx + .5) * T, (cy + .5) * T, 0]; break; }
          }
          if (!foot) continue;
          sides.push({ side, platform, foot, cells: axis === 'y' ? [p0, along0, p1, along1] : [along0, p0, along1, p1], top: [axis === 'y' ? platform[0] : foot[0], axis === 'y' ? foot[1] : platform[1], d.z] });
        }
        if (sides.length) this.stations.push({ name: st.name, deck: d, axis, rect: st.rect, sides, z: d.z });
      }
    }
    if (fleet) fleet.transit = this;
  }
  /** the station side whose platform cells hold p (up at the deck's height), or null */
  sideAt(p) {
    const T = this.city.T, cx = Math.floor(p.x / T), cy = Math.floor(p.y / T);
    for (const st of this.stations) {
      if (Math.abs((p.z || 0) - st.z) > 10) continue;
      for (const s of st.sides) { const [a0, b0, a1, b1] = s.cells; if (cx >= a0 && cx <= a1 && cy >= b0 && cy <= b1) return { station: st, side: s }; }
    }
    return null;
  }
  stationAt(p) { const q = this.sideAt(p); return q ? q.station : null; }
  /** stairs within reach of a body on foot: up from a sidewalk's foot, down from the platform's top */
  stairsAt(p) {
    if (!p || p.seat || p.dead || this.riders.has(p)) return null;
    const r = TUNE.stairsReach;
    for (const st of this.stations) for (const s of st.sides) {
      if ((p.z || 0) < 4 && Math.hypot(p.x - s.foot[0], p.y - s.foot[1]) < r) return { station: st, side: s, up: true, to: s.top };
      if (Math.abs((p.z || 0) - st.z) < 10 && Math.hypot(p.x - s.top[0], p.y - s.top[1]) < r) return { station: st, side: s, up: false, to: s.foot };
    }
    return null;
  }
  /** a train stopped with its doors open at the station p stands on, and its car nearest p within reach */
  trainAt(p) {
    if (!p || p.seat || p.dead || this.riders.has(p) || !this.fleet) return null;
    const at = this.sideAt(p); if (!at) return null;
    let best = null, bd = TUNE.trainReach;
    for (const tr of this.fleet.trains) {
      if (tr.state !== 'stop' || tr.doors < .5 || tr.station !== at.station.name) continue;
      for (const c of tr.cars) {
        const dx = p.x - c.x, dy = p.y - c.y, co = Math.cos(c.heading), sn = Math.sin(c.heading), lx = dx * co + dy * sn, ly = -dx * sn + dy * co;
        if (Math.abs(lx) > c.hl + 8) continue;   // (its end doors: the gap between two cars in reach of both)
        const d = Math.abs(ly) - c.hw; if (d < bd) { bd = d; best = { train: tr, car: c }; }
      }
    }
    return best;
  }
  /** aboard: hidden in the car, carried with it */
  board(p, train, car) { p.onTrain = { train, car: car.index }; this.riders.add(p); this._carry(p); return true; }
  riding(p) { return !!(p && p.onTrain); }
  /** off at a stop, onto that station's platform on the car's side (beside its doors): false while it runs */
  alight(p) {
    const R = p && p.onTrain; if (!R) return false;
    const tr = R.train, c = tr.cars[R.car]; if (tr.state !== 'stop' || !tr.station) return false;
    const st = this.stations.find(s => s.name === tr.station); if (!st) return false;
    let best = null, bd = Infinity; for (const s of st.sides) { const d = Math.hypot(s.platform[0] - c.x, s.platform[1] - c.y); if (d < bd) { bd = d; best = s; } }
    const T = this.city.T, [a0, b0, a1, b1] = best.cells, x = st.axis === 'y' ? best.platform[0] : Math.min((a1 + .5) * T, Math.max((a0 + .5) * T, c.x)), y = st.axis === 'y' ? Math.min((b1 + .5) * T, Math.max((b0 + .5) * T, c.y)) : best.platform[1];
    p.onTrain = null; this.riders.delete(p); p.place(x, y, st.z); if (p.mover) { p.mover.vx = p.mover.vy = 0; }
    return true;
  }
  /** each step, after the fleet's: the riders carried with their cars (the dead or seated let go) */
  update() { for (const p of [...this.riders]) { if (p.dead || !p.onTrain) { this.riders.delete(p); if (p.onTrain) p.onTrain = null; continue; } this._carry(p); } }
  _carry(p) { const R = p.onTrain, c = R.train.cars[R.car]; p.place(c.x, c.y, c.z + 2); if (p.mover) { p.mover.facing = c.heading; p.mover.vx = p.mover.vy = 0; } }
  /** the side of station `name` from which the next train reaches station `to` soonest (-1 | 1; null: unknown) */
  towardSide(name, to) {
    const st = this.stations.find(s => s.name === name), L = this.fleet && this.fleet.lines.find(l => l.stations.some(q => q.name === to)); if (!st || !L) return null;
    let best = null, bd = Infinity;
    for (const s of st.sides) {
      const sFrom = L.nearest(s.platform[0], s.platform[1]); let d = Infinity;
      for (const q of L.stations) if (q.name === to) { let k = q.s - sFrom; k = ((k % L.length) + L.length) % L.length; d = Math.min(d, k); }
      if (d < bd) { bd = d; best = s.side; }
    }
    return best;
  }
}

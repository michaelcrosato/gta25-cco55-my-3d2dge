// Fire (PLAN.md 8.12): burning cells on the city grid. A cell burns while it has fuel; a hot cell sets its neighbours
// alight by how well they burn (grass and wooden piers well, asphalt barely, water never); rain damps it; it burns out.
// Each hop passes on a little less vigour, so a grass fire spreads into a patch and stops rather than taking the park.
// Molotovs and flamethrowers add fire with fuel of their own, so a puddle of petrol burns on bare asphalt too. Bodies
// standing in it burn (damageAt); burning bodies light the cells they cross (ignite). The spread draws from the 'fire'
// RNG stream, so the same throws burn the same way.
import { RNG } from '../core/rng.js';
import { TUNE, knob } from '../core/tune.js';

knob('Combat', 'fireSpread', 'Fire spread', .9, 0, 5, .05, 'Chance a second that a hot cell lights a neighbour that burns well');
knob('Combat', 'fireDps', 'Fire damage', 14, 0, 100, 1, 'Damage a second to a body in a fully burning cell');
knob('Combat', 'rainDamp', 'Rain damping', 2.5, 0, 10, .1, 'How much faster fire dies in a downpour');
knob('Combat', 'fireHop', 'Fire vigour per hop', .62, 0, 1, .02, 'The vigour a cell lit by a neighbour keeps (1: it spreads without end)');
/** how well each surface burns (0 never .. 1 well) and the seconds of its own fuel once lit */
export const FLAMMABLE = { grass: [1, 7], park: [1, 7], dirt: [.25, 2], sand: [.05, 1], pier: [.9, 10], lot: [.3, 3], yard: [.3, 3], walk: [.12, 1.5], plaza: [.12, 1.5],
  road: [.08, 1.2], alley: [.2, 2], bridge: [.08, 1.2], quay: [.1, 1.5], rail: [.15, 2], curb: [.1, 1], water: [0, 0], deep: [0, 0] };

export class Fire {
  /** city: a CityMap (surfaceAt, w, h, T) */
  constructor(city) {
    this.city = city; this.w = city.w; this.h = city.h; this.T = city.T;
    /** heat 0..1, fuel (seconds) and vigour (0..1: how keenly it spreads) per cell; the burning cells' indices */
    this.heat = new Float32Array(this.w * this.h); this.fuel = new Float32Array(this.w * this.h); this.vigor = new Float32Array(this.w * this.h); this.live = new Set();
    /** cells that have burned out: scorched (drawn dark) and not lit again by a neighbour (petrol still burns on them) */
    this.burnt = new Uint8Array(this.w * this.h);
    this.rs = RNG.stream('fire');
  }
  _flam(i) { const f = FLAMMABLE[this.city.surfaceAt(i % this.w, (i / this.w) | 0)]; return f || [.2, 2]; }
  /** set a disc alight: a world point, its radius (u), heat (0..1), the fuel it brings (seconds: petrol) and its vigour */
  add(x, y, r = 0, heat = 1, fuel = 0, vigor = 1) {
    const T = this.T, c0 = Math.floor((x - r) / T), c1 = Math.floor((x + r) / T), r0 = Math.floor((y - r) / T), r1 = Math.floor((y + r) / T);
    for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
      if (cx < 0 || cy < 0 || cx >= this.w || cy >= this.h || Math.hypot((cx + .5) * T - x, (cy + .5) * T - y) > r + T * .5) continue;
      const i = cy * this.w + cx, [flam, own] = this._flam(i); if (flam <= 0 && fuel <= 0) continue;
      this.heat[i] = Math.max(this.heat[i], heat); this.fuel[i] = Math.max(this.fuel[i], own + fuel); this.vigor[i] = Math.max(this.vigor[i], vigor); this.live.add(i);
    }
  }
  /** put out the cells within r of a point (the Pumper's water cannon): they stop burning, scorched */
  douse(x, y, r = 8) {
    const T = this.T; let n = 0;
    for (const i of [...this.live]) { const cx = i % this.w, cy = (i / this.w) | 0; if (Math.hypot((cx + .5) * T - x, (cy + .5) * T - y) > r + T * .5) continue; this.heat[i] = 0; this.fuel[i] = 0; this.vigor[i] = 0; this.burnt[i] = 1; this.live.delete(i); n++; }
    return n;
  }
  /** a burning body crossing a point lights it (if it burns at all) */
  ignite(x, y) { this.add(x, y, 0, .7, 0, .6); }
  /** step: dt seconds; wet: the streets' wetness 0..1 (rain damps the fire) */
  update(dt, wet = 0) {
    const W = this.w, damp = 1 + TUNE.rainDamp * wet, lit = [];
    for (const i of this.live) {
      this.fuel[i] -= dt * damp;
      if (this.fuel[i] <= 0) { this.heat[i] -= dt * .8 * damp; if (this.heat[i] <= 0) { this.heat[i] = 0; this.fuel[i] = 0; this.vigor[i] = 0; this.burnt[i] = 1; this.live.delete(i); continue; } }
      else this.heat[i] = Math.min(1, this.heat[i] + dt * .5);
      if (this.heat[i] < .5) continue;
      const cx = i % W, cy = (i / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= this.h) continue;
        const j = ny * W + nx; if (this.heat[j] > 0 || this.burnt[j]) continue;
        const [flam, own] = this._flam(j);
        if (flam > 0 && this.rs.next() < TUNE.fireSpread * flam * this.heat[i] * this.vigor[i] * dt / damp) lit.push([j, own, this.vigor[i] * TUNE.fireHop]);
      }
    }
    for (const [j, own, v] of lit) { this.heat[j] = .55; this.fuel[j] = own; this.vigor[j] = v; this.live.add(j); }
  }
  /** the heat of the cell under a world point (0 not burning .. 1) */
  heatAt(x, y) { const cx = Math.floor(x / this.T), cy = Math.floor(y / this.T); return cx < 0 || cy < 0 || cx >= this.w || cy >= this.h ? 0 : this.heat[cy * this.w + cx]; }
  /** damage a second to a body standing at a world point */
  damageAt(x, y) { return this.heatAt(x, y) * TUNE.fireDps; }
  /** how many cells burn */
  get count() { return this.live.size; }
  /** for state hashes: the burning cells and their heat, rounded */
  hash() { let h = 0; for (const i of [...this.live].sort((a, b) => a - b)) h = (h * 31 + i * 7 + Math.round(this.heat[i] * 100)) >>> 0; return h; }
}

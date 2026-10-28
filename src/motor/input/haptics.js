// The DualSense's triggers and lights (L7), through input/dualsense-hid.js where the page has one open: what the player
// holds, felt in R2 and L2, and the light bar in the character's colour (the police's red and blue under stars, a red
// pulse badly hurt), the player lights the stars' count. Presentation only, like the rumble (which it carries too, the
// motors' report the same one): nothing reads it back, never headless, and in the attract mode and the menus the
// triggers are free and the light bar dim.
//   In a vehicle, driving: R2 the throttle's give and L2 the brake's, firmer in a heavy one; the engine coughing in R2
//   when it smokes; free off the ground (a jump), and a plane's stall shaking R2. On foot with a gun drawn and loaded:
//   L2 the aim's light stop, R2 the gun's (a break for a single shot by its kick, a buzz at its rate for an automatic,
//   a long hard pull for the heavy ones); empty, reloading or unarmed, free.
//   const T = new Haptics(game, { hid, player(), off(), stars(), color() }); each frame T.frame(dt); T.dispose()
import { OFF } from './dualsense-hid.js';

const hexRgb = h => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return null; const n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const DIM = [16, 16, 28];

/** the triggers' effects for the player p (a Ped): { right, left } */
export function triggersFor(p) {
  if (!p || p.dead || (p.vitals && p.vitals.dead)) return { right: OFF, left: OFF };
  const v = p.seat && p.seat.vehicle;
  if (v) {
    if (v.driver !== p || !v.body || (v.damage && v.damage.wrecked)) return { right: OFF, left: OFF };
    const b = v.body, cls = v.cls, mass = (v.def && v.def.handling && v.def.handling.mass) || 1200;
    if (cls === 'plane') {
      if (b.stalled) return { right: { mode: 'vibration', from: 0, k: 6, hz: 18 }, left: OFF };   // (the stall's buffet)
      return { right: { mode: 'feedback', from: 3, k: 3 }, left: { mode: 'feedback', from: 2, k: 3 } };
    }
    if (cls === 'heli' || cls === 'boat') return { right: { mode: 'feedback', from: 2, k: 2 }, left: { mode: 'feedback', from: 2, k: 2 } };
    if (b.airborne) return { right: OFF, left: OFF };
    const heavy = Math.max(0, Math.min(3, Math.round((mass - 900) / 400)));   // (a bike 0, a car 1, a van 2, the bus 3)
    const right = v.damage && v.damage.smoking ? { mode: 'vibration', from: 1, k: 3, hz: 11 } : { mode: 'feedback', from: 1, k: 2 + heavy };
    return { right, left: { mode: 'feedback', from: 3, k: 4 + heavy } };
  }
  const inv = p.inv, s = inv && inv.spec && inv.spec();
  if (!s || s.slot === 'melee' || s.slot === 'thrown' || s.projectile === 'photo') return { right: OFF, left: OFF };
  const id = inv.current, inMag = s.mag ? (inv.mag && inv.mag[id]) || 0 : (inv.ammo && inv.ammo[id]) || 0;
  const left = { mode: 'feedback', from: 2, k: 2 };
  if (inMag <= 0 || inv.reloading > 0) return { right: OFF, left };
  const kick = Math.max(s.recoil || 0, s.rumble || 0);
  if (s.slot === 'heavy' && s.projectile !== 'stream' && s.projectile !== 'zap') return { right: { mode: 'weapon', from: 4, to: 8, k: 8 }, left };
  if (s.rate > 4 || s.projectile === 'stream' || s.projectile === 'zap') return { right: { mode: 'vibration', from: 3, k: Math.max(2, Math.min(6, Math.round(2 + kick * 6))), hz: Math.max(8, Math.min(40, Math.round(s.rate * 2.5))) }, left };
  return { right: { mode: 'weapon', from: 3, to: 6, k: Math.max(2, Math.min(8, Math.round(3 + kick * 6))) }, left };
}

/** the light bar's colour at time t: the stars' red and blue, a hurt red pulse, or the character's own */
export function lightFor(p, stars, color, t) {
  if (stars > 0) return Math.floor(t * 4) % 2 ? [0, 40, 255] : [255, 0, 24];
  const V = p && p.vitals, rgb = hexRgb(color) || [255, 255, 255];
  if (V && !V.dead && V.health > 0 && V.health / (V.maxHealth || 100) < .25) { const k = .35 + .65 * (.5 + .5 * Math.cos(t * 7)); return [Math.round(255 * k), 0, 0]; }
  return rgb;
}

export class Haptics {
  /** game: the E.Game; o.hid: a DualSenseHID; o.player(): the possessed ped; o.off(): true while the triggers rest (the
   *  attract mode, a menu); o.stars(): the wanted level; o.color(): the character's colour (#rrggbb) */
  constructor(game, o = {}) {
    this.game = game; this.hid = o.hid || null; this.player = o.player || (() => null); this.off = o.off || (() => false);
    this.stars = o.stars || (() => 0); this.color = o.color || (() => null); this.t = 0;
  }
  get live() { return !!this.hid && this.hid.connected && !this.game.headless; }
  frame(dt) {
    const H = this.hid; if (!this.live) return;
    this.t += dt || 0;
    if (this.off()) { H.trigger('right', OFF); H.trigger('left', OFF); H.light(...DIM); H.players(0); H.flush(); return; }
    const p = this.player(), T = triggersFor(p), n = Math.max(0, Math.min(5, this.stars() | 0));
    H.trigger('right', T.right); H.trigger('left', T.left);
    H.light(...lightFor(p, n, this.color(), this.t)); H.players(n); H.flush();
  }
  /** everything let go (the scene left) */
  dispose() { const H = this.hid; if (!this.live) return; H.trigger('right', OFF); H.trigger('left', OFF); H.light(...DIM); H.players(0); H.flush(); }
}

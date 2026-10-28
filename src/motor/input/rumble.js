// The controller's rumble (PLAN.md 8.1): the profiles, from the BUS and the frame, played through the engine's
// input.rumble (scaled by the Vibration setting; nothing without a pad), or, while a DualSense is open by WebHID
// (input/dualsense-hid.js, L7), through that controller's own report with its triggers and light. Presentation only: it listens and shakes,
// nothing reads it back, a headless game never rumbles, and neither does the attract mode (a demo would buzz a
// controller left on the table).
//   - crash: the player's vehicle hit, by how hard;
//   - gunshot: the player's own shots, by the weapon (its spec's rumble); a blow the player lands, by how hard (the
//     engine's hitFx rumble, which can't tell the demo, is off);
//   - explosion: by how near the blast is and how big;
//   - heartbeat: a lub-dub while the player is badly hurt;
//   - landing: the player's vehicle back on its wheels after a jump, by how hard it came down.
//   const R = new Rumble(game, { player(), off() }).attach();  each frame R.frame(dt);  R.dispose()
import { BUS } from '../core/bus.js';

const NEAR = 320;   // (u: a blast farther off than this shakes nothing)

export class Rumble {
  /** game: the E.Game; o.player(): the possessed ped; o.off(): true while it mustn't rumble (the attract mode) */
  constructor(game, o = {}) { this.game = game; this.player = o.player || (() => null); this.off = o.off || (() => false); this.unsub = []; this.beatT = 0; this.dub = 0; this.air = false; this.played = []; }
  /** a shake of strength k (0..1) for secs; false when nothing could rumble */
  shake(k, secs) {
    const G = this.game; if (G.headless || this.off() || !G.input || !G.input.rumble || !(k > 0)) return false;
    this.played.push([+k.toFixed(2), +secs.toFixed(2)]); if (this.played.length > 16) this.played.shift();   // (the last few, for the tests)
    const H = G.haptics; if (H && H.connected) { const q = Math.min(1, k) * Math.max(0, Math.min(1, G.input.rumbleScale ?? .6)); return q > 0 && H.motors(q, Math.min(1, q * 1.25), secs); }   // (a DualSense opened by WebHID: its own report, L7)
    return G.input.rumble(Math.min(1, k), secs);
  }
  /** listen to the game's events (the scene's scope: gone with the scene) */
  attach() {
    const on = (ev, fn) => this.unsub.push(BUS.on(ev, fn, 'scene')), me = () => this.player();
    const mine = id => { const p = me(); if (!p) return false; const v = p.seat && p.seat.vehicle; return id === p.id || (!!v && id === v.id); };
    on('vehicleDamage', e => { const n = e.amount || 0; if (mine(e.vehicle) && n > 2) this.shake(.25 + Math.min(.75, n / 40), .1 + Math.min(.25, n / 160)); });
    on('crime', e => { const p = me(); if (e.type !== 'shooting' || !p || e.by !== p.id) return; const s = p.inv && p.inv.spec(); if (s && s.rumble > 0) this.shake(s.rumble, .05 + s.rumble * .1); });
    on('hit', e => { const p = me(); if (p && e.by === p.id && e.kind === 'melee' && e.damage > 0) this.shake(.2 + Math.min(.4, e.damage / 60), .06); });
    on('explode', e => { const p = me(); if (!p) return; const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < NEAR) this.shake((1 - d / NEAR) * Math.min(1, .5 + (e.power || 50) / 150), .2 + (1 - d / NEAR) * .3); });
    return this;
  }
  /** each frame: the heartbeat and the landings */
  frame(dt) {
    const p = this.player(); if (!p) return;
    const V = p.vitals, low = V && !V.dead && V.health > 0 && V.health / (V.maxHealth || 100) < .25;
    if (low) { this.beatT -= dt; if (this.beatT <= 0) { this.beatT = .9; this.dub = .18; this.shake(.22, .06); } if (this.dub > 0 && (this.dub -= dt) <= 0) this.shake(.12, .05); }
    else { this.beatT = 0; this.dub = 0; }
    const v = p.seat && p.seat.vehicle, b = v && v.body, air = !!(b && b.airborne);   // (the speed it falls at, the frame before it lands: a step's felt.land is gone by the frame)
    if (air) this.fall = Math.max(this.fall || 0, -(b.vz || 0));
    else { if (this.air && b && this.fall > 60) this.shake(Math.min(1, .25 + this.fall / 400), .12 + Math.min(.2, this.fall / 1200)); this.fall = 0; }
    this.air = air;
  }
  dispose() { for (const u of this.unsub) u(); this.unsub = []; }
}

// The SFX map (PLAN.md 8.17): what the game's events sound like, from the BUS, plus the sounds a frame asks for
// (footsteps by surface, a horn held, a gang's payphone ringing). Presentation only: it listens and plays, nothing reads
// it back, and a headless game never hears it. A sound with a place is played only near the listener, quieter farther
// off; each goes through the engine's sfx() (its presets, and MOTOR's own defined here), so the effects bus, the volume
// settings and mute hold. The guns and the swings are combat's own; the menus' are the screens'.
//   const M = new SfxMap(game, () => listener [x, y], { isPlayer(id), where(vehicleId) });  M.attach();  each frame
//   M.frame(dt, { steps, horns, rings });  M.dispose()
import { BUS } from '../core/bus.js';

/** MOTOR's own sounds, added to the engine's presets */
export const SOUNDS = {
  glass: [{ wave: 'noise', freq: 5200, to: 2600, dur: .22, vol: .3, filter: 'highpass', q: 1.2 }, { wave: 'triangle', freq: 2400, to: 1800, dur: .08, vol: .1, delay: .02 }],
  crunch: [{ wave: 'noise', freq: 420, to: 120, dur: .3, vol: .45, filter: 'lowpass' }, { wave: 'square', freq: 90, to: 50, dur: .18, vol: .18 }],
  doorShut: [{ wave: 'noise', freq: 900, to: 400, dur: .09, vol: .22 }, { wave: 'square', freq: 120, dur: .06, vol: .1, delay: .07 }],
  cash: [{ wave: 'square', freq: 1320, dur: .05, vol: .14 }, { wave: 'square', freq: 1760, dur: .09, vol: .14, delay: .05 }],
  spray: { wave: 'noise', freq: 3000, dur: .9, vol: .16, filter: 'highpass', hold: true },
  stepHard: { wave: 'noise', freq: 1600, dur: .03, vol: .05 }, stepSoft: { wave: 'noise', freq: 500, dur: .05, vol: .045, filter: 'lowpass' }, stepWet: { wave: 'noise', freq: 2400, dur: .06, vol: .06, filter: 'highpass' },
  stepMetal: [{ wave: 'noise', freq: 2000, dur: .03, vol: .05 }, { wave: 'triangle', freq: 640, dur: .05, vol: .04 }],
  hornCar: { wave: 'square', freq: 392, dur: .32, vol: .18, hold: true }, hornTruck: [{ wave: 'saw', freq: 220, dur: .5, vol: .18, hold: true }, { wave: 'saw', freq: 277, dur: .5, vol: .12, hold: true }],
  hornBike: { wave: 'pulse', freq: 880, dur: .16, vol: .14, hold: true }, hornBoat: { wave: 'saw', freq: 150, dur: .8, vol: .2, hold: true },
  ringSaints: { wave: 'triangle', freq: 1320, arp: [0, 4, 7, 12], step: .07, dur: .6, vol: .16, loop: true }, ringRats: { wave: 'square', freq: 660, arp: [0, 0, 5, 5], step: .1, dur: .7, vol: .12, loop: true },
  ringGnomes: { wave: 'sine', freq: 990, arp: [0, 7, 0, 7], step: .09, dur: .7, vol: .18, loop: true }, ringCrew: { wave: 'pulse', freq: 1046, arp: [0, 3], step: .12, dur: .6, vol: .12, loop: true },
};
const NEAR = 520;   // (u: beyond this a sound with a place isn't heard)
const HORNS = { car: 'hornCar', truck: 'hornTruck', bike: 'hornBike', boat: 'hornBoat' };
const STEPS = { road: 'stepHard', walk: 'stepHard', curb: 'stepHard', plaza: 'stepHard', alley: 'stepHard', lot: 'stepHard', quay: 'stepHard', bridge: 'stepMetal', pier: 'stepMetal', rail: 'stepMetal', grass: 'stepSoft', park: 'stepSoft', dirt: 'stepSoft', sand: 'stepSoft', yard: 'stepSoft' };

export class SfxMap {
  /** game: the E.Game; listener(): [x, y] (the camera's focus); o.isPlayer(id): the player's doing (a door slammed by
   *  everyone in the city would be a din); o.where(vehicleId): a vehicle's [x, y] (events that name one) */
  constructor(game, listener, o = {}) { this.game = game; this.listener = listener; this.isPlayer = o.isPlayer || (() => true); this.where = o.where || (() => null); this.unsub = []; this.stepT = 0; this.hornT = {}; this.ringT = 0; this.defined = false; }
  _define() { const A = this.game.audio; if (this.defined || !A || !A.define) return; for (const [k, v] of Object.entries(SOUNDS)) A.define(k, v); this.defined = true; }
  /** play a sound; at [x, y]: only near the listener, quieter with distance */
  play(name, at = null, o = {}) {
    const A = this.game.audio; if (this.game.headless || !A || !A.ready) return false;
    this._define();
    let vol = o.vol ?? 1;
    if (at) { const L = this.listener(), d = L ? Math.hypot(at[0] - L[0], at[1] - L[1]) : 0; if (d > NEAR) return false; vol *= Math.pow(1 - d / NEAR, 1.5); }
    A.sfx(name, { vol, pitch: o.pitch }); return true;
  }
  /** listen to the game's events (the scene's scope: gone with the scene) */
  attach() {
    const on = (ev, fn) => this.unsub.push(BUS.on(ev, fn, 'scene')), P = e => (e && Number.isFinite(e.x) ? [e.x, e.y] : null);
    on('explode', e => this.play('explode', P(e), { vol: Math.min(1, .5 + (e.power || 50) / 200) }));
    on('vehicleDestroyed', e => this.play('explode', P(e) || this.where(e.vehicle), { vol: 1, pitch: .8 }));
    on('vehicleDamage', e => { if ((e.amount || e.damage || 0) > 4) this.play(e.glass ? 'glass' : 'crunch', P(e), { vol: Math.min(1, .3 + (e.amount || e.damage || 0) / 40) }); });
    on('hit', e => this.play('hit', P(e), { vol: .5 }));
    on('carjack', e => { if (this.isPlayer(e.by)) this.play('doorShut'); }); on('vehicleEnter', e => { if (this.isPlayer(e.actor)) this.play('doorShut', null, { vol: .7 }); }); on('vehicleExit', e => { if (this.isPlayer(e.actor)) this.play('doorShut', null, { vol: .6 }); });
    on('pickup', () => this.play('pickup', null, { vol: .7 })); on('collectible', () => this.play('coin'));
    on('cash', e => { if ((e.amount || 0) > 0 && e.reason !== 'pickup') this.play('cash', null, { vol: .8 }); });
    on('respray', () => this.play('spray')); on('stunt', () => this.play('powerup', null, { vol: .8 }));
    on('missionPass', () => this.play('oneup')); on('stageFail', () => this.play('hurt', null, { vol: .6 }));
    on('wrecked', () => this.play('die')); on('busted', () => this.play('die', null, { pitch: .8 }));
    on('takedown', e => { if (this.isPlayer(e.by)) this.play('punch'); }); on('switch', () => this.play('warp', null, { vol: .6 }));
    on('wanted', e => { if (e && e.stars > (e.prev || 0)) this.play('blip', null, { vol: .5 }); });
    on('save', () => this.play('confirm'));
    return this;
  }
  /** each frame: o { steps: { x, y, speed, surface, wet } (the possessed one on foot), horns: [{ x, y, kind }] (held),
   *  rings: [{ x, y, gang }] (a payphone with a job on offer) } */
  frame(dt, o = {}) {
    if (this.game.headless) return;
    const s = o.steps;
    if (s && s.speed > 25) { this.stepT -= dt; if (this.stepT <= 0) { this.stepT = s.speed > 110 ? .24 : .34; this.play(s.wet && STEPS[s.surface] !== 'stepMetal' ? 'stepWet' : STEPS[s.surface] || 'stepHard', null, { vol: .8 }); } } else this.stepT = 0;
    for (const h of o.horns || []) { const k = h.id || 'h'; this.hornT[k] = (this.hornT[k] || 0) - dt; if (this.hornT[k] <= 0) { this.hornT[k] = .3; this.play(HORNS[h.kind] || 'hornCar', [h.x, h.y]); } }
    this.ringT -= dt; if (this.ringT <= 0) { this.ringT = 2.6; for (const r of o.rings || []) this.play('ring' + (r.gang ? r.gang[0].toUpperCase() + r.gang.slice(1) : 'Crew'), [r.x, r.y], { vol: .8 }); }
  }
  dispose() { for (const u of this.unsub) u(); this.unsub = []; }
}

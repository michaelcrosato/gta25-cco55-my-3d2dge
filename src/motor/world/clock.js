// The world clock (PLAN.md 8.6): one game day in TUNE.dayMinutes real minutes (24: a game minute a real second). It
// steps with the simulation (fixed dt), so a replay keeps the same hour; what the hour looks like is render/sky.js.
//   ?time=day | dusk | night | dawn | <hour 0-24> sets the start; the clock runs on from there.
import { TUNE, knob } from '../core/tune.js';

knob('World', 'dayMinutes', 'Day length', 24, 2, 120, 1, 'Real minutes for one game day (24: a game minute each real second)');

/** the start hours the ?time= names stand for */
export const TIMES = { dawn: 6, morning: 9, day: 12, noon: 12, afternoon: 15.5, dusk: 19, evening: 20.5, night: 23, midnight: 0 };

export class WorldClock {
  /** hour: the start (0-24) */
  constructor(hour = TIMES.night) { this.hour = TIMES.night; this.day = 0; this.running = true; this.set(hour); }   // (an unknown start is night)
  /** an hour (0-24), or a name from TIMES; unknown values keep the hour */
  set(h) {
    const v = typeof h === 'string' ? (h in TIMES ? TIMES[h] : parseFloat(h)) : h;
    if (Number.isFinite(v)) this.hour = ((v % 24) + 24) % 24;
    return this;
  }
  /** advance by dt seconds of game time */
  update(dt) {
    if (!this.running) return;
    this.hour += dt * 24 / (TUNE.dayMinutes * 60);
    while (this.hour >= 24) { this.hour -= 24; this.day++; }
  }
  /** 'HH:MM' */
  label() { const m = Math.floor(this.hour * 60) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
}

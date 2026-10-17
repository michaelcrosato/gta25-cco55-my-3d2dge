// The activity monitor (PLAN.md 8.1, 8.20): how long since the player last did anything with any device. It reads
// GTM-PATCH(4)'s input.raw.activity (keys bound or not, mouse moves, clicks, the wheel, touches, any pad button, a
// stick past the dead zone, a trigger), so an unbound key or a stick nudge counts, which anyPressed() misses (ENG:904).
export class Activity {
  constructor(input) { this.input = input; this.mark = 0; }
  /** restart the idle clock now (a scene's enter) */
  reset() { this.mark = this.input.clock; return this; }
  /** the input clock at the last activity, or the mark if that is later */
  get last() { return Math.max(this.input.raw ? this.input.raw.activity : -1, this.mark); }
  /** seconds since the last activity */
  idle() { return this.input.clock - this.last; }
  /** did anything happen since the input clock read t? */
  since(t) { return (this.input.raw ? this.input.raw.activity : -1) > t; }
}

/** kiosk mode (PLAN.md 8.20): ?kiosk=1, or a touch-first device (a coarse pointer and no fine one) */
export function kioskWanted(links) {
  if (links && links.query && links.query.get('kiosk') === '1') return true;
  if (typeof matchMedia !== 'function') return false;
  try { return matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches; } catch { return false; }
}

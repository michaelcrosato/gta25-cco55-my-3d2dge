// Traffic signals (PLAN.md 8.7): each signalled junction cycles north-south green, amber, all red, then east-west green,
// amber, all red, offset junction by junction (a hash of where it is) so the city doesn't change all at once. Stop-sign
// junctions have no phases: a driver stops, then goes when the box is clear (the driver's business). Plain functions of
// the simulation's time: deterministic, and the same in every view.
//   signalAt(region, t) -> { ns: 'green' | 'amber' | 'red', ew: ... }   ·   lightFor(conn, regions, t) -> 'green' ...
import { TUNE, knob } from '../core/tune.js';

knob('Traffic', 'signalGreen', 'Green time', 11, 3, 40, .5, 'Seconds a signal shows green to one road');
knob('Traffic', 'signalAmber', 'Amber time', 2.5, 1, 6, .25, 'Seconds of amber before red');
knob('Traffic', 'signalClear', 'All-red time', 1.5, 0, 5, .25, 'Seconds every way is red between phases (the box clears)');

/** the cycle's length in seconds */
export const cycleLength = () => 2 * (TUNE.signalGreen + TUNE.signalAmber + TUNE.signalClear);
/** the junction's offset into the cycle (from its box: the same junction always the same) */
export function signalOffset(region) { const [x0, y0] = region.box; const h = Math.imul(Math.round(x0) * 73856093 ^ Math.round(y0) * 19349663, 2654435761) >>> 0; return (h % 1000) / 1000 * cycleLength(); }
/** the lights at a junction at time t: { ns, ew } (a stop junction: both 'stop') */
export function signalAt(region, t) {
  if (!region || region.signals !== 'signal') return { ns: 'stop', ew: 'stop' };
  const G = TUNE.signalGreen, A = TUNE.signalAmber, Cl = TUNE.signalClear, L = cycleLength(), u = ((t + signalOffset(region)) % L + L) % L;
  const phase = (p) => p < G ? 'green' : p < G + A ? 'amber' : 'red';
  if (u < G + A + Cl) return { ns: phase(u), ew: 'red' };
  return { ns: 'red', ew: phase(u - (G + A + Cl)) };
}
/** the light a connector's driver sees at t (null: no junction; 'stop': a stop sign) */
export function lightFor(conn, graph, t) {
  if (!conn.region || !conn.axis) return null;
  const R = graph.regions.find(r => r.id === conn.region); if (!R) return null;
  return signalAt(R, t)[conn.axis];
}

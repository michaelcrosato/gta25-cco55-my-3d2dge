// A random event (PLAN.md 9.5): a police chase passing. A little way up the road from the player a getaway car tears
// off, an MPD cruiser on its tail. Join the chase: stop the getaway car (ram it half to bits, or box it in and stop it
// with your car on it) and the MPD pays a citizen's reward. Or help the crooks: put the cruiser out of it, and they
// toss you a cut as they go (and the MPD remembers the face: two stars once it's over). The getaway car gets clean
// away (900 u off): it ends, quietly. While it is on, the chase's knocks earn no star (the stars the player had before
// are back after, unless the cruiser's what they knocked out). The event's spot follows the getaway car (the ambient
// runtime ends an event the player leaves 900 u behind). The ambient runtime (mission/ambient.js) starts it in free roam
// with its spot in m.data.at; a deep link without one (the bot's test) parks a Brute at the curb by the safehouse for
// the player, and the chase sets off 150 u up the street ahead of it once they're at its wheel.
import { defActivity, laneNear, op } from '../../motor/index.js';

const DISPATCH = { name: 'MPD dispatch', color: '#7ab0ff' }, CROOK = { name: 'Getaway driver', color: '#c8c8d0' };
const ESCAPE = 900, REACH = 72, NEAR = 200, BEHIND = 56, AHEAD = 150;

// is a world point in (or within a cell of) a junction's box?
const inJunction = (city, x, y) => city.intersections.some(n => x >= (n.rect[0] - 1) * city.T && x < (n.rect[2] + 2) * city.T && y >= (n.rect[1] - 1) * city.T && y < (n.rect[3] + 2) * city.T);
/** where it happens: the ground lane nearest a point 220 u ahead of the player (or their car), clear of a junction and
 *  of traffic (none within 60 u of it or of the cruiser's place behind it), 140-320 u off; else nowhere (null) */
function where(W, P) {
  const C = W.city, v = P.seat && P.seat.vehicle; if (!W.roads || (P.z || 0) > 4 || (v && v.z > 4)) return null;
  const f = v ? v.heading : P.facing, q = laneNear(C, W.roads, [(v || P).x + Math.cos(f) * 220, (v || P).y + Math.sin(f) * 220], null, 0);
  if (!q || (q.z || 0) > 2 || inJunction(C, q.x, q.y)) return null;
  const bx = q.x - Math.cos(q.heading) * BEHIND, by = q.y - Math.sin(q.heading) * BEHIND;
  if (W.fleet.near(q.x, q.y, 60).length || W.fleet.near(bx, by, 60).length) return null;
  const d = Math.hypot(q.x - P.x, q.y - P.y); return d > 140 && d < 320 ? [Math.round(q.x), Math.round(q.y)] : null;
}
// the spot (a deep link's own when the ambient runtime gave none: the player at the safehouse, a car at the curb by it)
function spot(m) {
  if (!m.data.at) { m.data.deep = true; m.data.at = [296, 760]; if (m.dist(m.data.at) > 400) m.place('player', 'safehouse'); }
  return m.data.at;
}
// a point of a lane near p, running heading's way, with no vehicle on it: along the lane, 40 at a time (ks: how many
// forty ahead, a negative one back, in the order tried)
function freeLane(m, p, heading, ks) {
  for (const k of ks) {
    const q = m.lane([p[0] + Math.cos(heading) * 40 * k, p[1] + Math.sin(heading) * 40 * k], heading);
    if (!m.fleet.near(q.x, q.y, 30).length) return q;
  }
  return m.lane(p, heading);
}
// the chase sets off: the getaway car (two crooks) in its lane, running from the player; the cruiser behind it, after it
// (rammed when it's close). On a deep link 150 u up the street ahead of the player's car; else at the event's spot
const launch = m => Object.assign(m.waitUntil(() => true), { start: mm => {
  if (mm.one('getaway')) return;
  const v = mm.vehicle, q = mm.data.deep && v ? freeLane(mm, [v.x + Math.cos(v.heading) * AHEAD, v.y + Math.sin(v.heading) * AHEAD], v.heading, [0, 1, -1, 2]) : mm.lane(mm.data.at);
  mm.spawn.vehicle('cortez', [q.x, q.y], { tag: 'getaway', heading: q.heading, color: '#2a2a30', driver: 'nightowl', passengers: ['docker'], drive: { flee: 'player', style: 'fast' } });
  const b = freeLane(mm, [q.x - Math.cos(q.heading) * BEHIND, q.y - Math.sin(q.heading) * BEHIND], q.heading, [0, -1, 1]);
  mm.spawn.vehicle('cruiser', [b.x, b.y], { tag: 'cops', heading: q.heading, driver: 'mpd', drive: { chase: 'getaway', style: 'fast' } });
  mm.data.t0 = mm.stageTime;
} });
const smashed = v => !v || v.wrecked || !!(v.damage && (v.damage.burning || v.damage.share < .5));
// the getaway car caught, the player near: rammed half to bits (or wrecked, burning), or stopped with the player's car
// on it a moment after it set off
function caught(m) {
  const g = m.tagged('getaway')[0]; if (!g || m.dist(g) > NEAR) return false;
  return smashed(g) || ((g.speed || 0) < 10 && m.dist(g) < REACH && m.stageTime - (m.data.t0 ?? 0) > 3);
}
// the objective: stop it (the bot's hint: ram it, from the Brute on a deep link)
const stopIt = m => op(mm => (caught(mm) ? { value: true } : undefined), {
  nav: mm => mm.one('getaway'),
  start: mm => {
    mm.objective('A police chase! Stop the getaway car: ram it, box it in', { hint: { kind: 'kill', targets: 'getaway', vehicle: mm.data.deep ? 'ride' : null } });
    const g = mm.one('getaway'); if (g) mm.marker(g, { color: '#ff5a4a' });
  },
});
// the cruiser out of it: wrecked, burning, or smoking (a third of it left)
const copsDown = m => { const c = m.tagged('cops')[0]; return !!c && (c.wrecked || !!(c.damage && (c.damage.burning || c.damage.share < .35))); };
// while it's on, no star for the chase's knocks; however it ends, the heat it earned forgotten (the player's own stars
// from before it began are back); and the event's spot kept on the getaway car
const quiet = m => Object.assign(m.waitUntil(mm => { const g = mm.one('getaway'); if (g) mm.data.at = [Math.round(g.x), Math.round(g.y)]; return false; }), {
  start: mm => { mm.data.stars0 ??= mm.stars; mm.wanted.cap(0); },
  end: mm => { mm.wanted.clear(); if (mm.data.stars0) mm.wanted.set(mm.data.stars0); },
});

defActivity('event_police_chase', {
  title: 'Police Chase', kind: 'event', levels: 1, start: {},
  brief: ['A police chase passing: stop the getaway car, or help it get away.'],
  rewardsFor: (level, m) => ({ cash: m && m.data.helped ? 150 : 250 }),
  where,
  stages: [
    {
      id: 'pursuit',
      // (the chase itself sets off in the run: on a deep link once the player's at the Brute's wheel)
      setup(m) {
        spot(m);
        m.data.helped = false;
        if (m.data.deep && !m.vehicle) { const P = m.player, c = m.curb([P.x, P.y]); m.ensure.vehicle('ride', 'brute', [c.x, c.y], { heading: c.heading, color: '#c84a2a' }); }
        m.failIf(mm => { const g = mm.one('getaway'); return !!g && mm.dist(g) > ESCAPE; }, 'they got away');
      },
      *run(m) {
        if (m.data.deep && m.one('ride') && m.vehicle !== m.one('ride')) yield m.enter('ride', { text: 'Get in the Brute at the curb', lost: 'the Brute\'s gone' });
        yield launch(m);
        const r = yield m.first([quiet(m), m.parallel([
          m.say(['All units: a dark Cortez, two suspects, heading away from the scene. Unit 12 in pursuit.'], DISPATCH),
          stopIt(m),
        ]), m.waitUntil(copsDown)]);
        if (r.index === 2) {
          m.data.helped = true; m.wanted.set(Math.max(2, m.data.stars0 || 0));
          yield m.say(['Ha! Owe you one, pal. Here, your cut.'], CROOK);
          return;
        }
        yield m.say(['Suspects stopped. Much obliged, citizen: the MPD\'s reward is on its way.'], DISPATCH);
      },
    },
  ],
});

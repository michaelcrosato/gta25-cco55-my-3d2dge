// A random event (PLAN.md 9.5): a purse snatcher on foot. On a sidewalk a little way ahead of the player a kid grabs a
// woman's purse and legs it (he runs once the player comes near): catch him, by fair means or foul, pick up the purse he
// drops and take it back to her for a tip. A thief run ragged (a dozen seconds with the player on his heels) gives up
// where he stands. While he runs the precinct leaves it to the citizens (no star for what a catch takes; the stars the
// player had before are theirs again after). He gets away (left far behind), or she comes to harm: it ends, quietly.
// The ambient runtime (mission/ambient.js) starts it in free roam with its spot in m.data.at; a deep link without one
// (the bot's test) puts it on Sunset Strip outside St. Christopher's, the player at the safehouse.
import { defActivity } from '../../motor/index.js';

const HER = { name: 'Mrs. Pruitt', color: '#ffb0c8' }, KID = { name: 'Purse snatcher', color: '#c8c8d0' };
const HOME = [376, 816];   // (a deep link's spot: Lantern Lane's north sidewalk by the chapel, the safehouse 100 u off)
const TIRED = 12, ESCAPE = 700, REACH = 30;

/** where it happens: the sidewalk's line nearest a point 180 u ahead of the player (or their car), 100-280 u off, at
 *  street level; else nowhere (null) */
function where(W, P) {
  const S = W.roads && W.roads.walks, v = P.seat && P.seat.vehicle; if (!S || (P.z || 0) > 4 || (v && v.z > 4)) return null;
  const f = v ? v.heading : P.facing, x = (v || P).x + Math.cos(f) * 180, y = (v || P).y + Math.sin(f) * 180;
  const n = S.nearestNode(x, y, 120); if (!n) return null;
  const d = Math.hypot(n.x - P.x, n.y - P.y); return d > 100 && d < 280 ? [Math.round(n.x), Math.round(n.y)] : null;
}
// the spot (a deep link's own when the ambient runtime gave none; the player at the safehouse then, if far)
function spot(m) {
  if (!m.data.at) { m.data.at = HOME; if (m.dist(HOME) > 500) m.place('player', 'safehouse'); }
  return m.data.at;
}
// where he starts: off up the street from her, 80 u to one side square to the way the player comes from (so aimed at
// him, the lock-on doesn't take her, the nearer: she's well off to the side), on whichever side a body can stand
function aside(m, at) {
  const P = m.mover, a = Math.atan2(P.y - at[1], P.x - at[0]) + Math.PI / 2, T = m.city.T;
  for (const k of [1, -1, .75, -.75, .5, -.5]) { const x = at[0] + Math.cos(a) * 80 * k, y = at[1] + Math.sin(a) * 80 * k; if (m.city.walkable(Math.floor(x / T), Math.floor(y / T))) return [Math.round(x), Math.round(y)]; }
  return [at[0] + 12, at[1]];
}
// while it's on, no star for what the catch takes; however it ends, the heat it earned forgotten (the player's own
// stars from before it began are back)
const quiet = m => Object.assign(m.waitUntil(() => false), {
  start: mm => { mm.data.stars0 ??= mm.stars; mm.wanted.cap(0); },
  end: mm => { mm.wanted.clear(); if (mm.data.stars0) mm.wanted.set(mm.data.stars0); },
});
// run ragged (the player within 200 u of him for TIRED seconds), he gives up where he stands
function tire(m) {
  let t = 0, last = m.stageTime;
  return m.waitUntil(mm => {
    const k = mm.one('thief'), dt = mm.stageTime - last; last = mm.stageTime; if (!k || mm.data.gaveUp) return false;
    t = mm.dist(k) < 200 ? t + dt : t;
    if (t < TIRED || k.floored) return false;
    mm.data.gaveUp = true; const at = [k.x, k.y]; mm.remove(k);
    mm.spawn.ped('skater', at, { tag: 'thief', role: 'idle', health: 40, facing: Math.atan2(mm.mover.y - at[1], mm.mover.x - at[0]) });
    return false;
  });
}

defActivity('event_purse_snatcher', {
  title: 'Purse Snatcher', kind: 'event', levels: 1, start: {},
  brief: ['A purse snatcher on foot: catch him.'],
  rewards: { cash: 150 },
  where,
  stages: [
    {
      id: 'snatch',
      // her where it happened, the kid beside her with the purse (fresh on a retry), no stars for the chase
      setup(m) {
        const [x, y] = spot(m);
        m.ensure.ped('victim', 'retiree', [x, y], { role: 'idle', health: 600 });   // (stern stuff: a stray round won't fell her)
        m.data.gaveUp = false;
        m.spawn.ped('skater', aside(m, [x, y]), { tag: 'thief', role: 'flee', health: 40 });
        m.failIf(mm => !mm.one('victim'), 'she\'s hurt');
        m.failIf(mm => { const k = mm.one('thief'); return !!k && mm.dist(k) > ESCAPE; }, 'he got away');
      },
      *run(m) {
        yield m.first([quiet(m), tire(m), m.parallel([
          m.say(['Thief! Stop him! He\'s got my purse!'], HER),
          m.chase('thief', { reach: REACH, text: 'A purse snatcher! Catch him' }),
        ])]);
        const k = m.tagged('thief').slice(-1)[0], at = k ? [Math.round(k.x), Math.round(k.y)] : spot(m);
        m.data.purse = at;
        m.spawn.pickup('item', at, { item: 'purse', tag: 'purse' });
        if (k && !k.dead) yield m.say(['All right, all right! Take it!'], KID);
      },
    },
    {
      id: 'return',
      // the purse where he dropped it (a retry: where it was, unless it's picked up already), her where she stood
      setup(m) {
        const [x, y] = spot(m);
        m.ensure.ped('victim', 'retiree', [x, y], { role: 'idle', health: 600 });
        if (!m.tagged('purse').length) m.spawn.pickup('item', m.data.purse || [x + 60, y], { item: 'purse', tag: 'purse' });
        m.failIf(mm => !mm.one('victim'), 'she\'s hurt');
      },
      *run(m) {
        yield m.first([quiet(m), m.collect('purse', { text: 'Pick up her purse' })]);
        const her = m.one('victim'), at = her ? [Math.round(her.x), Math.round(her.y)] : spot(m);
        yield m.first([quiet(m), m.reach(at, { radius: 28, text: 'Take the purse back to her' })]);
        yield m.say(['My purse! Oh, bless you, dear.', 'Here, a little something for your trouble.'], HER);
      },
    },
  ],
});

// A random event (PLAN.md 9.5): a stalled car. A little way up the road from the player an old wagon has died in its
// lane, smoking, its owner on the sidewalk behind it and the traffic backing up. Get it out of the lane: push it to the
// curb with a car of your own (right there, or up to the marker at the curb ahead), or get in (it coughs back into
// life) and pull it over at the marker, and he tips you. Or jack it: drive off in it, and the road is clear all the
// same (he only shouts, and there's no tip). The car burnt out or wrecked, or its owner hurt: it ends, quietly. While
// it is on, no star for the knocks a push takes (the stars the player had before are back after). The ambient runtime
// (mission/ambient.js) starts it in free roam with its spot in m.data.at; a deep link without one (the bot's test) puts
// it on Chapel Street north of Lantern Lane, the player at the safehouse.
import { defActivity, laneNear } from '../../motor/index.js';

const OWNER = { name: 'Mr. Okonkwo', color: '#c8e0a0' };
const HOME = [510, 650];   // (a deep link's spot: Chapel Street's northbound lane, mid-block above Lantern Lane)
const AWAY = 260;   // (jacked: driven this far from where it died)
// pulled over: stopped within PARK_R of the marker (LEAN u off its lane's line, curb-ward, the first of AHEAD u up the
// lane clear of a junction: a car driven up its lane to it stops there, no swing of a long wagon's nose into the
// palms), or stopped with its middle OFF u or more off its lane's line, curb-ward, where it died (a push to the side)
const PARK_R = 30, LEAN = 22, OFF = 24, AHEAD = [100, 80, 60];

// is a world point in (or within a cell of) a junction's box?
const inJunction = (city, x, y) => city.intersections.some(n => x >= (n.rect[0] - 1) * city.T && x < (n.rect[2] + 2) * city.T && y >= (n.rect[1] - 1) * city.T && y < (n.rect[3] + 2) * city.T);
/** where it happens: the ground lane nearest a point 220 u ahead of the player (or their car), mid-block (no junction
 *  there or 60 u up the lane, no vehicle within 60 u), 140-320 u off; else nowhere (null) */
function where(W, P) {
  const C = W.city, v = P.seat && P.seat.vehicle; if (!W.roads || (P.z || 0) > 4 || (v && v.z > 4)) return null;
  const f = v ? v.heading : P.facing, q = laneNear(C, W.roads, [(v || P).x + Math.cos(f) * 220, (v || P).y + Math.sin(f) * 220], null, 0);
  if (!q || (q.z || 0) > 2 || W.fleet.near(q.x, q.y, 60).length) return null;
  if (inJunction(C, q.x, q.y) || inJunction(C, q.x + Math.cos(q.heading) * 60, q.y + Math.sin(q.heading) * 60)) return null;
  const d = Math.hypot(q.x - P.x, q.y - P.y); return d > 140 && d < 320 ? [Math.round(q.x), Math.round(q.y)] : null;
}
// the spot (a deep link's own when the ambient runtime gave none; the player at the safehouse then, if far)
function spot(m) {
  if (!m.data.at) { m.data.at = HOME; if (m.dist(HOME) > 600) m.place('player', 'safehouse'); }
  return m.data.at;
}
// the car where it died, in its lane and heading its way; which way the curb is from there (side: a unit vector, the
// nearest free curb spot's way), how far off the lane's line the curb spot is (kerb), and the marker; kept for the event
function stall(m) {
  const at = spot(m), q = m.lane(at);
  if (!m.data.lane) m.data.lane = { x: Math.round(q.x), y: Math.round(q.y), heading: q.heading };
  if (!m.data.marker) {
    const L = m.data.lane, ax = Math.cos(L.heading), ay = Math.sin(L.heading), c = m.curb([L.x, L.y]);
    let sx = -ay, sy = ax; if ((c.x - L.x) * sx + (c.y - L.y) * sy < 0) { sx = -sx; sy = -sy; }
    const a = AHEAD.find(k => !inJunction(m.city, L.x + ax * k, L.y + ay * k)) ?? AHEAD[AHEAD.length - 1];
    m.data.side = [sx, sy]; m.data.kerb = Math.round(Math.max(OFF + 8, (c.x - L.x) * sx + (c.y - L.y) * sy));
    m.data.marker = [Math.round(L.x + ax * a + sx * LEAN), Math.round(L.y + ay * a + sy * LEAN)];
  }
  return m.data.lane;
}
// where its owner stands: on the sidewalk a little behind it (out of the way of a car put to the curb), somewhere a
// body can stand
function ownerSpot(m) {
  const L = m.data.lane, [sx, sy] = m.data.side, ax = Math.cos(L.heading), ay = Math.sin(L.heading), T = m.city.T;
  for (const [out, back] of [[24, 56], [18, 56], [24, 76], [30, 56], [18, 40]]) {
    const k = m.data.kerb + out, x = L.x + sx * k - ax * back, y = L.y + sy * k - ay * back;
    if (m.city.walkable(Math.floor(x / T), Math.floor(y / T))) return [Math.round(x), Math.round(y)];
  }
  return [Math.round(L.x + sx * (m.data.kerb + 24) - ax * 56), Math.round(L.y + sy * (m.data.kerb + 24) - ay * 56)];
}
// pushed to the side where it died: stopped, its middle OFF u or more off its lane's line, curb-ward
function pushedAside(m) {
  const v = m.one('stalled'), L = m.data.lane, [sx, sy] = m.data.side;
  return !!v && (v.speed || 0) < 10 && Math.hypot(v.x - L.x, v.y - L.y) < AWAY && (v.x - L.x) * sx + (v.y - L.y) * sy >= OFF;
}
// while it's on, no star for what a push takes; however it ends, the heat it earned forgotten (the player's own stars
// from before it began are back)
const quiet = m => Object.assign(m.waitUntil(() => false), {
  start: mm => { mm.data.stars0 ??= mm.stars; mm.wanted.cap(0); },
  end: mm => { mm.wanted.clear(); if (mm.data.stars0) mm.wanted.set(mm.data.stars0); },
});
const ruined = v => !v || v.wrecked || !!(v.damage && v.damage.burning);

defActivity('event_stalled_car', {
  title: 'Stalled Car', kind: 'event', levels: 1, start: {},
  brief: ['A stalled car blocking the road: push it to the curb, or jack it.'],
  rewardsFor: (level, m) => ({ cash: m && m.data.jacked ? 0 : 120 }),
  where,
  stages: [
    {
      id: 'stalled',
      // the wagon dead in its lane (smoking, not burning: a retry's is a fresh one), its owner on the sidewalk behind it
      setup(m) {
        const L = stall(m);
        let v = m.one('stalled');
        if (v && (ruined(v) || Math.hypot(v.x - L.x, v.y - L.y) > AWAY)) { m.remove(v); v = null; }
        if (!v) m.spawn.vehicle('retiree', [L.x, L.y], { tag: 'stalled', heading: L.heading, color: '#b8a888', health: .55 });
        const o = ownerSpot(m);   // (facing his car)
        m.ensure.ped('owner', 'retiree', o, { role: 'idle', health: 200, facing: Math.atan2(L.y - o[1], L.x - o[0]) });
        m.data.jacked = false;
        m.failIf(mm => ruined(mm.one('stalled')), 'it\'s scrap now');
        m.failIf(mm => !mm.one('owner'), 'its owner is hurt');
      },
      *run(m) {
        const from = [m.data.lane.x, m.data.lane.y];
        const r = yield m.first([quiet(m), m.parallel([
          m.say(['Darn thing died on me!', 'Can you get it out of the lane? Push it, drive it, anything.'], OWNER),
          m.first([
            m.deliver({ what: 'stalled', to: m.data.marker, radius: PARK_R, stopped: true, text: 'A stalled car: get it out of the lane, to the curb' }),
            m.waitUntil(pushedAside),
          ]),
        ]), m.waitUntil(mm => { const v = mm.one('stalled'); return !!v && mm.vehicle === v && Math.hypot(v.x - from[0], v.y - from[1]) > AWAY; })]);
        if (r.index === 2) { m.data.jacked = true; yield m.say(['Hey! That\'s my car!'], OWNER); return; }
        yield m.say(['That\'s the stuff! Here, for your trouble.', 'I\'ll call a tow.'], OWNER);
      },
    },
  ],
});

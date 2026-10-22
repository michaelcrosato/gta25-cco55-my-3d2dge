// A random event (PLAN.md 9.5): a gang shoot-out in progress. At a junction a little way ahead of the player two rival
// gangs are at it: a crew of the gang the player stands best with (the Chrome Saints, the Harbor Rats or the Lawn
// Gnomes) holding one corner behind a few crates, its rivals' gunmen on the corner across the way. Pitch in: put the
// rivals down, the crew shooting beside you, and the crew's boss tips you (the gang thinks better of you, its rivals
// worse). The crew wiped out: it ends, quietly. While it is on the precinct leaves the gangs to it (no star for the
// shooting; the stars the player had before are back after). The rivals here are no gang members of the city's (a
// stray round rallies none of the city's crews), only dressed as them. The ambient runtime (mission/ambient.js) starts it
// in free roam with its spot in m.data.at; a deep link without one (the bot's test) puts it at the junction of Chapel
// Street and Lantern Lane, the player at the safehouse.
import { defActivity, get } from '../../motor/index.js';

const HOME = [520, 872];   // (a deep link's spot: Chapel Street and Lantern Lane, the safehouse a block off)
const GANGS = ['saints', 'rats', 'gnomes'];
// the crew's corner and the rivals' across the junction, as [square to the player's way in, along it] from the
// junction's middle: the crew off to one side and the rivals to the other, so that from where the player comes a gun
// aimed at a rival never has the crew in line (or in the lock-on's cone). The crew stands in a file along the player's
// way in, square to its line of fire at the rivals; the rivals in a rank square to the player's way in (theirs at the
// player): nobody fires through a mate. COVER: the crates the crew keeps by
const CREW = [[62, -18], [62, 2], [62, 22]], RIVALS = [[-46, 34], [-64, 26], [-82, 34], [-100, 26]], COVER = [[50, -8], [50, 12]];
// the rivals: street muscle holding their corner (they fire from there at a player within three quarters of a pistol's
// reach; short bursts, wide of the mark), a fair fight for a player with the crew beside them
const AIM = { range: .75, burst: .45, pause: 1.2, aimOff: .16 };

/** where it happens: the junction nearest the player (at street level) of those 160-320 u off within 60 degrees of
 *  the way they (or their car) face; else nowhere (null) */
function where(W, P) {
  const C = W.city, T = C.T, v = P.seat && P.seat.vehicle, M = v || P; if ((P.z || 0) > 4 || (v && v.z > 4)) return null;
  const f = v ? v.heading : P.facing, ax = Math.cos(f), ay = Math.sin(f); let best = null, bd = 1e9;
  for (const n of C.intersections) {
    const x = (n.rect[0] + n.rect[2] + 1) / 2 * T, y = (n.rect[1] + n.rect[3] + 1) / 2 * T, dx = x - M.x, dy = y - M.y, d = Math.hypot(dx, dy);
    if (d < 160 || d > 320 || dx * ax + dy * ay < d * .5 || d >= bd) continue;
    bd = d; best = [Math.round(x), Math.round(y)];
  }
  return best;
}
// the spot (a deep link's own when the ambient runtime gave none; the player at the safehouse then, if far)
function spot(m) {
  if (!m.data.at) { m.data.at = HOME; if (m.dist(HOME) > 600) m.place('player', 'safehouse'); }
  return m.data.at;
}
// the sides (the gang the player stands best with, ties to the first of GANGS; its rival across the way) and where each
// stands, square to the player's way in; fixed for the event
function lay(m) {
  if (m.data.crewAt) return;
  const R = (m.save && m.save.respect) || {}, side = GANGS.reduce((b, g) => ((R[g] || 0) > (R[b] || 0) ? g : b), GANGS[0]);
  m.data.side = side; m.data.foe = get('gangs', side).rival;
  const J = spot(m), P = m.mover, d = Math.hypot(J[0] - P.x, J[1] - P.y) || 1, ux = (J[0] - P.x) / d, uy = (J[1] - P.y) / d, T = m.city.T;
  const put = ([a, b]) => {   // (a corner's point, or one a little in or out from it where a body can stand)
    for (const k of [1, .8, 1.2, .6, 1.4]) { const x = J[0] + (-uy * a + ux * b) * k, y = J[1] + (ux * a + uy * b) * k; if (m.city.walkable(Math.floor(x / T), Math.floor(y / T))) return [Math.round(x), Math.round(y)]; }
    return [Math.round(J[0] - uy * a + ux * b), Math.round(J[1] + ux * a + uy * b)];
  };
  m.data.crewAt = CREW.map(put); m.data.rivalsAt = RIVALS.map(put); m.data.coverAt = COVER.map(put);
}
const toward = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
// while it's on, no star for the shooting; however it ends, the heat it earned forgotten (the player's own stars from
// before it began are back)
const quiet = m => Object.assign(m.waitUntil(() => false), {
  start: mm => { mm.data.stars0 ??= mm.stars; mm.wanted.cap(0); },
  end: mm => { mm.wanted.clear(); if (mm.data.stars0) mm.wanted.set(mm.data.stars0); },
});

defActivity('event_gang_shootout', {
  title: 'Gang Shoot-out', kind: 'event', levels: 1, start: {},
  brief: ['A gang shoot-out in progress: help the crew drive its rivals off.'],
  rewardsFor: (level, m) => ({ cash: 200, respect: m && m.data.side ? { [m.data.side]: 3, [m.data.foe]: -2 } : {} }),
  where,
  stages: [
    {
      id: 'shootout',
      // the crew on its corner by its crates (it keeps by them: an ally follows its o.follow), the rivals across the way
      // already at it (alerted: they go for the player, and the crew fires on them); fresh on a retry
      setup(m) {
        lay(m);
        const S = get('gangs', m.data.side), F = get('gangs', m.data.foe), at = m.data.crewAt, rv = m.data.rivalsAt, mid = rv[0];
        m.data.coverAt.forEach(q => m.spawn.prop('crate', q, { tag: 'cover', heading: toward(q, mid) }));
        at.forEach((q, i) => m.spawn.ped(i ? S.peds.grunt : S.peds.enforcer, q, { tag: 'crew', role: 'ally', follow: 'cover', health: 220, armor: 60, weapons: ['fists', 'snub38'], facing: toward(q, mid) }));
        rv.forEach((q, i) => m.spawn.ped(i === 1 ? F.peds.enforcer : F.peds.grunt, q, { tag: 'rivals', role: 'enemy', attack: true, profile: AIM, health: i === 1 ? 110 : 75, weapons: ['fists', 'snub38'], facing: toward(q, at[0]) }));
        m.failIf(mm => !mm.one('crew'), 'the crew\'s all down');
      },
      *run(m) {
        const S = get('gangs', m.data.side), F = get('gangs', m.data.foe), BOSS = { name: S.name, color: S.colors[0] };
        yield m.first([quiet(m), m.parallel([
          m.say([`The ${F.name} jumped us! Give us a hand here!`], BOSS),
          m.kill('rivals', { text: `A gang shoot-out: help the ${S.name} drive off the ${F.name}` }),
        ])]);
        yield m.say(['Ha! That\'ll teach them.', `The ${S.name} don't forget a friend. Here.`], BOSS);
      },
    },
  ],
});

// GS1 · Communion (EXPANSION.md 4, X6): the Chrome Saints' first job in Glass Heights, from their payphone by St.
// Chrome's on Cathedral Hill. Father Fender's own Saint has had its chrome done at Spray & Pray Heights for Sunday's
// Communion, and it goes up the hill to the cathedral today, Brother Lugnut riding shotgun with the Buzzsaw. The Yacht
// Club (the Saints' rivals uptown) have heard: two of their Zephyrs come after it, a gunman at each one's window
// (MOTOR's drive-by for a mission rider). Get it to the cathedral's door above half its health: the chrome takes the
// knocks (armoured, half the damage), Lugnut shoots back. Proves: an escort under drive-bys.
//   Each stage's setup restores what it needs (s1-holy-rollers.js is the template): the Saint at its curb (the same
//   spot every time: kept in m.data), Lugnut in its seat, the Yacht Club's cars fresh for each try at the drive.
import { defMission } from '../../motor/index.js';

const FENDER = { name: 'Father Fender', color: '#5af0ff' }, LUGNUT = { name: 'Brother Lugnut', color: '#c8c8d0' };
const CHROME = '#d8dce4', YACHT = '#f0f0f4';
const SHOP = [336, 952];   // (Loop Avenue's eastbound curb outside Spray & Pray Heights)
const DOOR = [808, 456], DOOR_R = 72;   // (Observatory Lane's north lane at the cathedral's steps: one-way west)
// the Yacht Club's aim from a moving car: wild (long pauses, wide of the mark), at the chrome Saint
const AIM = { range: .6, burst: .5, pause: 2, aimOff: .3 };
const NEXT = [3, 12];   // (s into the drive each Zephyr comes, from behind)
const BEHIND = 200, WEST = 18 * 16;   // (a lane that far behind, on Loop Avenue: east of Bayshore Drive's junction, never on it or the Causeway)

const spot = m => (m.data.shopAt ||= (q => ({ x: Math.round(q.x), y: Math.round(q.y), heading: +q.heading.toFixed(3) }))(m.curb(SHOP, { heading: 0 })));
// a ped into a vehicle's seat (the script's own: it rides there, a shot finds it there)
const seat = (m, v, arch, tag, i, o = {}) => { const p = m.spawn.ped(arch, [v.x, v.y], { tag, ...o }); m.place(p, { in: v, seat: i }); return p; };
// the chrome Saint at its curb (armoured; the chrome: half the damage) and Lugnut riding shotgun
function saint(m) {
  const at = spot(m), v = m.ensure.vehicle('saint', 'saint', at, { heading: at.heading, color: CHROME, mods: { armor: true } });
  if (v.damage.share < .95) v.damage.repair(); v.damage.toughness = .5;
  if (!m.one('lugnut') || m.one('lugnut').dead) { for (const a of m.tagged('lugnut')) m.remove(a); seat(m, v, 'saint-grunt', 'lugnut', 1, { role: 'ally', gang: 'saints', weapons: ['fists', 'buzzsaw'], driveBy: 'yacht', profile: { range: .7, burst: .6, pause: 1.2, aimOff: .16 } }); }
  return v;
}
// a Yacht Club Zephyr come up behind the player on the road, a member at the wheel and one at the window
function zephyr(m, i) {
  const P = m.vehicle || m.player, h = P.heading ?? 0, q = m.lane([Math.max(WEST, P.x - Math.cos(h) * BEHIND), P.y - Math.sin(h) * BEHIND], h);
  const v = m.spawn.vehicle('zephyr', [q.x, q.y], { tag: 'yacht', heading: q.heading, color: YACHT, driver: 'yacht-grunt', drive: { chase: 'player', style: 'race', keep: 120 }, gang: 'yacht' });
  seat(m, v, 'yacht-grunt', 'yachtgun' + i, 1, { role: 'enemy', gang: 'yacht', weapons: ['fists', 'snub38'], driveBy: 'saint', profile: AIM });
  return v;
}

defMission('saints_communion', {
  title: 'Communion', giver: { phone: 'saints', at: 'phone-chrome' }, gang: 'saints', tier: 1, requires: ['heist_blackout'], district: 'glass-heights', plays: 'dex',
  brief: ['Father Fender\'s Saint has had its chrome done for Communion.', 'Drive it up Cathedral Hill to St. Chrome\'s. The Yacht Club know it\'s coming.'],
  rewards: { cash: 3000, respect: { saints: 15, yacht: -10 } },
  bonus: [
    { id: 'time', text: 'Under 3:00', check: m => m.elapsed < 180 },
    { id: 'clean', text: 'The chrome above 80%', check: m => (m.data.health ?? 0) > .8 },
  ],
  stages: [
    { id: 'call', setup() {}, *run(m) {
      yield m.say(['My child. My Saint is at Spray & Pray Heights, chromed for Communion.', 'Bring it up the hill to St. Chrome\'s. Brother Lugnut rides with you.', 'The Yacht Club think chrome is vulgar. They may say so with guns.'], FENDER);
    } },
    {
      id: 'car',
      setup(m) { const v = saint(m); if (m.dist(v) > 700) m.place('player', [v.x - 30, v.y - 40]); },   // (a deep link: on the sidewalk beside it)
      *run(m) { yield m.enter('saint', { text: 'Take Father Fender\'s chrome Saint at Spray & Pray Heights', lost: 'the Saint\'s gone' }); },
    },
    {
      id: 'climb',
      // the Saint at its curb, the player at its wheel (a retry: a fresh one back there), no Yacht Club yet
      setup(m) {
        const at = spot(m), old = m.one('saint');
        if (old && (Math.hypot(old.x - at.x, old.y - at.y) > 80 || old.damage.share < .95)) { m.remove(old); for (const a of m.tagged('lugnut')) m.remove(a); }
        for (const tag of ['yacht', 'yachtgun0', 'yachtgun1']) for (const a of m.tagged(tag)) m.remove(a);
        const v = saint(m); if (m.vehicle !== v) m.place('player', { in: v });
        m.clearTraffic(at, 200);
        m.wanted.clear(); m.wanted.cap(0);   // (the Saints' business and the Yacht Club's: the shooting brings no heat)
        m.ally('saints'); m.truce('velvet');   // (the Syndicate keeps out of it: a hood at a limo's wheel had got out at Lugnut and left it across the avenue)
      },
      *run(m) {
        const comes = m.sequence(NEXT.map((t, i) => m.waitUntil(mm => { if (mm.stageTime < t) return false; zephyr(mm, i); return true; })));
        yield m.parallel([
          comes,
          m.say(['They\'re on us. Drive, I\'ll pray. With this.'], LUGNUT),
          m.deliver({ what: 'saint', to: DOOR, radius: DOOR_R, stopped: true, health: .5, lost: 'the Saint\'s gone', damaged: 'the chrome\'s ruined', text: 'Drive the chrome Saint up Cathedral Hill to St. Chrome\'s (above 50%)' }),
        ]);
        const v = m.one('saint'); m.data.health = v ? v.damage.share : 0;
        for (const z of m.tagged('yacht')) if (!z.wrecked) m.drive(z, { flee: 'player', style: 'race' });   // (at the cathedral's door: they give it up)
        m.wanted.cap(5); m.wanted.clear();
        yield m.say(['Look at it shine. The Lord\'s own bumper.', 'The Yacht Club will remember Communion, my child. So will we.'], FENDER);
      },
    },
  ],
});

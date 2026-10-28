// GY1 · Overboard (EXPANSION.md 4, X6): the Yacht Club's first job, from their payphone outside the Club. Moneybags,
// the Velvet Syndicate's floating casino, has anchored off Marina Heights for the weekend, and the Commodore takes it
// personally. Gus takes the Club's Regatta from its berth along the pier, the Commodore in the other seat with the
// Club's Flare Gun; out along the shore to the party boat (two Velvet hoods aboard with their pistols out of the
// saloon's windows), and held off its stern while the Commodore's flares go in: it burns, goes up and goes under. Then
// the Regatta home to its berth. Proves: boats, combat on water (a drive-by from a boat). Unlocks the Flare Gun at Lead
// Farm (its unlock is this mission's id).
//   Every stage's setup puts the world as it needs it: the Regatta at its berth with the Commodore aboard (or where it
//   was left), Moneybags at anchor with its hoods (fresh for each try at it).
import { defMission } from '../../motor/index.js';

const COMMODORE = { name: 'The Commodore', color: '#7ab0ff' }, T = 16;
const BERTH = { x: 98.5 * T, y: 106.5 * T, heading: Math.PI / 2 };   // (along the Club's pier's west side, bow out to sea)
const ANCHOR = { x: 124.5 * T, y: 88 * T, heading: -Math.PI / 2 };   // (Moneybags, in the open sea off the Heights' east shore, bow north)
const OFF = [124.5 * T, 99 * T];   // (the Regatta's station off its stern: in the Flare Gun's reach, clear of its guns' best)
const PIER = 'club-pier';
const FLARES = { range: .8, burst: .2, pause: 1.6, aimOff: .03 };   // (the Commodore: one flare at a time, well aimed)
const HOODS = { range: .55, burst: .4, pause: 2.2, aimOff: .28 };   // (the hoods: wild, from a rocking saloon)

const seat = (m, v, arch, tag, i, o = {}) => { const p = m.spawn.ped(arch, [v.x, v.y], { tag, ...o }); m.place(p, { in: v, seat: i }); return p; };
// the Regatta: the job's own, the Club's moored one (adopted), or a fresh one at its berth; the Commodore aboard
function regatta(m) {
  let v = m.one('regatta'); if (v && v.wrecked) { m.remove(v); v = null; }
  if (!v) { const w = m.fleet.vehicles.find(q => q.def.id === 'regatta' && !q.wrecked && !q.driver && q.owner !== 'mission' && Math.hypot(q.x - BERTH.x, q.y - BERTH.y) < 120); v = w ? m.adopt(w, 'regatta') : m.spawn.vehicle('regatta', [BERTH.x, BERTH.y], { tag: 'regatta', heading: BERTH.heading }); }
  const c = m.one('commodore');
  if (!c || c.dead || !c.seat || c.seat.vehicle !== v) { for (const a of m.tagged('commodore')) m.remove(a); seat(m, v, 'yacht-enforcer', 'commodore', 1, { role: 'ally', gang: 'yacht', name: 'The Commodore', weapons: ['fists', 'flaregun'], ammo: { flaregun: 60 }, driveBy: 'moneybags', profile: FLARES, health: 200 }); }
  return v;
}
// Moneybags at anchor, its two hoods in the saloon (fresh for each try)
function moneybags(m) {
  for (const tag of ['moneybags', 'hood0', 'hood1']) for (const a of m.tagged(tag)) m.remove(a);
  const v = m.spawn.vehicle('moneybags', [ANCHOR.x, ANCHOR.y], { tag: 'moneybags', heading: ANCHOR.heading, gang: 'velvet' });
  for (let i = 0; i < 2; i++) seat(m, v, 'velvet-grunt', 'hood' + i, i, { role: 'enemy', gang: 'velvet', weapons: ['fists', 'snub38'], driveBy: 'player', profile: HOODS });
  return v;
}
// the Yacht Club's business offshore: no heat while it lasts, and none after
const quiet = m => Object.assign(m.waitUntil(() => false), { start: mm => { mm.wanted.clear(); mm.wanted.cap(0); }, end: mm => { mm.wanted.cap(5); mm.wanted.clear(); } });

defMission('yacht_overboard', {
  title: 'Overboard', giver: { phone: 'yacht' }, gang: 'yacht', tier: 1, requires: ['heist_blackout'], district: 'glass-heights', plays: 'gus',
  brief: ['The Velvet Syndicate\'s party boat is anchored off the marina.', 'Take the Regatta out with the Commodore and his Flare Gun. Send it to the bottom.'],
  rewards: { cash: 4500, respect: { yacht: 15, velvet: -10 } },
  bonus: [
    { id: 'time', text: 'Under 3:00', check: m => m.elapsed < 180 },
    { id: 'clean', text: 'The Regatta above 75%', check: m => (m.data.health ?? 0) > .75 },
  ],
  stages: [
    { id: 'call', setup() {}, *run(m) {
      yield m.say(['The Velvet Syndicate have parked a floating casino off MY marina.', 'Bring the Regatta round. I\'ll bring the fireworks.'], COMMODORE);
    } },
    {
      id: 'regatta',
      setup(m) { const v = regatta(m); if (m.dist(v) > 700) m.place('player', PIER); },
      *run(m) { yield m.enter('regatta', { text: 'Board the Club\'s Regatta at its berth along the pier', lost: 'the Regatta\'s gone' }); },
    },
    {
      id: 'sink',
      // the Regatta (at its berth on a deep link or a retry from far off), Gus at its wheel, Moneybags at anchor
      setup(m) {
        let v = m.one('regatta'); if (v && (v.damage.share < .6 || Math.hypot(v.x - OFF[0], v.y - OFF[1]) > 1400)) m.remove(v);
        v = regatta(m); if (m.vehicle !== v) m.place('player', { in: v });
        moneybags(m);
      },
      *run(m) {
        m.failIf(mm => { const c = mm.one('commodore'); return !c || c.dead; }, 'the Commodore is overboard');
        const boat = m.one('moneybags'), off = OFF;
        yield m.first([quiet(m), m.sequence([
          m.say(['There she is. Get me in close astern and hold her steady.'], COMMODORE),
          Object.assign(m.waitUntil(mm => { const b = mm.one('moneybags'); return !b || b.wrecked || b.sinking > 0 || b.sunk; }),
            { start: mm => { mm.objective('Hold the Regatta off Moneybags\' stern while the Commodore\'s flares go in', { hint: { kind: 'goto', at: off, radius: 70, vehicle: 'regatta', stay: true } }); if (boat) mm.marker(boat, { color: '#ff5a4a' }); }, nav: () => off }),
          m.say(['Ha! Abandon ship, you velvet vermin!'], COMMODORE),
        ])]);
      },
    },
    {
      id: 'home',
      setup(m) { const v = regatta(m); if (m.vehicle !== v) m.place('player', { in: v }); },
      *run(m) {
        m.failIf(mm => { const c = mm.one('commodore'); return !c || c.dead; }, 'the Commodore is overboard');
        yield m.reach([BERTH.x, BERTH.y], { vehicle: 'regatta', radius: 80, stopped: true, text: 'The Regatta home to its berth at the Club\'s pier' });
        const v = m.one('regatta'); m.data.health = v ? v.damage.share : 0;
        yield m.say(['Splendid. Lead Farm will sell you one of our Flare Guns now. Do give it a good home.'], COMMODORE);
      },
    },
  ],
});

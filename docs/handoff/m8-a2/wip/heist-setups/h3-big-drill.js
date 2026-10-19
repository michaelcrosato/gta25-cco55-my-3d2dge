// H3 · Setup: The Big Drill (PLAN.md 9.4): Viv's third setup for the bank job, from her booth at the Greasy Spoke.
// Played as Gus. The vault sits on two feet of steel, so the job needs the Drill Rig parked outside the Construction
// Site: no keys and no engine in it, so Gus backs his Hookline onto it, hooks it, and tows it across the canal to Crush
// Hour, the Brickyard's scrap yard, where it goes under the scrap. The rig carries the builders' tracker, so from the
// moment it is on the hook the MPD follow it at two stars all the way (a floor: they never lose it), and a truck with a
// rig on its hook is slow. At Crush Hour the tracker comes off, the stars go, and the yard keeps the rig for the job
// (stashed as 'drill': in the save's garage). Proves: towing, a heavy vehicle, the wanted level.
//   Each stage's setup restores what it needs (s1-holy-rollers.js is the template): the Hookline beside Gus, the rig at the
//   site's curb, and for the tow the rig on the hook with Gus at the wheel (a retry starts the tow again from the site).
import { defMission } from '../../motor/index.js';

const VIV = { name: 'Viv', color: '#3ad0c8' }, GUS = { name: 'Gus', color: '#ff9a2a' }, YARDMAN = { name: 'Crush Hour', color: '#c8a050' };
// the rig at Gnome Row's east curb along the Construction Site's fence, its nose north and turned a little out toward
// the lane (as a truck about to pull out): clear of the lane for the traffic going by, and with room ahead of it for the
// Hookline to pull up in the lane and back straight onto its nose
const RIG_AT = [133, 1496], RIG_H = -Math.PI / 2 - .1;
const YARD = [632, 2376];   // (Crush Hour's yard, south of Wharf Street: between the lamps at its gate, west of the crusher)
const RIG = { color: '#24503a' }, HOOKLINE_HL = 40;   // (the Hookline's half length: its centre ahead of the rig's nose)

/** the rig at the site (or where it is now), and Gus's Hookline (beside him, or where he left it) */
const rig = m => m.ensure.vehicle('rig', 'drillrig', RIG_AT, { ...RIG, heading: RIG_H });
const truck = m => m.ensure.vehicle('hookline', 'hookline', m.curb(m.player));
const hooked = m => { const r = m.one('rig'), t = m.one('hookline'); return !!(r && t && r.towedBy === t); };
// Gnome Row by the site kept clear for the tow: the cars parked along it (the city's, nobody in them) moved off, so the
// Hookline gets by the rig and lines up ahead of it
function clearCurb(m) {
  for (const v of [...m.fleet.vehicles]) {
    if (v.owner !== 'world' || v.stashed || v.seats.some(Boolean) || v.cls === 'rail' || v.cls === 'heli') continue;
    if (v.x > 104 && v.x < 160 && v.y > RIG_AT[1] - 200 && v.y < RIG_AT[1] + 110) m.fleet.remove(v);
  }
}
// the tow's objective: a deliver hint naming the truck (the bot backs the Hookline onto the rig and hooks it, then
// drives it there)
const towHint = () => ({ kind: 'deliver', what: 'rig', to: YARD, tow: 'hookline' });
// the rig has no engine: whoever climbs into its cab climbs down again, told to tow it
const noDriving = text => m => {
  const r = m.one('rig');
  if (r && m.vehicle === r) { m.place('player', r.toWorld(14, r.hw + 12)); m.objective(text, { hint: towHint() }); }   // (down on the sidewalk side)
  return false;
};

defMission('heist_big_drill', {
  title: 'Setup: The Big Drill', giver: { at: 'greasy-spoke' }, tier: 3, requires: ['heist_blueprints'], plays: 'gus',
  brief: ['The vault sits on two feet of steel. The job needs a drill.', 'Tow the Drill Rig from the Construction Site to Crush Hour.'],
  rewards: { cash: 2000 },
  bonus: [{ id: 'time', text: 'Under 6:00', check: m => m.elapsed < 360 }, { id: 'clean', text: 'The rig above 75%', check: m => (m.data.rig ?? 0) > .75 }],
  stages: [
    { id: 'call', setup(m) { m.as('gus'); },
      *run(m) {
        yield m.say(['Gus. The vault sits on two feet of steel.', 'There\'s a Drill Rig outside the Construction Site. No keys, no engine.', 'Tow it to Crush Hour. It has a tracker: the cops follow it all the way.'], VIV);
      } },
    { id: 'truck',
      setup(m) { m.as('gus'); truck(m); },
      *run(m) {
        yield m.enter('hookline', { text: 'Get in your Hookline', lost: 'the Hookline is wrecked' });
      } },
    { id: 'hook',
      setup(m) {
        m.as('gus');
        clearCurb(m);
        const r = rig(m), t = truck(m);
        if (r.damage.share < .5) r.damage.repair();
        if (m.vehicle !== t && m.dist(t) > 200) m.place('player', { in: t });   // (a deep link: at the wheel)
        m.failIf(mm => !mm.one('rig'), 'the Drill Rig is wrecked');
        m.failIf(mm => !mm.one('hookline'), 'the Hookline is wrecked');
      },
      *run(m) {
        const text = 'Back the Hookline onto the Drill Rig on Gnome Row and hook it (fire)';
        const hook = m.waitUntil(mm => hooked(mm) || noDriving(text)(mm));
        yield { ...hook, start: mm => { mm.objective(text, { hint: towHint() }); const r = mm.one('rig'); if (r) mm.marker(r, { color: '#7ac8ff' }); }, nav: mm => mm.one('rig') };
        yield m.say(['Easy, old girl.', 'You weigh more than my opinions.'], GUS);
      } },
    { id: 'tow',
      setup(m) {
        m.as('gus');
        let r = rig(m), t = truck(m);
        if (!(r.towedBy === t && m.vehicle === t)) {   // (a deep link or a retry: the tow again from the site, the rig on the hook)
          clearCurb(m);
          m.remove(r); r = rig(m);   // (the rig made again at the site, off any hook)
          const at = r.toWorld(r.hl + HOOKLINE_HL + 8, 0);
          m.remove(t); t = m.spawn.vehicle('hookline', at, { tag: 'hookline', heading: RIG_H });   // (the Hookline made again ahead of it, its hook at the rig's nose)
          m.fleet.tow(t, r);
          m.place('player', { in: t });
        }
        m.wanted.set(2); m.wanted.floor(2); m.allowWanted();   // (the tracker: two stars, and the police never lose it)
        m.failIf(mm => !mm.one('hookline'), 'the Hookline is wrecked');   // (the rig lost: the delivery's own fail)
      },
      *run(m) {
        const text = 'Tow the rig to Crush Hour (the cops track it: they follow all the way)';
        const go = m.deliver({ what: 'rig', to: YARD, radius: 130, stopped: true, lost: 'the Drill Rig is wrecked', text });
        yield m.first([{ ...go, start: mm => { go.start(mm); mm.objective(text, { hint: towHint() }); }, nav: mm => (hooked(mm) ? m.at(YARD) : mm.one('rig')) }, m.waitUntil(noDriving(text))]);
        const r = m.one('rig'), at = [Math.round(r.x), Math.round(r.y), +r.heading.toFixed(3)], share = r.damage.share;
        m.data.rig = share;
        m.wanted.clear();
        yield m.say(['Tracker\'s off. Under the scrap she goes.', 'Nobody looks for a drill in a crusher.'], YARDMAN);
        // the yard unhooks it (off the hook, the rig made again where it stands) and keeps it for the job
        m.remove(r);
        m.stash(m.spawn.vehicle('drillrig', at, { ...RIG, heading: at[2], health: share, tag: 'kept' }), 'drill', at);
        yield m.say(['Plans, wheels, a drill. Now we need a bank.'], VIV);
      } },
  ],
});
